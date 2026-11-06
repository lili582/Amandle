import type { Artist } from '../artist'
import { debutFromReleaseGroups, genderOfMembers, membersFromRelations } from '../sources'
import { isComplete, missingFields } from '../game'
import { normalizeHe } from '../artist'

// Build-time gap filling (Node, scripts/build-pool.ts and scripts/fill-pool.ts).
// Wikidata leaves holes: no career start, a band with no listed members, a
// group whose members' genders aren't recorded, a singer with no birth date.
// For every artist with a hole we ask MusicBrainz (and Deezer for release
// dates), the same sources the game already trusts at run time. Whatever is
// still missing afterwards keeps the artist out of the pool.

const MB = 'https://musicbrainz.org/ws/2'
const DEEZER = 'https://api.deezer.com'
const MB_SPACING_MS = 1100 // MusicBrainz: ~1 request/second per client
const MIN_YEAR = 1900

export interface FillOptions {
  fetchImpl?: typeof fetch
  // MusicBrainz rejects anonymous Node clients: "AppName/1.0 (contact)".
  userAgent?: string
  thisYear?: number
  sleep?: (ms: number) => Promise<void>
  log?: (msg: string) => void
}

interface MbLifeSpan {
  begin?: string | null
}

interface MbArtist {
  id: string
  name: string
  score?: number
  type?: string | null
  gender?: string | null
  country?: string | null
  'life-span'?: MbLifeSpan
  aliases?: { name: string }[]
  relations?: { type: string; direction: string; ended?: boolean; artist: { id: string; name: string } }[]
}

interface DzAlbum {
  release_date?: string
  record_type?: string
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function yearOf(s: string | null | undefined): number | undefined {
  const m = s ? /^(\d{4})/.exec(s) : null
  return m ? Number(m[1]) : undefined
}

export function createFiller(opts: FillOptions = {}) {
  const {
    fetchImpl = fetch,
    userAgent = 'AmandleBot/1.0 (https://github.com/lili582/amandle)',
    thisYear = new Date().getFullYear(),
    sleep = realSleep,
    log = () => {},
  } = opts
  let mbLast = 0

  async function getJson<T>(url: string, spaced: boolean): Promise<T | null> {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (spaced) {
        const wait = mbLast + MB_SPACING_MS - Date.now()
        if (wait > 0) await sleep(wait)
        mbLast = Date.now()
      }
      try {
        const res = await fetchImpl(url, { headers: { Accept: 'application/json', 'User-Agent': userAgent } })
        if (res.status === 404) return null
        if (res.status === 503 || res.status === 429 || res.status >= 500) {
          await sleep(2000 * (attempt + 1))
          continue
        }
        if (!res.ok) return null
        return (await res.json()) as T
      } catch {
        await sleep(1000 * (attempt + 1))
      }
    }
    return null
  }

  const mb = <T>(path: string) => getJson<T>(`${MB}${path}${path.includes('?') ? '&' : '?'}fmt=json`, true)
  const dz = <T>(path: string) => getJson<T>(`${DEEZER}${path}`, false)

  const names = (a: Artist) =>
    [...new Set([a.nameHe, a.wikiTitle, a.nameEn, ...a.aliases].filter((x): x is string => Boolean(x)))]

  function sameName(a: Artist, candidate: string, aliases: string[] = []): boolean {
    const wanted = new Set(names(a).map(normalizeHe))
    return [candidate, ...aliases].some((n) => wanted.has(normalizeHe(n)))
  }

  async function mbArtist(a: Artist): Promise<MbArtist | null> {
    let mbid = a.ids.musicbrainz
    if (!mbid) {
      const terms = names(a)
        .map((n) => n.replace(/"/g, ''))
        .flatMap((n) => [`artist:"${n}"`, `alias:"${n}"`])
        .join(' OR ')
      const r = await mb<{ artists?: MbArtist[] }>(`/artist?query=${encodeURIComponent(`(${terms}) AND country:IL`)}&limit=5`)
      const hit = r?.artists?.find(
        (x) => (x.score ?? 0) >= 90 && sameName(a, x.name, (x.aliases ?? []).map((al) => al.name)),
      )
      if (!hit) return null
      mbid = hit.id
      a.ids.musicbrainz = mbid
    }
    return mb<MbArtist>(`/artist/${mbid}?inc=artist-rels`)
  }

  async function deezerFirstRelease(a: Artist): Promise<number | undefined> {
    let id = a.ids.deezer
    if (!id) {
      for (const n of names(a)) {
        const r = await dz<{ data?: { id: number; name: string }[] }>(`/search/artist?q=${encodeURIComponent(n)}&limit=5`)
        id = r?.data?.find((d) => sameName(a, d.name))?.id
        if (id) break
      }
      if (!id) return undefined
      a.ids.deezer = id
    }
    const r = await dz<{ data?: DzAlbum[] }>(`/artist/${id}/albums?limit=200`)
    const years = (r?.data ?? [])
      .filter((x) => x.record_type !== 'compile')
      .map((x) => yearOf(x.release_date))
      .filter((y): y is number => y != null && y > MIN_YEAR)
    return years.length ? Math.min(...years) : undefined
  }

  const plausibleBirth = (y: number | undefined): y is number => y != null && y > MIN_YEAR && y <= thisYear - 5
  const plausibleStart = (a: Artist, y: number | undefined): y is number =>
    y != null && y > MIN_YEAR && y <= thisYear && (!a.birthYear || y >= a.birthYear + 5)

  // Fills a copy of `a`. Never throws.
  async function fill(input: Artist): Promise<Artist> {
    const a: Artist = { ...input, ids: { ...input.ids }, aliases: [...input.aliases] }
    const missing = () => missingFields({ ...a, popularityRank: 1 }, thisYear)
    if (missing().length === 0) return a
    try {
      const art = await mbArtist(a)
      if (art) {
        const begin = yearOf(art['life-span']?.begin)
        if (a.type === 'solo') {
          if (!a.birthYear && art.type === 'Person' && plausibleBirth(begin)) a.birthYear = begin
        } else {
          if (!a.foundedYear && plausibleStart(a, begin)) a.foundedYear = begin
          const lineup = membersFromRelations(art.relations ?? [])
          if (a.type === 'band' && a.members < 2 && lineup.length >= 2) {
            a.members = lineup.length
            if (lineup.length === 2) a.type = 'duo'
          }
          if (!a.genderKnown && lineup.length > 0) {
            const ids = lineup.slice(0, 25).map((m) => `arid:${m.id}`).join(' OR ')
            const r = await mb<{ artists?: MbArtist[] }>(`/artist?query=${encodeURIComponent(ids)}&limit=25`)
            const g = genderOfMembers((r?.artists ?? []).map((x) => x.gender))
            if (g) {
              a.gender = g
              a.genderKnown = true
            }
          }
        }
        if (!(a.debutYear > 0)) {
          const rg = await mb<{ 'release-groups'?: Parameters<typeof debutFromReleaseGroups>[0] }>(
            `/release-group?artist=${art.id}&limit=100`,
          )
          const y = debutFromReleaseGroups(rg?.['release-groups'] ?? [])
          if (plausibleStart(a, y)) a.debutYear = y
        }
      }
      if (!(a.debutYear > 0)) {
        const y = await deezerFirstRelease(a)
        if (plausibleStart(a, y)) a.debutYear = y
      }
      // A group's career starts when it forms; and it can't form after its
      // first release. Each stands in for the other when only one is known.
      if (a.type !== 'solo') {
        if (!(a.debutYear > 0) && a.foundedYear) a.debutYear = a.foundedYear
        if (!a.foundedYear && a.debutYear > 0) a.foundedYear = a.debutYear
      }
    } catch (err) {
      log(`fill ${a.nameHe}: ${err instanceof Error ? err.message : String(err)}`)
    }
    return a
  }

  return { fill }
}

export interface FillReport {
  complete: Artist[]
  dropped: { artist: Artist; missing: string[] }[]
  filled: number
}

// Fills the holes in `ordered` (most popular first) and keeps complete
// artists, in order, until `want` are collected. Artists past that point are
// never looked up, so a pool of 1000 costs ~1000 lookups at most.
export async function fillUntil(ordered: Artist[], want: number, opts: FillOptions = {}): Promise<FillReport> {
  const { fill } = createFiller(opts)
  const log = opts.log ?? (() => {})
  const complete: Artist[] = []
  const dropped: FillReport['dropped'] = []
  let filled = 0
  let looked = 0
  for (const a of ordered) {
    if (complete.length >= want) break
    if (isComplete(a, opts.thisYear)) {
      complete.push(a)
      continue
    }
    const b = await fill(a)
    const after = missingFields({ ...b, popularityRank: 1 }, opts.thisYear)
    if (after.length === 0) {
      complete.push(b)
      filled++
    } else {
      dropped.push({ artist: b, missing: after })
    }
    if (++looked % 25 === 0) log(`Fill: ${looked} looked up, ${filled} completed, ${dropped.length} dropped`)
  }
  return { complete, dropped, filled }
}

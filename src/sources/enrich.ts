import type { Artist, Gender, TopTrack } from '../artist'
import { jsonp } from './jsonp'
import { normalizeHe, DEEZER_IDS } from '../artist'
import { idbRead, idbWrite } from '../storage'

// On-demand enrichment of a single artist from two live APIs:
//   * Deezer (JSONP, no key): picture, the artist's most played tracks, and
//     the top track's 30s preview.
//   * MusicBrainz (CORS, no key): the breakthrough year (original release year
//     of the earliest of those most played tracks), band lineup + genders.
// Only the artists that are actually guessed (plus the day's answer) are
// enriched, so a game costs a handful of requests instead of hundreds.

const MB = 'https://musicbrainz.org/ws/2'
const DEEZER = 'https://api.deezer.com'
const MB_SPACING_MS = 1100 // MusicBrainz allows ~1 request/second
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
// v3: drops cached Deezer results from stray profiles (wrong photo / songs, e.g. סטטיק).
const CACHE_PREFIX = 'enrich:v3:'
const TOP_TRACKS = 20

export interface Enrichment {
  debutYear?: number
  breakthroughYear?: number
  topTitles?: string[]
  members?: number
  gender?: Gender
  imageUrl?: string
  topTrack?: TopTrack
  deezerId?: number
  musicbrainz?: string
}

// ---- MusicBrainz request queue --------------------------------------------

let mbChain: Promise<unknown> = Promise.resolve()
let mbLast = 0
// Browsers can't set User-Agent; Node callers (the nightly pool build) must,
// or MusicBrainz rejects them.
let mbUserAgent: string | undefined
export function setMusicBrainzUserAgent(ua: string | undefined): void {
  mbUserAgent = ua
}

function mbGet<T>(path: string, fetchImpl: typeof fetch = fetch): Promise<T> {
  const run = async () => {
    const wait = mbLast + MB_SPACING_MS - Date.now()
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    mbLast = Date.now()
    const res = await fetchImpl(`${MB}${path}${path.includes('?') ? '&' : '?'}fmt=json`, {
      headers: mbUserAgent ? { Accept: 'application/json', 'User-Agent': mbUserAgent } : { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`MusicBrainz HTTP ${res.status}`)
    return (await res.json()) as T
  }
  const p = mbChain.then(run, run)
  mbChain = p.catch(() => undefined)
  return p
}

interface MbArtist {
  id: string
  name: string
  score?: number
  gender?: string | null
  country?: string
}

interface MbReleaseGroup {
  'first-release-date'?: string
  'primary-type'?: string | null
  'secondary-types'?: string[]
}

interface MbRelation {
  type: string
  direction: string
  ended?: boolean
  artist: { id: string; name: string }
}

function year(s: string | undefined): number | undefined {
  const m = s ? /^(\d{4})/.exec(s) : null
  return m ? Number(m[1]) : undefined
}

async function resolveMbid(a: Artist, fetchImpl?: typeof fetch): Promise<string | undefined> {
  if (a.ids.musicbrainz) return a.ids.musicbrainz
  // MusicBrainz usually stores Israeli artists under their Hebrew name, with
  // the English one as an alias, so try both as name or alias.
  const names = [a.nameHe, a.nameEn].filter((x): x is string => Boolean(x)).map((x) => x.replace(/"/g, ''))
  const terms = names.flatMap((n) => [`artist:"${n}"`, `alias:"${n}"`]).join(' OR ')
  const q = encodeURIComponent(`(${terms}) AND country:IL`)
  const r = await mbGet<{ artists?: MbArtist[] }>(`/artist?query=${q}&limit=3`, fetchImpl)
  const hit = r.artists?.find((x) => (x.score ?? 0) >= 90)
  return hit?.id
}

// Spotle: "the year the artist's debut album released. If they have no
// albums, first mixtape or EP." Compilations and live albums don't count.
export function debutFromReleaseGroups(groups: MbReleaseGroup[]): number | undefined {
  const studio = groups.filter((g) => (g['secondary-types'] ?? []).length === 0)
  const pick = (types: string[]) =>
    studio
      .filter((g) => types.includes(g['primary-type'] ?? ''))
      .map((g) => year(g['first-release-date']))
      .filter((y): y is number => y != null && y > 1900)
  const albums = pick(['Album'])
  if (albums.length) return Math.min(...albums)
  const eps = pick(['EP', 'Single'])
  return eps.length ? Math.min(...eps) : undefined
}

// The members of a band: current members if any are marked, else everyone
// who was ever in it (the best-known lineup is usually the original one).
export function membersFromRelations(rels: MbRelation[]): { id: string; ended: boolean }[] {
  const byId = new Map<string, boolean>()
  for (const r of rels) {
    if (r.type !== 'member of band' || r.direction !== 'backward') continue
    const ended = Boolean(r.ended)
    byId.set(r.artist.id, (byId.get(r.artist.id) ?? true) && ended)
  }
  const all = [...byId].map(([id, ended]) => ({ id, ended }))
  const current = all.filter((m) => !m.ended)
  return current.length >= 2 ? current : all
}

export function genderOfMembers(genders: (string | null | undefined)[]): Gender | undefined {
  const g = new Set(
    genders
      .map((x) => (x ?? '').toLowerCase())
      .map((x) => (x === 'male' ? 'male' : x === 'female' ? 'female' : null))
      .filter(Boolean),
  )
  if (g.size === 2) return 'mixed'
  if (g.size === 1) return [...g][0] as Gender
  return undefined
}

interface MbRecording {
  title: string
  'first-release-date'?: string
  'artist-credit'?: { artist?: { id: string } }[]
}

// Strip "(Live)", "- Remastered 2011" and the like so a Deezer title matches
// the MusicBrainz recording.
export function baseTitle(t: string): string {
  return normalizeHe(t.replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, ''))
}

// Breakthrough = the year the artist's first big song came out: the earliest
// original release year among their most played tracks (Deezer's top list),
// looked up on MusicBrainz so reissues and compilations don't count.
export function breakthroughFromRecordings(
  titles: string[],
  recs: MbRecording[],
  mbid?: string,
): number | undefined {
  const wanted = new Set(titles.map(baseTitle).filter(Boolean))
  const years = recs
    .filter((r) => !mbid || (r['artist-credit'] ?? []).some((c) => c.artist?.id === mbid))
    .filter((r) => wanted.has(baseTitle(r.title)))
    .map((r) => year(r['first-release-date']))
    .filter((y): y is number => y != null && y > 1940)
  return years.length ? Math.min(...years) : undefined
}

async function fromMusicBrainz(a: Artist, topTitles: string[], fetchImpl?: typeof fetch): Promise<Enrichment> {
  const out: Enrichment = {}
  const mbid = await resolveMbid(a, fetchImpl)
  if (!mbid) return out
  out.musicbrainz = mbid

  if (topTitles.length) {
    const unique = [...new Set(topTitles.map((t) => t.replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, '').replace(/"/g, '').trim()))].filter(Boolean)
    const titles = unique.map((t) => `recording:"${t}"`).join(' OR ')
    const r = await mbGet<{ recordings?: MbRecording[] }>(
      `/recording?query=${encodeURIComponent(`arid:${mbid} AND (${titles})`)}&limit=100`,
      fetchImpl,
    )
    out.breakthroughYear = breakthroughFromRecordings(topTitles, r.recordings ?? [], mbid)
  }
  if (!out.breakthroughYear) {
    // Fallback: the first album / EP.
    const rg = await mbGet<{ 'release-groups'?: MbReleaseGroup[] }>(
      `/release-group?artist=${mbid}&limit=100`,
      fetchImpl,
    )
    out.debutYear = debutFromReleaseGroups(rg['release-groups'] ?? [])
  }

  const needsLineup = a.type === 'band' && a.members === 0
  const needsGender = a.type !== 'solo' && !a.genderKnown
  if (needsLineup || needsGender) {
    const art = await mbGet<{ relations?: MbRelation[] }>(`/artist/${mbid}?inc=artist-rels`, fetchImpl)
    const members = membersFromRelations(art.relations ?? [])
    if (needsLineup && members.length >= 2) out.members = members.length
    if (needsGender && members.length > 0) {
      const ids = members.slice(0, 25).map((m) => `arid:${m.id}`).join(' OR ')
      const r = await mbGet<{ artists?: MbArtist[] }>(
        `/artist?query=${encodeURIComponent(ids)}&limit=25`,
        fetchImpl,
      )
      out.gender = genderOfMembers((r.artists ?? []).map((x) => x.gender))
    }
  }
  return out
}

// ---- Deezer ----------------------------------------------------------------

interface DzArtist {
  id: number
  name: string
  picture_medium?: string
  nb_fan?: number
}

interface DzTrack {
  title: string
  preview?: string
  link?: string
}

// How a Deezer URL is fetched: JSONP in the browser (no CORS), plain fetch in Node.
export type DeezerGet = <T>(url: string) => Promise<T>

async function fromDeezer(a: Artist, dzGet: DeezerGet = jsonp): Promise<Enrichment> {
  let artist: DzArtist | undefined
  // A hand-checked Deezer id beats one baked into the pool (or found by name).
  const deezerId = DEEZER_IDS[a.ids.wikidata] ?? a.ids.deezer
  if (deezerId) {
    artist = await dzGet<DzArtist>(`${DEEZER}/artist/${deezerId}`)
  } else {
    // Search every name and keep the exact match with the most fans: an
    // empty duplicate profile with the same name (and someone else's photo)
    // must not win just because its search came back first.
    const names = [a.nameHe, a.nameEn, ...(a.aliases ?? [])].filter((x): x is string => Boolean(x))
    const wanted = new Set(names.map(normalizeHe))
    for (const name of [a.nameHe, a.nameEn].filter((x): x is string => Boolean(x))) {
      const r = await dzGet<{ data?: DzArtist[] }>(
        `${DEEZER}/search/artist?q=${encodeURIComponent(name)}&limit=10`,
      )
      for (const d of r.data ?? []) {
        if (!wanted.has(normalizeHe(d.name))) continue
        if (!artist || (d.nb_fan ?? 0) > (artist.nb_fan ?? 0)) artist = d
      }
    }
  }
  if (!artist?.id) return {}
  const out: Enrichment = { deezerId: artist.id, imageUrl: artist.picture_medium }
  const top = await dzGet<{ data?: DzTrack[] }>(`${DEEZER}/artist/${artist.id}/top?limit=${TOP_TRACKS}`)
  const t = top.data?.[0]
  if (t) out.topTrack = { title: t.title, preview: t.preview || undefined, link: t.link }
  out.topTitles = (top.data ?? []).map((x) => x.title).filter(Boolean)
  return out
}

// ---- public API ------------------------------------------------------------

export function applyEnrichment(a: Artist, e: Enrichment, thisYear = new Date().getFullYear()): void {
  const plausible = (y: number | undefined): y is number =>
    y != null && y > 0 && y <= thisYear && (!a.birthYear || y >= a.birthYear + 5)
  if (plausible(e.debutYear)) a.debutYear = e.debutYear
  // A first hit can't predate the career start Wikidata records.
  if (plausible(e.breakthroughYear)) a.breakthroughYear = Math.max(e.breakthroughYear, a.debutYear)
  if (e.members && a.type === 'band' && a.members === 0) a.members = e.members
  if (e.gender && a.type !== 'solo' && !a.genderKnown) {
    a.gender = e.gender
    a.genderKnown = true
  }
  // The pool's picture comes from the artist's Spotify profile (the same one
  // the listeners are read from); Deezer's name match can be a stray profile
  // with someone else's photo, so it is only a fallback.
  if (e.imageUrl && !a.imageUrl) a.imageUrl = e.imageUrl
  if (e.topTrack) a.topTrack = e.topTrack
  if (e.deezerId) a.ids.deezer = DEEZER_IDS[a.ids.wikidata] ?? e.deezerId
  if (e.musicbrainz) a.ids.musicbrainz = e.musicbrainz
  a.enriched = true
}

const inflight = new Map<string, Promise<void>>()

export interface EnrichOptions {
  fetchImpl?: typeof fetch
  dzGet?: DeezerGet
  now?: number
}

// Fetch (but don't apply) an artist's Deezer + MusicBrainz details. Shared by
// the in-browser enrichment and the nightly pool build. Never throws.
export async function fetchEnrichment(
  a: Artist,
  opts: Pick<EnrichOptions, 'fetchImpl' | 'dzGet'> = {},
): Promise<{ e: Enrichment; complete: boolean }> {
  // Deezer first: its top tracks are what MusicBrainz looks up.
  const [dz] = await Promise.allSettled([fromDeezer(a, opts.dzGet)])
  const titles = dz.status === 'fulfilled' ? (dz.value.topTitles ?? []) : []
  const [mb] = await Promise.allSettled([fromMusicBrainz(a, titles, opts.fetchImpl)])
  const e: Enrichment = {
    ...(dz.status === 'fulfilled' ? dz.value : {}),
    ...(mb.status === 'fulfilled' ? mb.value : {}),
  }
  return { e, complete: mb.status === 'fulfilled' && dz.status === 'fulfilled' }
}

// The tile fields of an enrichment (years, band lineup, group gender) with the
// same sanity rules as applyEnrichment, but no picture / preview. Used by the
// pool build, which bakes them into pool.json.
export function applyDetails(a: Artist, e: Enrichment, thisYear = new Date().getFullYear()): void {
  applyEnrichment(
    a,
    { debutYear: e.debutYear, breakthroughYear: e.breakthroughYear, members: e.members, gender: e.gender },
    thisYear,
  )
  delete a.enriched
}

// Enrich in place. Never throws: a failing API simply leaves the Wikidata
// values in place.
export function enrichArtist(a: Artist, opts: EnrichOptions = {}): Promise<void> {
  if (a.enriched) return Promise.resolve()
  const key = a.ids.wikidata
  const existing = inflight.get(key)
  if (existing) return existing

  const p = (async () => {
    const now = opts.now ?? Date.now()
    const cached = await idbRead<Enrichment>(CACHE_PREFIX + key)
    if (cached && now - cached.ts < CACHE_TTL_MS) {
      applyEnrichment(a, cached.data)
      return
    }
    const { e, complete } = await fetchEnrichment(a, opts)
    applyEnrichment(a, e)
    // Only cache a complete result, so a transient failure is retried later.
    if (complete) await idbWrite(CACHE_PREFIX + key, now, e)
  })()
    .catch(() => {
      a.enriched = true
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

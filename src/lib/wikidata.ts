import type { Artist, ArtistType, Gender, Genre } from '../types'
import { ANSWER_POOL_SIZE } from '../config'
import { normalizeHe } from './normalizeHe'
import { GENRE_RULES } from './genreRules'
import { GENRE_OVERRIDES } from './genreOverrides'

// The artist roster comes live from the Wikidata Query Service (CORS-enabled,
// no key). One aggregated SPARQL query returns one row per artist with
// everything the tiles need; nothing is read from committed JSON.

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql'
const MAX_ATTEMPTS = 3
// Notability floor: referenced from at least three wiki projects.
const MIN_SITELINKS = 3

const PERSON_KIND_RE = /^human$/i
const GROUP_KIND_RE = /group$|band$|duo$|trio$|quartet$|quintet$|ensemble$|orchestra$|choir$/i

// Most specific first: an artist tagged both "pop music" and "Mizrahi music"
// shows Mizrahi, which is what an Israeli player would call them. Rock
// outranks indie: an artist tagged both (Aviv Geffen, Mashina) reads as rock.
const GENRE_PRIORITY: Genre[] = [
  'mizrahi',
  'religious-pop',
  'hiphop',
  'electronic',
  'mediterranean',
  'jazz-soul',
  'classical',
  'ethnic-world',
  'rock',
  'indie-alt',
  'folk-israeli',
  'pop',
]

const SEX_LABELS: Record<string, Gender> = {
  male: 'male',
  man: 'male',
  'trans man': 'male',
  'transgender man': 'male',
  female: 'female',
  woman: 'female',
  'trans woman': 'female',
  'transgender woman': 'female',
}

interface Binding {
  value: string
}

export interface SparqlRow {
  item?: Binding
  heTitle?: Binding
  kinds?: Binding
  genres?: Binding
  sex?: Binding
  en?: Binding
  birth?: Binding
  death?: Binding
  inception?: Binding
  workStart?: Binding
  sitelinks?: Binding
  deezer?: Binding
  mbid?: Binding
  members?: Binding
  memberSexes?: Binding
  occupations?: Binding
  langs?: Binding
  spotify?: Binding
}

export interface PoolQueryOptions {
  // Notability floor (wiki projects referencing the item). Default MIN_SITELINKS.
  minSitelinks?: number
  // Nightly build: only artists with a Spotify id (P1902). Genres become
  // optional there, because buildArtists(..., lenient) infers one from P106.
  requireSpotify?: boolean
  // Fetch exactly these items (no country / sitelink filter).
  qids?: string[]
}

// One row per artist with everything the tiles need. The default (no options)
// is the live in-browser fallback: Israeli artists with a Hebrew Wikipedia
// article, a mapped music genre and at least MIN_SITELINKS sitelinks.
export function poolQuery(opts: PoolQueryOptions = {}): string {
  const { minSitelinks = MIN_SITELINKS, requireSpotify = false, qids } = opts
  const lenient = requireSpotify || Boolean(qids)
  const scope = qids
    ? `VALUES ?item { ${qids.map((q) => `wd:${q}`).join(' ')} }`
    : `{ { ?item wdt:P27 wd:Q801 } UNION { ?item wdt:P19/wdt:P17 wd:Q801 }
    UNION { ?item wdt:P495 wd:Q801 } UNION { ?item wdt:P740/wdt:P17 wd:Q801 } }
  FILTER(?sl >= ${minSitelinks})`
  const genre = lenient
    ? 'OPTIONAL { ?item wdt:P136 ?genre . ?genre rdfs:label ?genreLabel . FILTER(LANG(?genreLabel) = "en") }'
    : '?item wdt:P136 ?genre . ?genre rdfs:label ?genreLabel . FILTER(LANG(?genreLabel) = "en")'
  const spotify = requireSpotify ? '?item wdt:P1902 ?sp .' : 'OPTIONAL { ?item wdt:P1902 ?sp }'
  return `
SELECT ?item ?heTitle (SAMPLE(?sl) AS ?sitelinks) (SAMPLE(?dz) AS ?deezer) (SAMPLE(?mb) AS ?mbid)
  (GROUP_CONCAT(DISTINCT ?kindLabel; separator="|") AS ?kinds)
  (GROUP_CONCAT(DISTINCT ?genreLabel; separator="|") AS ?genres)
  (GROUP_CONCAT(DISTINCT ?occLabel; separator="|") AS ?occupations)
  (GROUP_CONCAT(DISTINCT ?langCode; separator="|") AS ?langs)
  (GROUP_CONCAT(DISTINCT ?sp; separator="|") AS ?spotify)
  (SAMPLE(?sexLabel) AS ?sex) (SAMPLE(?enl) AS ?en)
  (MIN(?dob) AS ?birth) (MIN(?dod) AS ?death) (MIN(?inc) AS ?inception) (MIN(?ws) AS ?workStart)
  (COUNT(DISTINCT ?member) AS ?members)
  (GROUP_CONCAT(DISTINCT ?memberSex; separator="|") AS ?memberSexes)
WHERE {
  ?article schema:isPartOf <https://he.wikipedia.org/> ; schema:name ?heTitle ; schema:about ?item .
  ?item wikibase:sitelinks ?sl .
  ${scope}
  ${genre}
  ${spotify}
  ?item wdt:P31 ?kind . ?kind rdfs:label ?kindLabel . FILTER(LANG(?kindLabel) = "en")
  OPTIONAL { ?item wdt:P106 ?occ . ?occ rdfs:label ?occLabel . FILTER(LANG(?occLabel) = "en") }
  OPTIONAL { { ?item wdt:P1412 ?lang } UNION { ?item wdt:P407 ?lang } ?lang wdt:P218 ?langCode }
  OPTIONAL { ?item wdt:P2722 ?dz }
  OPTIONAL { ?item wdt:P434 ?mb }
  OPTIONAL { ?item wdt:P21 ?sexI . ?sexI rdfs:label ?sexLabel . FILTER(LANG(?sexLabel) = "en") }
  OPTIONAL { ?item rdfs:label ?enl . FILTER(LANG(?enl) = "en") }
  OPTIONAL { ?item wdt:P569 ?dob }
  OPTIONAL { ?item wdt:P570 ?dod }
  OPTIONAL { ?item wdt:P571 ?inc }
  OPTIONAL { ?item wdt:P2031 ?ws }
  OPTIONAL { ?item wdt:P527 ?member . ?member wdt:P31 wd:Q5 .
             OPTIONAL { ?member wdt:P21 ?ms . ?ms rdfs:label ?memberSex . FILTER(LANG(?memberSex) = "en") } }
}
GROUP BY ?item ?heTitle`
}

export const POOL_QUERY = poolQuery()

export interface FetchPoolOptions {
  fetchImpl?: typeof fetch
  signal?: AbortSignal
  // Browsers own the User-Agent header; Node callers must pass one (WDQS
  // answers 403 to clients it cannot identify).
  headers?: Record<string, string>
}

async function sparql(query: string, opts: FetchPoolOptions): Promise<SparqlRow[]> {
  const { fetchImpl = fetch, signal, headers: extraHeaders } = opts
  const url = `${SPARQL_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetchImpl(url, {
        headers: { Accept: 'application/sparql-results+json', ...extraHeaders },
        signal,
      })
      if (!res.ok) throw new Error(`Wikidata SPARQL HTTP ${res.status}`)
      const json = (await res.json()) as { results: { bindings: SparqlRow[] } }
      return json.results.bindings
    } catch (err) {
      if (signal?.aborted) throw err
      lastError = err
      if (attempt < MAX_ATTEMPTS - 1) await new Promise((r) => setTimeout(r, 600 * 2 ** attempt))
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Wikidata SPARQL failed')
}

// ---- genre mapping ---------------------------------------------------------

const normalizedRuleKeys = Object.keys(GENRE_RULES).map((k) => [normalizeHe(k), k] as const)

function lookupRule(key: string): Genre | undefined {
  if (!key) return undefined
  const hit = normalizedRuleKeys.find(([n]) => n === key)
  return hit ? GENRE_RULES[hit[1]] : undefined
}

// Wikidata's P136 labels are noun phrases ("pop music", "music of Israel").
// Try the label verbatim, then without the generic "music" suffix, then on
// its first two words.
export function mapGenreLabel(label: string): Genre | undefined {
  const key = label.trim().toLowerCase()
  if (GENRE_RULES[key]) return GENRE_RULES[key]
  const collapsed = normalizeHe(key)
  const direct = lookupRule(collapsed)
  if (direct) return direct
  const trimmed = collapsed.replace(/\s+music$/, '').trim()
  if (trimmed !== collapsed) {
    const t = lookupRule(trimmed)
    if (t) return t
  }
  const head = trimmed.split(' ').slice(0, 2).join(' ')
  return head !== trimmed ? lookupRule(head) : undefined
}

function rankGenres(genres: Genre[]): Genre[] {
  return [...new Set(genres)].sort((a, b) => GENRE_PRIORITY.indexOf(a) - GENRE_PRIORITY.indexOf(b))
}

// ---- normalisation helpers ------------------------------------------------

function qidOf(uri: string | undefined): string | undefined {
  return uri ? uri.slice(uri.lastIndexOf('/') + 1) : undefined
}

export function yearOf(value: string | undefined): number | undefined {
  if (!value) return undefined
  const m = /^(-?\d{4})/.exec(value)
  if (!m) return undefined
  const y = Number(m[1])
  return y > 0 ? y : undefined
}

function split(b: Binding | undefined): string[] {
  return b?.value ? b.value.split('|').map((s) => s.trim()).filter(Boolean) : []
}

// "טיפקס (להקה)" -> "טיפקס". The bracket only disambiguates the article.
export function displayName(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*$/, '').trim() || title
}

// A group's formation year: the earlier of inception (P571) and work-period
// start (P2031).
function foundedYear(row: SparqlRow, thisYear: number): number | undefined {
  const ys = [yearOf(row.inception?.value), yearOf(row.workStart?.value)].filter(
    (y): y is number => y != null && y <= thisYear,
  )
  return ys.length ? Math.min(...ys) : undefined
}

// Group gender from the genders of its members (P527 → P21), else from the
// kind label ("girl group"). Unknown is resolved later from MusicBrainz.
export function groupGender(memberSexes: string[], kinds: string[]): Gender | undefined {
  const g = new Set(memberSexes.map((s) => SEX_LABELS[s.toLowerCase()]).filter(Boolean))
  if (g.size === 2) return 'mixed'
  if (g.size === 1) return [...g][0]
  if (kinds.some((k) => /girl group|female/i.test(k))) return 'female'
  if (kinds.some((k) => /boy band|male duo|male/i.test(k))) return 'male'
  return undefined
}

// A genre from occupations (P106), for artists Wikidata gives no genre.
// Most specific first: "rapper|singer" is hip hop.
const OCCUPATION_GENRES: [RegExp, Genre][] = [
  [/rapper|hip hop/i, 'hiphop'],
  [/disc jockey|\bdj\b|electronic/i, 'electronic'],
  [/hazzan|cantor|paytan|piyyut|hasidic/i, 'religious-pop'],
  [/jazz/i, 'jazz-soul'],
  [/opera|conductor|classical/i, 'classical'],
  [/singer|songwriter|musician|vocalist|composer|guitarist|pianist|recording artist|lyricist/i, 'pop'],
]

export function inferGenre(occupations: string[]): Genre | undefined {
  for (const [re, genre] of OCCUPATION_GENRES) if (occupations.some((o) => re.test(o))) return genre
  return undefined
}

// ---- public API ------------------------------------------------------------

// `lenient` (nightly Spotify build): an artist with no mappable P136 genre
// keeps a genre inferred from its occupations (P106) instead of being dropped.
// `genreHints` (nightly build): qid -> a genre read from the artist's Hebrew
// Wikipedia categories, used before the occupation guess.
export function buildArtists(
  rows: SparqlRow[],
  thisYear = new Date().getFullYear(),
  lenient = false,
  genreHints?: Map<string, Genre>,
): Artist[] {
  const built: Artist[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const qid = qidOf(row.item?.value)
    const title = row.heTitle?.value
    if (!qid || !title || seen.has(qid)) continue
    seen.add(qid)

    const kinds = split(row.kinds)
    const isHuman = kinds.some((k) => PERSON_KIND_RE.test(k))
    const isGroup = !isHuman && kinds.some((k) => GROUP_KIND_RE.test(k))
    // Films, TV series, books etc. also carry a music genre; skip them.
    if (!isHuman && !isGroup) continue

    let genres = rankGenres(
      split(row.genres)
        .map(mapGenreLabel)
        .filter((g): g is Genre => Boolean(g)),
    )
    if (genres.length === 0 && lenient) {
      const inferred = genreHints?.get(qid) ?? inferGenre(split(row.occupations))
      if (inferred) genres = [inferred]
    }
    // A hand-checked genre (genreOverrides.ts) beats Wikidata's.
    const curated = GENRE_OVERRIDES[qid]
    if (curated) genres = [curated, ...genres.filter((g) => g !== curated)]
    if (genres.length === 0) continue

    const birthYear = isHuman ? yearOf(row.birth?.value) : undefined
    let debutYear = yearOf(row.workStart?.value) ?? yearOf(row.inception?.value) ?? 0
    if (debutYear > thisYear || (birthYear && debutYear && debutYear < birthYear + 5)) debutYear = 0

    const type: ArtistType = isHuman
      ? 'solo'
      : kinds.some((k) => /duo$/i.test(k))
        ? 'duo'
        : 'band'
    const wdMembers = Number(row.members?.value ?? 0)
    const members = type === 'solo' ? 1 : type === 'duo' ? 2 : wdMembers >= 3 ? wdMembers : 0

    let gender: Gender | undefined
    if (isHuman) {
      gender = SEX_LABELS[(row.sex?.value ?? '').toLowerCase()]
    } else {
      gender = groupGender(split(row.memberSexes), kinds)
    }

    const enRaw = row.en?.value
    const nameEn = enRaw && /[a-z]/i.test(enRaw) ? enRaw : undefined
    const nameHe = displayName(title)
    const aliases = [...new Set([nameHe, title, nameEn].filter((x): x is string => Boolean(x)))]

    const deezer = Number(row.deezer?.value)

    built.push({
      // The QID is the id: stable across label edits, so saved boards and the
      // daily schedule survive renames on Wikidata.
      id: qid,
      nameHe,
      wikiTitle: title,
      nameEn,
      aliases,
      debutYear,
      breakthroughYear: 0,
      birthYear,
      diedYear: isHuman ? yearOf(row.death?.value) : undefined,
      foundedYear: isHuman ? undefined : foundedYear(row, thisYear),
      type,
      members,
      gender: gender ?? (isHuman ? 'male' : 'mixed'),
      genderKnown: Boolean(gender) || isHuman,
      primaryGenre: genres[0],
      secondaryGenres: genres.slice(1, 3),
      popularityRank: 0,
      answerEligible: false,
      ids: {
        wikidata: qid,
        musicbrainz: row.mbid?.value,
        deezer: Number.isFinite(deezer) && deezer > 0 ? deezer : undefined,
      },
      metrics: { wikidataSitelinks: Number(row.sitelinks?.value ?? 0), hewikiViews60d: 0 },
    })
  }

  if (built.length === 0) throw new Error('no playable artists resolved from Wikidata')

  // Daily answers come from the best-known artists, ranked by sitelinks (QID
  // tie-break). Sitelinks change slowly, so every player derives the same set.
  const bySitelinks = [...built].sort(
    (x, y) =>
      y.metrics.wikidataSitelinks - x.metrics.wikidataSitelinks ||
      x.ids.wikidata.localeCompare(y.ids.wikidata),
  )
  bySitelinks.forEach((a, i) => {
    a.answerEligible = i < ANSWER_POOL_SIZE
    a.popularityRank = i + 1 // provisional; replaced by page-view rank
  })
  return bySitelinks
}

export async function fetchArtistPool(opts: FetchPoolOptions = {}): Promise<Artist[]> {
  return buildArtists(await sparql(POOL_QUERY, opts))
}

export interface FetchPoolRowsOptions extends FetchPoolOptions, PoolQueryOptions {}

// Raw rows for the nightly build (scripts/build-pool.ts).
export function fetchPoolRows(opts: FetchPoolRowsOptions = {}): Promise<SparqlRow[]> {
  return sparql(poolQuery(opts), opts)
}

const SPOTIFY_ID_RE = /^[0-9A-Za-z]{22}$/

// qid -> every valid Spotify artist id Wikidata lists for it.
export function spotifyIdsByQid(rows: SparqlRow[]): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const row of rows) {
    const qid = qidOf(row.item?.value)
    if (!qid) continue
    const ids = split(row.spotify).filter((id) => SPOTIFY_ID_RE.test(id))
    if (ids.length === 0) continue
    out.set(qid, [...new Set([...(out.get(qid) ?? []), ...ids])])
  }
  return out
}

// Artists whose listed languages (P1412 / P407) are known and exclude Hebrew.
// No language listed = keep.
export function nonHebrewQids(rows: SparqlRow[]): Set<string> {
  const out = new Set<string>()
  for (const row of rows) {
    const qid = qidOf(row.item?.value)
    const langs = split(row.langs).map((l) => l.toLowerCase())
    if (qid && langs.length > 0 && !langs.includes('he')) out.add(qid)
  }
  return out
}

const SINGING_RE = /singer|vocalist|rapper|hazzan|cantor|paytan/i

// "Hebrew singers only" (the nightly build): Hebrew must be listed among the
// item's languages (P1412 / P407), and a solo artist needs a singing
// occupation (singer, singer-songwriter, vocalist, rapper, cantor). That
// leaves out English-only acts, artists with no language on Wikidata, and
// instrumentalists / DJs. Groups only need the language.
export function hebrewSingerQids(rows: SparqlRow[]): Set<string> {
  const out = new Set<string>()
  for (const row of rows) {
    const qid = qidOf(row.item?.value)
    if (!qid || !split(row.langs).map((l) => l.toLowerCase()).includes('he')) continue
    const isHuman = split(row.kinds).some((k) => PERSON_KIND_RE.test(k))
    if (isHuman && !split(row.occupations).some((o) => SINGING_RE.test(o))) continue
    out.add(qid)
  }
  return out
}

// An Israeli musician with a Hebrew article but no Spotify id on Wikidata.
export interface SearchCandidate {
  qid: string
  title: string
  en?: string
  sitelinks: number
}

// A Spotify search result is the artist only on an exact (normalised) name match.
export function matchesCandidate(name: string, c: SearchCandidate): boolean {
  const n = normalizeHe(name)
  if (!n) return false
  return [c.title, displayName(c.title), c.en]
    .filter((x): x is string => Boolean(x))
    .some((x) => normalizeHe(x) === n)
}

const MISSING_SPOTIFY_QUERY = `
SELECT ?item ?heTitle (SAMPLE(?enl) AS ?en) (SAMPLE(?sl) AS ?sitelinks) WHERE {
  ?article schema:isPartOf <https://he.wikipedia.org/> ; schema:name ?heTitle ; schema:about ?item .
  { ?item wdt:P27 wd:Q801 } UNION { ?item wdt:P495 wd:Q801 } UNION { ?item wdt:P740/wdt:P17 wd:Q801 }
  { ?item wdt:P106 ?occ . ?occ wdt:P279* wd:Q639669 } UNION { ?item wdt:P31/wdt:P279* wd:Q215380 } UNION { ?item wdt:P31 wd:Q9212979 }
  FILTER NOT EXISTS { ?item wdt:P1902 ?anySpotify }
  ?item wikibase:sitelinks ?sl .
  OPTIONAL { ?item rdfs:label ?enl . FILTER(LANG(?enl) = "en") }
}
GROUP BY ?item ?heTitle`

export async function fetchMissingSpotifyCandidates(opts: FetchPoolOptions = {}): Promise<SearchCandidate[]> {
  const rows = (await sparql(MISSING_SPOTIFY_QUERY, opts)) as (SparqlRow & { en?: Binding })[]
  const seen = new Set<string>()
  const out: SearchCandidate[] = []
  for (const row of rows) {
    const qid = qidOf(row.item?.value)
    const title = row.heTitle?.value
    if (!qid || !title || seen.has(qid)) continue
    seen.add(qid)
    out.push({ qid, title, en: row.en?.value || undefined, sitelinks: Number(row.sitelinks?.value ?? 0) })
  }
  return out.sort((a, b) => b.sitelinks - a.sitelinks || a.qid.localeCompare(b.qid))
}

import type { Genre } from '../artist'

// Candidate discovery from Hebrew Wikipedia categories (nightly build only).
//
// Wikidata alone misses well-known Israeli acts because their items are
// sparse: איפה הילד? has no country, no language and no Spotify id; טיפקס has
// no language; יוני בלוך has no Spotify id. Hebrew Wikipedia's own categories
// are maintained by Israeli editors and say exactly what the game wants:
// "זמרים השרים בעברית" / "זמרות השרות בעברית" (Hebrew singers) and the
// Israeli band categories. Every page found here becomes a candidate (by its
// Wikidata QID) whatever Wikidata says about country or language.

const API = 'https://he.wikipedia.org/w/api.php'
const CAT = 'קטגוריה:'
const MAX_DEPTH = 3
const TITLES_PER_REQUEST = 50

export const SINGER_ROOTS = ['זמרים השרים בעברית', 'זמרות השרות בעברית']
export const GROUP_ROOTS = [
  'להקות ישראליות',
  'להקות ישראליות לפי סגנון',
  'צמדים מוזיקליים ישראלים',
  'שלישיות מוזיקליות ישראליות',
]

// Subcategories worth descending into. Anything else under these roots is a
// per-artist category ("קטגוריה:אריק איינשטיין" holds his songs and albums),
// which must not be crawled.
const FOLLOW_SINGER = /^(זמרים|זמרות|זמרי |זמרות |זוכי כוכב נולד|מתחרי כוכב נולד|מתחרות כוכב נולד)/
const FOLLOW_GROUP = /^(להקות|הרכבי|הרכבים|צמדים|צמדי|שלישיות)/
// Not acts a player would guess: band members, army/dance/youth troupes, choirs.
const SKIP = /^חברי|צבאיות|מחול|ריקודי|נוער|בידור|מקהלות|קאמרי/

// Category name -> genre, most specific first (same order as wikidata.ts
// GENRE_PRIORITY). Used only when Wikidata gives the artist no usable genre.
const CATEGORY_GENRES: [RegExp, Genre][] = [
  [/מזרחית/, 'mizrahi'],
  [/חסידי|מוזיקה יהודית|זמר דתי|חזנים|פייטנים/, 'religious-pop'],
  [/היפ הופ|ראפ|ראפרים/, 'hiphop'],
  [/אלקטרונית|תקלטנים|טראנס/, 'electronic'],
  [/ים תיכונית/, 'mediterranean'],
  [/ג'אז|סול|בלוז|R&B/, 'jazz-soul'],
  [/אתני|רגאיי|מוזיקת עולם/, 'ethnic-world'],
  [/רוק אלטרנטיבי|אינדי/, 'indie-alt'],
  [/רוק|מטאל|פאנק|גל חדש|קצב/, 'rock'],
  [/פולק|זמר עברי|שירי ארץ ישראל/, 'folk-israeli'],
  [/פופ|ווקאלי/, 'pop'],
]

// Only categories that describe the music itself ("זמרי רוק ישראלים",
// "להקות פופ ישראליות"). Others mislead: "אישים ממוצא יהודי-מרוקאי" contains
// "רוק", "משתתפי פסטיבל הזמר החסידי" contains "חסידי".
const GENRE_CATEGORY = /^(זמרי |זמרות |להקות |הרכבי |הרכבים |צמדי |מוזיקאי |ראפרים|תקלטנים|חזנים|פייטנים)/

export function genreFromCategories(categories: string[]): Genre | undefined {
  const musical = categories.filter((c) => GENRE_CATEGORY.test(c))
  for (const [re, genre] of CATEGORY_GENRES) if (musical.some((c) => re.test(c))) return genre
  return undefined
}

export type CandidateKind = 'singer' | 'group'

export interface CategoryCandidate {
  qid: string
  title: string
  kind: CandidateKind
  genreHint?: Genre
}

export interface CategoryOptions {
  fetchImpl?: typeof fetch
  userAgent?: string
  log?: (m: string) => void
}

type ApiJson = {
  continue?: Record<string, string>
  query?: {
    categorymembers?: { ns: number; title: string }[]
    pages?: {
      title: string
      missing?: boolean
      pageprops?: { wikibase_item?: string }
      categories?: { title: string }[]
    }[]
  }
}

async function api(params: Record<string, string>, opts: CategoryOptions): Promise<ApiJson> {
  const { fetchImpl = fetch, userAgent } = opts
  const qs = new URLSearchParams({ format: 'json', formatversion: '2', ...params })
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetchImpl(`${API}?${qs}`, { headers: userAgent ? { 'User-Agent': userAgent } : {} })
      if (res.ok) return (await res.json()) as ApiJson
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
  }
  throw new Error(`Hebrew Wikipedia API failed: ${params.list ?? params.prop}`)
}

// Article titles (ns 0) under the roots, following matching subcategories.
export async function crawlCategories(
  roots: string[],
  follow: RegExp,
  opts: CategoryOptions = {},
): Promise<Set<string>> {
  const pages = new Set<string>()
  const seen = new Set<string>()
  let frontier = roots.map((r) => ({ name: r, depth: 0 }))
  while (frontier.length) {
    const next: typeof frontier = []
    for (const { name, depth } of frontier) {
      if (seen.has(name)) continue
      seen.add(name)
      let cont: Record<string, string> | undefined = {}
      while (cont) {
        const json = await api(
          { action: 'query', list: 'categorymembers', cmtitle: CAT + name, cmtype: 'page|subcat', cmlimit: 'max', ...cont },
          opts,
        )
        for (const m of json.query?.categorymembers ?? []) {
          if (m.ns === 0) pages.add(m.title)
          else if (m.ns === 14 && depth < MAX_DEPTH) {
            const sub = m.title.slice(CAT.length)
            if (follow.test(sub) && !SKIP.test(sub)) next.push({ name: sub, depth: depth + 1 })
          }
        }
        cont = json.continue
      }
    }
    frontier = next
  }
  return pages
}

// title -> { qid, categories }
async function pageInfo(titles: string[], opts: CategoryOptions) {
  const out = new Map<string, { qid?: string; categories: string[] }>()
  for (let i = 0; i < titles.length; i += TITLES_PER_REQUEST) {
    const batch = titles.slice(i, i + TITLES_PER_REQUEST)
    let cont: Record<string, string> | undefined = {}
    while (cont) {
      const json = await api(
        {
          action: 'query',
          prop: 'pageprops|categories',
          ppprop: 'wikibase_item',
          clshow: '!hidden',
          cllimit: 'max',
          titles: batch.join('|'),
          ...cont,
        },
        opts,
      )
      for (const p of json.query?.pages ?? []) {
        if (p.missing) continue
        const cur = out.get(p.title) ?? { categories: [] }
        if (p.pageprops?.wikibase_item) cur.qid = p.pageprops.wikibase_item
        cur.categories.push(...(p.categories ?? []).map((c) => c.title.slice(CAT.length)))
        out.set(p.title, cur)
      }
      cont = json.continue
    }
  }
  return out
}

// Every Hebrew singer and Israeli band on Hebrew Wikipedia, keyed by QID.
export async function fetchCategoryCandidates(opts: CategoryOptions = {}): Promise<Map<string, CategoryCandidate>> {
  const log = opts.log ?? (() => {})
  const singers = await crawlCategories(SINGER_ROOTS, FOLLOW_SINGER, opts)
  const groups = await crawlCategories(GROUP_ROOTS, FOLLOW_GROUP, opts)
  for (const t of singers) groups.delete(t)
  log(`Hebrew Wikipedia: ${singers.size} Hebrew singers, ${groups.size} Israeli groups in categories`)

  const info = await pageInfo([...singers, ...groups], opts)
  const out = new Map<string, CategoryCandidate>()
  for (const [title, { qid, categories }] of info) {
    if (!qid) continue
    out.set(qid, {
      qid,
      title,
      kind: singers.has(title) ? 'singer' : 'group',
      genreHint: genreFromCategories(categories),
    })
  }
  return out
}

import type { Artist } from '../types'
import { compareByPopularity } from './rank'

// Popularity = Hebrew Wikipedia page views over the last 60 days, read live
// from the MediaWiki API (prop=pageviews, 50 titles per request, CORS via
// origin=*). It plays the role of Spotle's "monthly listeners" ranking, with
// an Israeli audience.

const API = 'https://he.wikipedia.org/w/api.php'
const BATCH = 50
const CONCURRENCY = 3
const MAX_CONTINUES = 30

interface PvPage {
  title: string
  pageviews?: Record<string, number | null>
}

interface PvResponse {
  continue?: Record<string, string>
  query?: {
    pages?: PvPage[]
    normalized?: { from: string; to: string }[]
    redirects?: { from: string; to: string }[]
  }
}

export interface PageviewOptions {
  fetchImpl?: typeof fetch
  signal?: AbortSignal
  onProgress?: (done: number, total: number) => void
}

async function fetchBatch(titles: string[], opts: PageviewOptions): Promise<Map<string, number>> {
  const { fetchImpl = fetch, signal } = opts
  const totals = new Map<string, number>()
  const alias = new Map<string, string>() // api title -> our title
  let cont: Record<string, string> | undefined = {}
  for (let i = 0; cont && i < MAX_CONTINUES; i++) {
    const params = new URLSearchParams({
      action: 'query',
      prop: 'pageviews',
      pvipdays: '60',
      redirects: '1',
      format: 'json',
      formatversion: '2',
      origin: '*',
      titles: titles.join('|'),
      ...cont,
    })
    const res = await fetchImpl(`${API}?${params}`, { signal })
    if (!res.ok) throw new Error(`Wikipedia pageviews HTTP ${res.status}`)
    const json = (await res.json()) as PvResponse
    for (const n of [...(json.query?.normalized ?? []), ...(json.query?.redirects ?? [])]) {
      alias.set(n.to, alias.get(n.from) ?? n.from)
    }
    for (const p of json.query?.pages ?? []) {
      if (!p.pageviews) continue
      const sum = Object.values(p.pageviews).reduce<number>((a, b) => a + (b ?? 0), 0)
      totals.set(alias.get(p.title) ?? p.title, sum)
    }
    cont = json.continue
  }
  return totals
}

// Fills metrics.hewikiViews60d and re-ranks popularityRank (1 = most viewed).
export async function applyPageviewRanks(artists: Artist[], opts: PageviewOptions = {}): Promise<void> {
  const titles = artists.map((a) => a.wikiTitle)
  const batches: string[][] = []
  for (let i = 0; i < titles.length; i += BATCH) batches.push(titles.slice(i, i + BATCH))

  const views = new Map<string, number>()
  let done = 0
  let next = 0
  async function worker() {
    while (next < batches.length) {
      const b = batches[next++]
      const res = await fetchBatch(b, opts)
      res.forEach((v, k) => views.set(k, v))
      done++
      opts.onProgress?.(done, batches.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker))

  for (const a of artists) a.metrics.hewikiViews60d = views.get(a.wikiTitle) ?? 0
  const ranked = [...artists].sort(compareByPopularity((a) => a.metrics.hewikiViews60d))
  ranked.forEach((a, i) => {
    a.popularityRank = i + 1
  })
}

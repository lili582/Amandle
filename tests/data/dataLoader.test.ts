import { describe, it, expect, beforeEach, vi } from 'vitest'
import { validateGameData, isDataFresh, loadGameData, _resetDataLoaderCache } from '../../src/data/dataLoader'
import { DATA_CACHE_TTL_MS, MIN_LISTENERS_IL } from '../../src/config'
import type { Artist } from '../../src/artist/types'
import { makeArtist } from '../fixtures'

// IndexedDB does not exist in jsdom, so the persistence layer is stubbed and the
// cache/stale-cache behaviour is driven explicitly.
const idb = {
  read: vi.fn<() => Promise<null>>(),
  write: vi.fn<() => Promise<void>>(),
}
vi.mock('../../src/storage/idb', () => ({
  idbRead: () => idb.read(),
  idbWrite: () => idb.write(),
}))

const artistA: Artist = makeArtist({ id: 'omer-adam', nameHe: 'עומר אדם', debutYear: 2009, birthYear: 1993, popularityRank: 1 })
const artistB: Artist = { ...artistA, id: 'rita', nameHe: 'ריטה', popularityRank: 2 }

const goodJson = {
  artists: [artistA, artistB],
}

const ENTITY = 'http://www.wikidata.org/entity/'

// A SPARQL result set shaped like the real pool query's output: one row per
// (artist, genre).
function sparqlOk(rows: Array<Record<string, string>>) {
  return {
    ok: true,
    json: async () => ({
      results: {
        bindings: rows.map((r) =>
          Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { value: v }])),
        ),
      },
    }),
  } as Response
}

const POOL_ROWS = [
  { item: `${ENTITY}Q1`, heTitle: 'סקאזי', kinds: 'human', genres: 'electronic music', sex: 'male', en: 'Skazi', workStart: '1998-01-01T00:00:00Z', birth: '1975-01-01T00:00:00Z', sitelinks: '40' },
  { item: `${ENTITY}Q2`, heTitle: 'הבדקה', kinds: 'rock band', genres: 'rock music', en: 'HaBadka', inception: '1991-01-01T00:00:00Z', sitelinks: '30', members: '4', memberSexes: 'male' },
  { item: `${ENTITY}Q3`, heTitle: 'סרט', kinds: 'film', genres: 'pop music', sitelinks: '99' },
]

// Wikipedia page views: HaBadka is viewed more, so it ranks #1.
function pageviewsOk() {
  return {
    ok: true,
    json: async () => ({ query: { pages: [{ title: 'סקאזי', pageviews: { d: 10 } }, { title: 'הבדקה', pageviews: { d: 99 } }] } }),
  } as Response
}

const route = (url: string) =>
  Promise.resolve(url.includes('w/api.php') ? pageviewsOk() : sparqlOk(POOL_ROWS))

const wikidata = (impl: typeof fetch = route as unknown as typeof fetch) => impl

beforeEach(() => {
  idb.read.mockReset().mockResolvedValue(null)
  idb.write.mockReset().mockResolvedValue(undefined)
  _resetDataLoaderCache()
})

describe('validateGameData', () => {
  it('accepts a well-formed dataset', () => {
    const result = validateGameData(goodJson)
    expect(result).not.toBeNull()
    expect(result?.artists).toHaveLength(2)
    expect(result).toEqual({ artists: goodJson.artists })
  })

  it('rejects non-objects and empty/missing arrays', () => {
    expect(validateGameData(null)).toBeNull()
    expect(validateGameData('x')).toBeNull()
    expect(validateGameData({})).toBeNull()
    expect(validateGameData({ artists: [] })).toBeNull()
    expect(validateGameData({ ...goodJson, artists: [] })).toBeNull()
  })

  it('rejects artists missing required fields', () => {
    expect(validateGameData({ ...goodJson, artists: [{ id: 'x' }] })).toBeNull()
    expect(
      validateGameData({ ...goodJson, artists: [{ ...artistA, nameHe: '' }] }),
    ).toBeNull()
    expect(
      validateGameData({ ...goodJson, artists: [{ ...artistA, debutYear: '2005' }] }),
    ).toBeNull()
    expect(
      validateGameData({ ...goodJson, artists: [{ ...artistA, primaryGenre: 7 }] }),
    ).toBeNull()
  })

  it('rejects a duplicated artist id', () => {
    expect(validateGameData({ artists: [artistA, { ...artistA, popularityRank: 2 }] })).toBeNull()
  })

  it('drops a schedule left in an old cached copy', () => {
    expect(validateGameData({ ...goodJson, schedule: ['rita'] })).not.toHaveProperty('schedule')
  })
})

describe('isDataFresh', () => {
  const now = 1_700_000_000_000
  it('is fresh on the same Israeli day', () => {
    const noonIL = Date.parse('2026-10-14T09:00:00Z')
    expect(isDataFresh(noonIL, noonIL)).toBe(true)
    expect(isDataFresh(noonIL - 3 * 3_600_000, noonIL)).toBe(true)
  })
  it('expires at Israeli midnight', () => {
    // 20:30 UTC = 23:30 IL on the 13th; 21:30 UTC = 00:30 IL on the 14th.
    expect(isDataFresh(Date.parse('2026-10-13T20:30:00Z'), Date.parse('2026-10-13T21:30:00Z'))).toBe(false)
  })
  it('is stale at/after the TTL window', () => {
    expect(isDataFresh(now - DATA_CACHE_TTL_MS, now)).toBe(false)
    expect(isDataFresh(now - 3 * DATA_CACHE_TTL_MS, now)).toBe(false)
    expect(isDataFresh(Number.NaN, now)).toBe(false)
  })
})

describe('loadGameData', () => {
  it('builds the dataset from the Wikidata response', async () => {
    const result = await loadGameData({ fetchImpl: wikidata() })
    expect(result.source).toBe('network')
    // The answer is the server's business: nothing in the browser data names it.
    expect(result.data).not.toHaveProperty('schedule')
    const rank = Object.fromEntries(result.data.artists.map((a) => [a.id, a.popularityRank]))
    expect(rank).toEqual({ Q2: 1, Q1: 2 })
  })

  it('still loads when the page-view API fails', async () => {
    const result = await loadGameData({
      fetchImpl: ((url: string) =>
        url.includes('w/api.php') ? Promise.reject(new Error('down')) : route(url)) as unknown as typeof fetch,
    })
    expect(result.data.artists).toHaveLength(2)
  })

  it('caches what it fetched', async () => {
    await loadGameData({ fetchImpl: wikidata() })
    expect(idb.write).toHaveBeenCalledTimes(1)
  })

  it('serves the in-memory copy without another fetch', async () => {
    await loadGameData({ fetchImpl: wikidata() })
    let fetched = false
    const second = await loadGameData({
      fetchImpl: (() => {
        fetched = true
        return Promise.resolve(sparqlOk(POOL_ROWS))
      }) as typeof fetch,
    })
    expect(fetched).toBe(false)
    expect(second.source).toBe('cache')
  })

  it('serves a fresh IndexedDB copy without hitting the network', async () => {
    idb.read.mockResolvedValue({ key: 'dataset:v4', ts: Date.now(), data: goodJson })
    let fetched = false
    const result = await loadGameData({
      fetchImpl: (() => {
        fetched = true
        return Promise.resolve(sparqlOk(POOL_ROWS))
      }) as typeof fetch,
    })
    expect(fetched).toBe(false)
    expect(result.source).toBe('cache')
    expect(result.data.artists).toHaveLength(2)
  })

  it('ignores a corrupt cached copy and refetches', async () => {
    idb.read.mockResolvedValue({
      key: 'dataset:v4',
      ts: Date.now(),
      data: { artists: [] },
    })
    const result = await loadGameData({ fetchImpl: wikidata() })
    expect(result.source).toBe('network')
  })

  it('falls back to a stale cached copy when the network is down', async () => {
    idb.read.mockResolvedValue({
      key: 'dataset:v4',
      ts: Date.now() - DATA_CACHE_TTL_MS - 1000,
      data: goodJson,
    })
    const result = await loadGameData({
      fetchImpl: (() => Promise.reject(new Error('offline'))) as typeof fetch,
    })
    expect(result.source).toBe('stale-cache')
    expect(result.data.artists).toHaveLength(2)
  })

  it('rejects when there is no cache and the network fails', async () => {
    await expect(
      loadGameData({
        fetchImpl: (() => Promise.reject(new Error('offline'))) as typeof fetch,
      }),
    ).rejects.toThrow('offline')
  })

  it('shares one request between concurrent callers', async () => {
    let calls = 0
    const fetchImpl = ((url: string) => {
      if (url.includes('sparql')) calls++
      return route(url)
    }) as unknown as typeof fetch
    const [a, b] = await Promise.all([
      loadGameData({ fetchImpl }),
      loadGameData({ fetchImpl }),
    ])
    expect(calls).toBe(1)
    expect(a.data).toBe(b.data)
  })
})
describe('loadGameData with the nightly Spotify pool', () => {
  const pooled = [
    { ...artistA, popularityRank: 1, answerEligible: true },
    { ...artistB, popularityRank: 2, answerEligible: true },
  ]
  const poolOk = {
    ok: true,
    json: async () => ({ generatedAt: '2026-10-14T21:10:00Z', source: 'spotify', artists: pooled }),
  } as Response

  it('uses data/pool.json and never queries Wikidata', async () => {
    const fetchImpl = vi.fn((url: string) =>
      Promise.resolve(url.endsWith('data/pool.json') ? poolOk : sparqlOk(POOL_ROWS)),
    )
    const res = await loadGameData({ fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(res.source).toBe('network')
    expect(res.data.artists.map((a) => a.id)).toEqual(['omer-adam', 'rita'])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(idb.write).toHaveBeenCalled()
  })

  it('keeps only artists with every tile known', async () => {
    const incomplete = [
      { ...artistA, id: 'no-year', debutYear: 0, popularityRank: 3 },
      { ...artistA, id: 'no-age', birthYear: undefined, popularityRank: 4 },
      { ...artistA, id: 'no-gender', genderKnown: false, popularityRank: 5 },
      { ...artistA, id: 'no-lineup', type: 'band' as const, members: 0, foundedYear: 1990, birthYear: undefined, popularityRank: 6 },
    ]
    const ok = {
      ok: true,
      json: async () => ({ generatedAt: 'x', source: 'spotify', artists: [...pooled, ...incomplete] }),
    } as Response
    const fetchImpl = vi.fn(() => Promise.resolve(ok))
    const res = await loadGameData({ fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(res.data.artists.map((a) => a.id)).toEqual(['omer-adam', 'rita'])
    expect(res.data.artists.map((a) => a.popularityRank)).toEqual([1, 2])
  })

  it('drops artists below the Israeli listener floor', async () => {
    const tail = [
      { ...artistA, id: 'no-namer', popularityRank: 3, metrics: { ...artistA.metrics, spotifyListenersIL: MIN_LISTENERS_IL - 1 } },
      { ...artistA, id: 'known', popularityRank: 4, metrics: { ...artistA.metrics, spotifyListenersIL: MIN_LISTENERS_IL } },
    ]
    const ok = {
      ok: true,
      json: async () => ({ generatedAt: 'x', source: 'spotify', artists: [...pooled, ...tail] }),
    } as Response
    const fetchImpl = vi.fn(() => Promise.resolve(ok))
    const res = await loadGameData({ fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(res.data.artists.map((a) => a.id)).toEqual(['omer-adam', 'rita', 'known'])
  })

  it('falls back to live Wikidata when pool.json is missing', async () => {
    const fetchImpl = vi.fn((url: string) =>
      url.endsWith('data/pool.json')
        ? Promise.resolve({ ok: false, status: 404 } as Response)
        : route(url),
    )
    const res = await loadGameData({ fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(res.data.artists.map((a) => a.nameHe).sort()).toEqual(['הבדקה', 'סקאזי'])
  })
})

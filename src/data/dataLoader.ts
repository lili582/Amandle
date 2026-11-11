import type { Artist } from '../artist'
import type { GameData } from '../game'
import { DATA_CACHE_TTL_MS, DATA_SCHEMA_VERSION } from '../config'
import { israelDateString } from '../game'
import { fetchArtistPool, applyPageviewRanks } from '../sources'
import { idbRead, idbWrite } from '../storage'
import { ranksAreDense } from '../artist'
import { preparePrebuiltPool, prepareLivePool } from './preparePool'

// The pool is the top POOL_SIZE Israeli artists on Spotify by monthly
// listeners. A GitHub Action every two weeks (update-pool.yml running
// scripts/build-pool.ts) reads Wikidata and Spotify, and deploys the result
// to Vercel as data/pool.json next to the app; it is never committed. When that file is missing
// (local dev without `npm run build:pool`), the game falls back to the live
// Wikidata query ranked by Hebrew Wikipedia page views (wikidata.ts,
// popularity.ts). Either way the result is cached in IndexedDB for the day.
//
// The browser gets the pool only (search, names, pictures). Which artist is
// the day's answer is decided on the server (server/, /api/guess) with a
// secret seed, so it is not in anything the browser downloads. The server
// prepares the pool with the same rules (preparePool.ts), so both sides agree
// on every artist and rank.

export type DataSource = 'network' | 'cache' | 'stale-cache'

export const POOL_URL = `${import.meta.env.BASE_URL}data/pool.json`

// null = no usable prebuilt pool (missing, HTML 404 page, or malformed).
export async function fetchPrebuiltPool(
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<Artist[] | null> {
  try {
    const res = await fetchImpl(POOL_URL, { signal, cache: 'no-cache' })
    if (!res.ok) return null
    return preparePrebuiltPool(await res.json())
  } catch (err) {
    if (signal?.aborted) throw err
    return null
  }
}

export interface LoadResult {
  data: GameData
  source: DataSource
}

// Keyed by the build too: each deploy (new artists, fixed data) replaces the
// day's cached pool at once. Within one deploy the pool stays pinned for the day.
const BUILD_ID: string = import.meta.env.VITE_BUILD_ID ?? 'dev'
const cacheKey = `dataset:${DATA_SCHEMA_VERSION}:${BUILD_ID}`

// Session copy, so switching tabs/views never re-reads storage.
let memoryData: GameData | null = null
let inflight: Promise<LoadResult> | null = null

// Minimal structural validation of a fetched dataset. This guards against a
// partial upstream response or a schema change slipping through and producing a
// puzzle with a missing artist.
export function validateGameData(json: unknown): GameData | null {
  if (!json || typeof json !== 'object') return null
  const d = json as { artists?: unknown }
  if (!Array.isArray(d.artists) || d.artists.length === 0) return null

  const ids = new Set<string>()
  for (const a of d.artists) {
    if (!a || typeof a !== 'object') return null
    const x = a as Partial<Artist>
    if (typeof x.id !== 'string' || !x.id) return null
    if (typeof x.nameHe !== 'string' || !x.nameHe) return null
    if (typeof x.debutYear !== 'number' || !Number.isFinite(x.debutYear)) return null
    if (typeof x.type !== 'string') return null
    if (typeof x.primaryGenre !== 'string') return null
    if (typeof x.popularityRank !== 'number' || !Number.isInteger(x.popularityRank) || x.popularityRank < 1) {
      return null
    }
    if (ids.has(x.id)) return null
    ids.add(x.id)
  }
  // Popularity must be a strict 1..N ranking: one artist per rank.
  if (!ranksAreDense(d.artists as Artist[])) return null

  return { artists: d.artists as Artist[] }
}

// Fresh = fetched on the same Israeli calendar day (and within the TTL), so
// every player re-derives the pool once per puzzle day.
export function isDataFresh(ts: number, now: number = Date.now()): boolean {
  if (!Number.isFinite(ts) || now - ts >= DATA_CACHE_TTL_MS || ts > now) return false
  return israelDateString(new Date(ts)) === israelDateString(new Date(now))
}

export interface LoadGameDataOptions {
  fetchImpl?: typeof fetch
  now?: number // clock injection for tests
  signal?: AbortSignal
  // See FetchPoolOptions.headers: Node callers need a User-Agent, browsers do not.
  headers?: Record<string, string>
  onProgress?: (stage: 'artists' | 'popularity', done?: number, total?: number) => void
}

export async function loadGameData(opts: LoadGameDataOptions = {}): Promise<LoadResult> {
  // Concurrent callers (React strict mode double-invoke, several views mounting)
  // must share one fetch rather than each hammering WDQS.
  if (inflight) return inflight
  inflight = doLoad(opts).finally(() => {
    inflight = null
  })
  return inflight
}

async function doLoad(opts: LoadGameDataOptions): Promise<LoadResult> {
  const { now = Date.now(), fetchImpl, signal, headers, onProgress } = opts

  // 1. Session copy — no storage read, no network.
  if (memoryData) return { data: memoryData, source: 'cache' }

  // 2. IndexedDB copy from a previous visit.
  const cached = await idbRead<GameData>(cacheKey)
  if (cached && isDataFresh(cached.ts, now)) {
    const data = validateGameData(cached.data)
    if (data) {
      memoryData = data
      return { data, source: 'cache' }
    }
  }

  // 3. The nightly Spotify pool deployed with the app.
  onProgress?.('artists')
  const prebuilt = await fetchPrebuiltPool(fetchImpl, signal)
  if (prebuilt) {
    const data = validateGameData({ artists: prebuilt })
    if (data) {
      await idbWrite(cacheKey, now, data)
      memoryData = data
      return { data, source: 'network' }
    }
  }

  // 4. Fallback: query Wikidata live.
  try {
    const artists = await fetchArtistPool({ fetchImpl, signal, headers })
    // Popularity from Hebrew Wikipedia page views. If that API is down the
    // provisional sitelink ranking stays, which is still a playable game.
    onProgress?.('popularity', 0)
    try {
      await applyPageviewRanks(artists, {
        fetchImpl,
        signal,
        onProgress: (d, t) => onProgress?.('popularity', d, t),
      })
    } catch (err) {
      if (signal?.aborted) throw err
    }
    // Keep the POOL_SIZE most viewed (or, if page views failed, the provisional
    // sitelink order), one artist per rank 1..N. Any of them can be
    // the daily answer (ANSWER_POOL_SIZE = POOL_SIZE).
    const data = validateGameData({ artists: prepareLivePool(artists) })
    if (!data) throw new Error('Wikidata dataset failed validation')
    await idbWrite(cacheKey, now, data)
    memoryData = data
    return { data, source: 'network' }
  } catch (err) {
    if (signal?.aborted) throw err
    // 5. Network failed — a stale pool is still a perfectly playable game.
    if (cached) {
      const data = validateGameData(cached.data)
      if (data) {
        memoryData = data
        return { data, source: 'stale-cache' }
      }
    }
    throw err
  }
}

// Test hook — clears the session copy so tests exercise the full load path.
export function _resetDataLoaderCache(): void {
  memoryData = null
  inflight = null
}
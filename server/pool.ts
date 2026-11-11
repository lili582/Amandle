import type { Artist } from '../src/artist'
import { prepareLivePool, preparePrebuiltPool } from '../src/data/preparePool'
import { israelDateString } from '../src/game/daily'
import { applyPageviewRanks } from '../src/sources/popularity'
import { fetchArtistPool } from '../src/sources/wikidata'

// The pool the server scores guesses with. It must be the very pool the
// browser plays with, so it is read and prepared the same way
// (src/data/preparePool.ts):
//   1. pool.json shipped with this deploy (copied next to the function at
//      build time), the same file the browser downloads;
//   2. otherwise the live Wikidata pool ranked by page views, as the browser
//      falls back to - rebuilt once per Israeli day.

export interface ServerPool {
  artists: Artist[]
  byId: ReadonlyMap<string, Artist>
}

export interface PoolSource {
  // Returns the parsed pool.json, or null when this deploy has none.
  readPoolFile: () => Promise<unknown>
  fetchImpl?: typeof fetch
}

const USER_AGENT = 'Amandle/1.0 (free Hebrew music guessing game; https://amandle-eta.vercel.app)'

let filePool: ServerPool | null = null
let livePool: { day: string; pool: ServerPool } | null = null
let inflight: Promise<ServerPool> | null = null

function index(artists: Artist[]): ServerPool {
  return { artists, byId: new Map(artists.map((a) => [a.id, a])) }
}

export function loadServerPool(src: PoolSource, now = Date.now()): Promise<ServerPool> {
  if (filePool) return Promise.resolve(filePool)
  const day = israelDateString(new Date(now))
  if (livePool?.day === day) return Promise.resolve(livePool.pool)
  if (inflight) return inflight
  inflight = (async () => {
    let json: unknown = null
    try {
      json = await src.readPoolFile()
    } catch {
      json = null
    }
    const prebuilt = json ? preparePrebuiltPool(json) : null
    if (prebuilt) {
      filePool = index(prebuilt)
      return filePool
    }
    const headers = { 'User-Agent': USER_AGENT }
    const artists = await fetchArtistPool({ fetchImpl: src.fetchImpl, headers })
    try {
      await applyPageviewRanks(artists, { fetchImpl: src.fetchImpl })
    } catch {
      // Same as the browser: the provisional sitelink order stays.
    }
    const pool = index(prepareLivePool(artists))
    if (pool.artists.length === 0) throw new Error('empty pool')
    livePool = { day, pool }
    return pool
  })().finally(() => {
    inflight = null
  })
  return inflight
}

// Test hook.
export function _resetServerPool(): void {
  filePool = null
  livePool = null
  inflight = null
}

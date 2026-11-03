import type { Artist } from '../types'
import { ANSWER_POOL_SIZE, POOL_SIZE } from '../config'

// The one place popularity ranks are assigned. Whatever the source (the
// nightly Spotify pool, Hebrew Wikipedia page views, a cached copy), the pool
// that reaches the game is:
//   * one entry per artist (no repeated Wikidata id, no two entries that point
//     at the same Spotify profile),
//   * at most POOL_SIZE artists,
//   * ranked 1..N with every rank used exactly once (no ties, no gaps).
// Ties in the underlying score (Spotify rounds "1.2K monthly listeners") are
// broken by Wikidata sitelinks, then by QID, so every player derives the same
// order.

type Extra = { ids: { spotify?: string }; metrics: { spotifyListeners?: number } }

function spotifyId(a: Artist): string | undefined {
  return (a as Artist & Extra).ids.spotify
}

export function compareByPopularity(score: (a: Artist) => number) {
  return (x: Artist, y: Artist): number =>
    score(y) - score(x) ||
    y.metrics.wikidataSitelinks - x.metrics.wikidataSitelinks ||
    x.ids.wikidata.localeCompare(y.ids.wikidata) ||
    x.id.localeCompare(y.id)
}

// `ordered` must already be sorted most popular first. Returns new objects;
// the input is not mutated.
export function assignRanks(ordered: Artist[], size = POOL_SIZE): Artist[] {
  const seenIds = new Set<string>()
  const seenSpotify = new Set<string>()
  const pool: Artist[] = []
  for (const a of ordered) {
    if (pool.length >= size) break
    if (seenIds.has(a.id)) continue
    const sid = spotifyId(a)
    if (sid && seenSpotify.has(sid)) continue
    seenIds.add(a.id)
    if (sid) seenSpotify.add(sid)
    pool.push(a)
  }
  return pool.map((a, i) => ({ ...a, popularityRank: i + 1, answerEligible: i < ANSWER_POOL_SIZE }))
}

// Re-ranks a pool that already carries ranks (e.g. data/pool.json or an old
// cache): keeps its order, but repairs duplicates, gaps and anything past
// POOL_SIZE. A missing/invalid rank sorts last.
export function normalizeRanks(artists: Artist[], size = POOL_SIZE): Artist[] {
  const key = (a: Artist) =>
    Number.isFinite(a.popularityRank) && a.popularityRank >= 1 ? a.popularityRank : Number.MAX_SAFE_INTEGER
  const listeners = (a: Artist) => a.metrics.spotifyListenersIL ?? (a as Artist & Extra).metrics.spotifyListeners ?? 0
  const ordered = [...artists].sort(
    (x, y) => key(x) - key(y) || compareByPopularity(listeners)(x, y),
  )
  return assignRanks(ordered, size)
}

// True when ranks are exactly 1..N, each used once.
export function ranksAreDense(artists: { popularityRank: number }[]): boolean {
  const seen = new Set<number>()
  for (const a of artists) {
    const r = a.popularityRank
    if (!Number.isInteger(r) || r < 1 || r > artists.length || seen.has(r)) return false
    seen.add(r)
  }
  return true
}

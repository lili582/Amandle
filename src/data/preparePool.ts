import type { Artist, PrebuiltPool } from '../artist'
import { MIN_LISTENERS_IL } from '../config'
import { isComplete } from '../game/complete'
import {
  normalizeRanks,
  applyGenreOverride,
  curatedArtist,
  curatedFor,
  EXCLUDED_QIDS,
} from '../artist'

// The rules that turn raw pool data into the pool a round is played with.
// Pure (no browser storage, no import.meta.env), because two places must apply
// exactly the same rules and land on exactly the same pool and ranks: the
// browser (data/dataLoader.ts, for search and the board) and the server
// (server/pool.ts, which checks guesses against the secret answer).

// pool.json -> the pool, or null when the file is not a usable Spotify pool.
//   * artists Lili removed (EXCLUDED_QIDS) are dropped at once, without
//     waiting for the next pool build,
//   * hand-checked artists (curatedArtists.ts) keep their curated tiles and
//     are never cut by the listener floor,
//   * only artists with every tile known,
//   * the long tail below MIN_LISTENERS_IL is dropped (an artist with no
//     reading is kept), so an older pool.json obeys it too,
//   * hand-checked genres apply to an already-deployed pool.json too,
//   * the file's ranks are never trusted blindly: one artist per rank, 1..N.
export function preparePrebuiltPool(json: unknown): Artist[] | null {
  const pool = json as Partial<PrebuiltPool> | null
  if (pool?.source !== 'spotify' || !Array.isArray(pool.artists) || pool.artists.length === 0) return null
  const complete = pool.artists
    .filter((a) => !EXCLUDED_QIDS.has(a.id))
    .map(applyCurated)
    .filter(
      (a) =>
        isComplete(a) &&
        (curatedFor(a.id) != null || (a.metrics?.spotifyListenersIL ?? MIN_LISTENERS_IL) >= MIN_LISTENERS_IL),
    )
    .map(applyGenreOverride)
  return complete.length > 0 ? normalizeRanks(complete) : null
}

// The live Wikidata fallback (no pool.json): keep the complete, non-excluded
// artists, ranked 1..N.
export function prepareLivePool(artists: Artist[]): Artist[] {
  return normalizeRanks(artists.filter((a) => isComplete(a) && !EXCLUDED_QIDS.has(a.id)))
}

function applyCurated(a: Artist): Artist {
  const c = curatedFor(a.id)
  if (!c) return a
  return { ...curatedArtist(c, a), popularityRank: a.popularityRank, answerEligible: a.answerEligible, imageUrl: a.imageUrl }
}

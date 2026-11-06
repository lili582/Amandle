import type { Artist } from '../artist'
import { artistAge, breakthroughOf } from '../artist'
import type { TileField } from './types'

export const MAX_AGE = 100

// The single rule for "every tile has a real value" (no "—", no "להקה"
// placeholder, no guessed gender). Only such artists enter the pool, so every
// guess gets a full row and the year / age tiles always have something to
// point an arrow at. Used by the nightly build (fill.ts), fill-pool and the
// client loader.
export function missingFields(a: Artist, thisYear = new Date().getFullYear()): TileField[] {
  const missing: TileField[] = []
  if (breakthroughOf(a) <= 0) missing.push('breakthrough')
  if (a.type !== 'solo' && !(a.members > 0)) missing.push('members')
  if (!(Number.isFinite(a.popularityRank) && a.popularityRank >= 1)) missing.push('popularity')
  if (!a.genderKnown) missing.push('gender')
  if (!a.primaryGenre) missing.push('genre')
  // An impossible age (a living singer born in 1888 - a Wikidata typo for
  // 1988) counts as unknown, so it never reaches a tile.
  const age = artistAge(a, thisYear)
  if (age <= 0 || age > MAX_AGE) missing.push('age')
  return missing
}

export function isComplete(a: Artist, thisYear?: number): boolean {
  return missingFields(a, thisYear).length === 0
}

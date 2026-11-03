import type { Artist, TileField } from '../types'
import { artistAge, breakthroughOf } from './age'

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
  if (artistAge(a, thisYear) <= 0) missing.push('age')
  return missing
}

export function isComplete(a: Artist, thisYear?: number): boolean {
  return missingFields(a, thisYear).length === 0
}

export const hasAllData = isComplete
// Names used by dataLoader.ts.
export const missingDetails = (a: Artist): TileField[] => missingFields(a)
export const hasAllDetails = (a: Artist): boolean => isComplete(a)

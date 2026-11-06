import type { Artist } from './types'

// The age tile: a solo artist's age (age at death if deceased); for a group,
// years since it was formed. 0 = unknown.
export function artistAge(artist: Artist, refYear = new Date().getFullYear()): number {
  if (artist.type === 'solo') {
    if (!artist.birthYear) return 0
    return Math.max(0, (artist.diedYear ?? refYear) - artist.birthYear)
  }
  return artist.foundedYear ? Math.max(0, refYear - artist.foundedYear) : 0
}

export function isDeceased(artist: Artist): boolean {
  return artist.type === 'solo' && artist.diedYear != null
}
// The year of the first hit; falls back to the career start when no hit
// could be dated.
export function breakthroughOf(a: Artist): number {
  return a.breakthroughYear > 0 ? a.breakthroughYear : a.debutYear
}

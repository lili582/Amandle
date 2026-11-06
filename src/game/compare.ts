import type { Artist } from '../artist'
import type { Match, TileResult } from './types'
import { artistAge, breakthroughOf } from '../artist'
import { tileValue } from './formatTile'

// Spotle's rules, tile by tile:
//   breakthrough green = same year, yellow = within 7 years, arrow to the answer
//   members     green = same lineup size, otherwise gray
//   popularity  green = same rank, yellow = within 5% of the pool (Spotle:
//               50 spots out of 1,000), arrow to the answer
//   gender      green / gray
//   genre       green / gray
//   age         green = same age, yellow = within 7 years, arrow to the
//               answer (replaces Spotle's nationality: everyone is Israeli)

export const BREAKTHROUGH_CLOSE_YEARS = 7

export function popularityCloseSpan(poolSize: number): number {
  return Math.max(10, Math.round(poolSize * 0.05))
}

function breakthroughTile(guess: Artist, target: Artist): TileResult {
  const field = 'breakthrough' as const
  const g = breakthroughOf(guess)
  const t = breakthroughOf(target)
  // 0 = unknown: never a match and no meaningful direction.
  if (g <= 0 || t <= 0) return { field, match: 'wrong' }
  if (g === t) return { field, match: 'correct' }
  return {
    field,
    match: Math.abs(g - t) <= BREAKTHROUGH_CLOSE_YEARS ? 'close' : 'wrong',
    arrow: g < t ? 'up' : 'down',
  }
}

function membersTile(guess: Artist, target: Artist): TileResult {
  const field = 'members' as const
  const known = guess.members > 0 && target.members > 0
  return { field, match: known && guess.members === target.members ? 'correct' : 'wrong' }
}

function popularityTile(guess: Artist, target: Artist, poolSize: number): TileResult {
  const field = 'popularity' as const
  if (guess.popularityRank === target.popularityRank) return { field, match: 'correct' }
  const diff = Math.abs(guess.popularityRank - target.popularityRank)
  const match: Match = diff <= popularityCloseSpan(poolSize) ? 'close' : 'wrong'
  // Rank 1 is the most popular: a larger rank means "go up the chart".
  return { field, match, arrow: guess.popularityRank > target.popularityRank ? 'up' : 'down' }
}

function genderTile(guess: Artist, target: Artist): TileResult {
  return { field: 'gender', match: guess.gender === target.gender ? 'correct' : 'wrong' }
}

function genreTile(guess: Artist, target: Artist): TileResult {
  return { field: 'genre', match: guess.primaryGenre === target.primaryGenre ? 'correct' : 'wrong' }
}

export const AGE_CLOSE_YEARS = 7

function ageTile(guess: Artist, target: Artist): TileResult {
  const field = 'age' as const
  const g = artistAge(guess)
  const t = artistAge(target)
  if (g <= 0 || t <= 0) return { field, match: 'wrong' }
  if (g === t) return { field, match: 'correct' }
  return {
    field,
    match: Math.abs(g - t) <= AGE_CLOSE_YEARS ? 'close' : 'wrong',
    arrow: g < t ? 'up' : 'down',
  }
}

// Compare a guessed artist against the target. Pure and deterministic. The
// win condition is guess.id === target.id, never "all tiles green".
export function compareArtist(guess: Artist, target: Artist, poolSize = 1000): TileResult[] {
  return [
    breakthroughTile(guess, target),
    membersTile(guess, target),
    popularityTile(guess, target, poolSize),
    genderTile(guess, target),
    genreTile(guess, target),
    ageTile(guess, target),
  ].map((t) => ({ ...t, value: tileValue(guess, t.field) }))
}

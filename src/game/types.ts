import type { Artist } from '../artist'

// The game's own types: tiles, guesses, a saved board, stats.
export type Match = 'correct' | 'close' | 'wrong'

// Spotle's tile order: breakthrough year in place of the debut album, and age
// in place of nationality (every artist here is Israeli).
export const TILE_FIELDS = ['breakthrough', 'members', 'popularity', 'gender', 'genre', 'age'] as const
export type TileField = (typeof TILE_FIELDS)[number]

export interface TileResult {
  field: TileField
  match: Match
  // 'up' = the target value is HIGHER (later year / more popular) than the guess
  arrow?: 'up' | 'down'
  // The guessed artist's value as shown when the guess was made, so a saved
  // board renders the same after a reload.
  value?: string
}

export type GameStatus = 'playing' | 'won' | 'lost'

export interface GuessRecord {
  artistId: string
  tiles: TileResult[]
}

export interface SaveState {
  guesses: GuessRecord[]
  status: GameStatus
  date: string
  // The day's answer, known only once the round is over (the server reveals
  // it on a win or after the last guess). Boards saved before 0.11.0 lack it.
  answerId?: string
}

export interface StatsState {
  played: number
  wins: number
  streak: number
  maxStreak: number
  dist: number[]
  lastWinDate: string | null
}

// What a round is played with: the pool. The answer is not part of it: the
// server decides it (/api/guess) and reveals it only when the round ends.
export interface GameData {
  artists: Artist[]
}

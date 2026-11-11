import type { TileResult } from './types'

// The contract between the browser (game/guessApi.ts) and the server
// (server/handler.ts) for POST /api/guess. Types only, so the server can
// import it without pulling in any browser code.

export const GUESS_API_PATH = '/api/guess'

export interface GuessRequest {
  // The Israeli calendar day being played (YYYY-MM-DD): today, or yesterday
  // in retro mode. The server refuses days that have not started yet.
  date: string
  // The guessed artist's id.
  guess: string
  // The ids guessed earlier in this round, oldest first. Used only to decide
  // whether this is the last guess (then the answer is revealed).
  previous: string[]
}

export interface GuessResponse {
  tiles: TileResult[]
  correct: boolean
  // Present only when the round is over: the guess was right, or it was the
  // last allowed guess.
  answerId?: string
}

export type GuessErrorCode =
  | 'badRequest' // malformed body
  | 'unknownArtist' // an id that is not in the server's pool
  | 'futureDate' // a day that has not started yet in Israel
  | 'unavailable' // the server could not load the pool

export interface GuessError {
  error: GuessErrorCode
}

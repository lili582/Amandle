import type { Artist } from '../src/artist'
import { breakthroughOf } from '../src/artist'
import { MAX_GUESSES } from '../src/config'
import { compareArtist } from '../src/game/compare'
import { answerForDay, dayNumberFor, israelDateString, rendezvousSchedule } from '../src/game/daily'
import type { GuessErrorCode, GuessResponse } from '../src/game/guessProtocol'

// Which artist is the day's answer, and how a guess scores against it.
// Runs only on the server: the seed below is what makes the answer
// unguessable from the browser.

// The seed every day before the switch to the secret seed used. It was in the
// browser bundle (and is in the public repo), so it is not a secret: days
// before SeedConfig.from keep it only so their answers never change (saved
// boards, "yesterday" mode).
export const PUBLIC_SEED = 'amandle-schedule-2026-10'

export interface SeedConfig {
  // AMANDLE_SEED: a long random string, set only in Vercel's environment
  // variables. Missing = every day uses PUBLIC_SEED (the game works, but the
  // answer can be worked out from the public code).
  secret?: string
  // AMANDLE_SEED_FROM (YYYY-MM-DD): the first Israeli day that uses the
  // secret seed.
  from: string
}

// The default first day of the secret seed (the day after this change was
// written). Override with AMANDLE_SEED_FROM.
export const DEFAULT_SEED_FROM = '2026-11-12'

const YMD = /^\d{4}-\d{2}-\d{2}$/

export function seedConfigFromEnv(env: Record<string, string | undefined>): SeedConfig {
  const secret = env.AMANDLE_SEED?.trim() || undefined
  const from = env.AMANDLE_SEED_FROM?.trim()
  return { secret, from: from && YMD.test(from) ? from : DEFAULT_SEED_FROM }
}

export function seedFor(date: string, seeds: SeedConfig): string {
  return seeds.secret && date >= seeds.from ? seeds.secret : PUBLIC_SEED
}

// An answer must have a known breakthrough year: otherwise the שנת פריצה tile
// shows "—" with no arrow on every guess that day.
export function answerCandidates(artists: Artist[]): string[] {
  return artists.filter((a) => a.answerEligible && breakthroughOf(a) > 0).map((a) => a.id)
}

// Schedules are ~1,000 days x the pool; build each (pool, seed) once.
const scheduleCache = new WeakMap<Artist[], Map<string, string[]>>()

export function scheduleFor(artists: Artist[], seed: string): string[] {
  let bySeed = scheduleCache.get(artists)
  if (!bySeed) {
    bySeed = new Map()
    scheduleCache.set(artists, bySeed)
  }
  let s = bySeed.get(seed)
  if (!s) {
    const ids = answerCandidates(artists)
    s = ids.length > 0 ? rendezvousSchedule(ids, seed) : []
    bySeed.set(seed, s)
  }
  return s
}

export function answerIdFor(artists: Artist[], date: string, seeds: SeedConfig): string | null {
  const schedule = scheduleFor(artists, seedFor(date, seeds))
  return schedule.length > 0 ? answerForDay(schedule, dayNumberFor(date)) : null
}

export function isRealDate(s: string): boolean {
  if (!YMD.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

// A player whose clock runs a little fast may ask for the new day a few
// minutes early; anything later than that is a day that has not started.
export const CLOCK_SLACK_MS = 5 * 60 * 1000

export interface ScoreInput {
  artists: Artist[]
  byId: ReadonlyMap<string, Artist>
  seeds: SeedConfig
  date: string
  guess: string
  previous: string[]
  now: number
  // Dev server only: the ?day=N preview may look at future days.
  allowFuture?: boolean
}

export type ScoreResult = { ok: true; body: GuessResponse } | { ok: false; status: number; error: GuessErrorCode }

export function scoreGuess(input: ScoreInput): ScoreResult {
  const { artists, byId, seeds, date, guess, previous, now } = input
  if (!isRealDate(date)) return { ok: false, status: 400, error: 'badRequest' }
  if (!input.allowFuture && date > israelDateString(new Date(now + CLOCK_SLACK_MS))) {
    return { ok: false, status: 403, error: 'futureDate' }
  }
  if (previous.length >= MAX_GUESSES) return { ok: false, status: 400, error: 'badRequest' }
  if (new Set([...previous, guess]).size !== previous.length + 1) {
    return { ok: false, status: 400, error: 'badRequest' }
  }
  const guessed = byId.get(guess)
  if (!guessed || previous.some((id) => !byId.has(id))) return { ok: false, status: 400, error: 'unknownArtist' }

  const answerId = answerIdFor(artists, date, seeds)
  const target = answerId ? byId.get(answerId) : undefined
  if (!target) return { ok: false, status: 503, error: 'unavailable' }

  const tiles = compareArtist(guessed, target, artists.length)
  const correct = guessed.id === target.id
  // The round is over (so the answer may be shown) on a win, or when this was
  // the last allowed guess. A board that already holds the answer knows it.
  const over = correct || previous.length + 1 >= MAX_GUESSES || previous.includes(target.id)
  return { ok: true, body: over ? { tiles, correct, answerId: target.id } : { tiles, correct } }
}

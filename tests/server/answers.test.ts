import { describe, it, expect } from 'vitest'
import {
  PUBLIC_SEED,
  answerIdFor,
  isRealDate,
  scheduleFor,
  scoreGuess,
  seedConfigFromEnv,
  seedFor,
  DEFAULT_SEED_FROM,
  type SeedConfig,
} from '../../server/answers'
import { MAX_GUESSES } from '../../src/config'
import { israelDateString } from '../../src/game/daily'
import type { Artist } from '../../src/artist/types'
import { makeArtist } from '../fixtures'

const artistA: Artist = makeArtist({ id: 'omer-adam', nameHe: 'עומר אדם', debutYear: 2009, birthYear: 1993, popularityRank: 1 })
const artistB: Artist = { ...artistA, id: 'rita', nameHe: 'ריטה', popularityRank: 2 }
const SEED = 'test'

describe('scheduleFor', () => {
  it('never picks an answer with no known year (the breakthrough tile would have no arrow)', () => {
    const noYear = { ...artistA, id: 'no-year', debutYear: 0, breakthroughYear: 0 }
    const hitOnly = { ...artistA, id: 'hit-only', debutYear: 0, breakthroughYear: 2015 }
    const schedule = scheduleFor([artistA, artistB, noYear, hitOnly], SEED)
    expect(schedule).not.toContain('no-year')
    expect(schedule).toContain('hit-only')
  })

  it('only uses eligible artists', () => {
    const artists = [artistA, artistB, { ...artistA, id: 'x', answerEligible: false }]
    expect(new Set(scheduleFor(artists, SEED))).toEqual(new Set(['omer-adam', 'rita']))
  })

  it('a change at the margin of the pool leaves most days untouched', () => {
    const pool = Array.from({ length: 250 }, (_, i) => makeArtist({ id: `Q${i}`, nameHe: String(i) }))
    const before = scheduleFor(pool, SEED).slice(0, 365)
    const after = scheduleFor([...pool.slice(0, 249), makeArtist({ id: 'Qnew', nameHe: 'n' })], SEED).slice(0, 365)
    const same = before.filter((id, d) => after[d] === id).length
    expect(same / 365).toBeGreaterThan(0.9)
  })

  it('never repeats an answer within 60 days', () => {
    const pool = Array.from({ length: 100 }, (_, i) => makeArtist({ id: `Q${i}`, nameHe: String(i) }))
    const s = scheduleFor(pool, SEED)
    for (let d = 0; d + 60 < 400; d++) expect(new Set(s.slice(d, d + 61)).size).toBe(61)
  })

  it('is deterministic for the same pool and seed, and differs by seed', () => {
    const pool = Array.from({ length: 100 }, (_, i) => makeArtist({ id: `Q${i}`, nameHe: String(i) }))
    expect(scheduleFor([...pool], SEED)).toEqual(scheduleFor([...pool], SEED))
    expect(scheduleFor(pool, 'other').slice(0, 30)).not.toEqual(scheduleFor(pool, SEED).slice(0, 30))
  })
})

describe('seeds', () => {
  const seeds: SeedConfig = { secret: 's3cret', from: '2026-11-12' }

  it('keeps the public seed before the switch day and the secret one from it', () => {
    expect(seedFor('2026-11-11', seeds)).toBe(PUBLIC_SEED)
    expect(seedFor('2026-11-12', seeds)).toBe('s3cret')
    expect(seedFor('2027-01-01', seeds)).toBe('s3cret')
  })

  it('uses the public seed everywhere when no secret is set', () => {
    expect(seedFor('2027-01-01', { from: '2026-11-12' })).toBe(PUBLIC_SEED)
  })

  it('reads the environment', () => {
    expect(seedConfigFromEnv({})).toEqual({ secret: undefined, from: DEFAULT_SEED_FROM })
    expect(seedConfigFromEnv({ AMANDLE_SEED: ' x ', AMANDLE_SEED_FROM: '2026-12-01' })).toEqual({ secret: 'x', from: '2026-12-01' })
    expect(seedConfigFromEnv({ AMANDLE_SEED: '', AMANDLE_SEED_FROM: 'soon' })).toEqual({ secret: undefined, from: DEFAULT_SEED_FROM })
  })

  it('days before the switch keep the answers the browser used to derive', () => {
    const pool = Array.from({ length: 50 }, (_, i) => makeArtist({ id: `Q${i}`, nameHe: String(i) }))
    expect(answerIdFor(pool, '2026-11-01', seeds)).toBe(answerIdFor(pool, '2026-11-01', { from: '2099-01-01' }))
  })
})

describe('isRealDate', () => {
  it('accepts calendar days only', () => {
    expect(isRealDate('2026-02-28')).toBe(true)
    expect(isRealDate('2026-02-30')).toBe(false)
    expect(isRealDate('2026-2-3')).toBe(false)
    expect(isRealDate('../etc')).toBe(false)
  })
})

describe('scoreGuess', () => {
  const pool = Array.from({ length: 30 }, (_, i) =>
    makeArtist({ id: `Q${i}`, nameHe: String(i), popularityRank: i + 1, debutYear: 1990 + i }),
  )
  const byId = new Map(pool.map((a) => [a.id, a]))
  const seeds: SeedConfig = { secret: 'k', from: '2000-01-01' }
  const now = Date.parse('2026-11-20T10:00:00Z')
  const date = israelDateString(new Date(now))
  const answer = answerIdFor(pool, date, seeds)!
  const wrong = pool.map((a) => a.id).filter((id) => id !== answer)
  const base = { artists: pool, byId, seeds, date, now }

  it('scores a wrong guess without revealing the answer', () => {
    const r = scoreGuess({ ...base, guess: wrong[0], previous: [] })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.body.correct).toBe(false)
    expect(r.body.tiles).toHaveLength(6)
    expect(r.body).not.toHaveProperty('answerId')
    expect(JSON.stringify(r.body)).not.toContain(answer)
  })

  it('reveals the answer on a win', () => {
    const r = scoreGuess({ ...base, guess: answer, previous: wrong.slice(0, 3) })
    expect(r.ok && r.body).toMatchObject({ correct: true, answerId: answer })
  })

  it('reveals the answer after the last allowed guess', () => {
    const previous = wrong.slice(0, MAX_GUESSES - 1)
    const r = scoreGuess({ ...base, guess: wrong[MAX_GUESSES - 1], previous })
    expect(r.ok && r.body).toMatchObject({ correct: false, answerId: answer })
    const early = scoreGuess({ ...base, guess: wrong[MAX_GUESSES - 2], previous: previous.slice(0, -2) })
    expect(early.ok && early.body).not.toHaveProperty('answerId')
  })

  it('refuses unknown ids, repeats and too many guesses', () => {
    expect(scoreGuess({ ...base, guess: 'nope', previous: [] })).toMatchObject({ ok: false, error: 'unknownArtist' })
    expect(scoreGuess({ ...base, guess: wrong[0], previous: ['nope'] })).toMatchObject({ ok: false, error: 'unknownArtist' })
    expect(scoreGuess({ ...base, guess: wrong[0], previous: [wrong[0]] })).toMatchObject({ ok: false, error: 'badRequest' })
    expect(scoreGuess({ ...base, guess: wrong[20], previous: wrong.slice(0, MAX_GUESSES) })).toMatchObject({
      ok: false,
      error: 'badRequest',
    })
  })

  it('refuses days that have not started in Israel', () => {
    expect(scoreGuess({ ...base, date: '2026-11-21', guess: wrong[0], previous: [] })).toMatchObject({
      ok: false,
      status: 403,
      error: 'futureDate',
    })
    // Yesterday ("retro" mode) is fine.
    expect(scoreGuess({ ...base, date: '2026-11-19', guess: wrong[0], previous: [] }).ok).toBe(true)
    // The dev server may preview any day.
    expect(scoreGuess({ ...base, date: '2027-01-01', guess: wrong[0], previous: [], allowFuture: true }).ok).toBe(true)
  })

  it('allows the new day a few minutes early (a fast clock at midnight)', () => {
    const justBefore = Date.parse('2026-11-20T21:58:00Z') // 23:58 in Israel
    expect(scoreGuess({ ...base, now: justBefore, date: '2026-11-21', guess: wrong[0], previous: [] }).ok).toBe(true)
  })
})

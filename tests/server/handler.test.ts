import { describe, it, expect, beforeEach } from 'vitest'
import { handleGuess, type HandlerDeps } from '../../server/handler'
import { _resetServerPool } from '../../server/pool'
import { answerIdFor } from '../../server/answers'
import { preparePrebuiltPool } from '../../src/data/preparePool'
import { israelDateString } from '../../src/game/daily'
import { makeArtist } from '../fixtures'

const raw = Array.from({ length: 20 }, (_, i) =>
  makeArtist({ id: `Q${i}`, nameHe: String(i), popularityRank: i + 1, debutYear: 1990 + i }),
)
const poolFile = { generatedAt: '2026-11-01T00:00:00Z', source: 'spotify', artists: raw }
const now = Date.parse('2026-11-20T10:00:00Z')
const date = israelDateString(new Date(now))
const deps: HandlerDeps = {
  seeds: { secret: 'k', from: '2000-01-01' },
  now: () => now,
  readPoolFile: async () => poolFile,
  fetchImpl: (() => Promise.reject(new Error('no network in tests'))) as typeof fetch,
}

beforeEach(() => _resetServerPool())

describe('handleGuess', () => {
  it('only answers POST', async () => {
    expect((await handleGuess('GET', null, deps)).status).toBe(405)
  })

  it('rejects a malformed body', async () => {
    expect((await handleGuess('POST', null, deps)).status).toBe(400)
    expect((await handleGuess('POST', { date, guess: 5 }, deps)).status).toBe(400)
    expect((await handleGuess('POST', { date, guess: 'Q1', previous: 'Q2' }, deps)).status).toBe(400)
  })

  it('scores against the same prepared pool the browser plays with', async () => {
    const prepared = preparePrebuiltPool(poolFile)!
    const answer = answerIdFor(prepared, date, deps.seeds)!
    const r = await handleGuess('POST', { date, guess: answer, previous: [] }, deps)
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ correct: true, answerId: answer })
  })

  it('answers 503 when there is no pool at all', async () => {
    const r = await handleGuess('POST', { date, guess: 'Q1', previous: [] }, { ...deps, readPoolFile: async () => null })
    expect(r).toEqual({ status: 503, body: { error: 'unavailable' } })
  })
})

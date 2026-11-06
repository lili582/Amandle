import { describe, expect, it } from 'vitest'
import { assignRanks, normalizeRanks, ranksAreDense } from '../src/lib/rank'
import { rankBySpotify } from '../src/lib/spotify'
import { validateGameData } from '../src/lib/dataLoader'
import { ANSWER_POOL_SIZE, POOL_SIZE } from '../src/config'
import { makeArtist } from './fixtures'
import type { Artist } from '../src/types'

function artist(n: number, extra: Partial<Artist> = {}): Artist {
  return makeArtist({ id: `Q${n}`, nameHe: `אמן ${n}`, ids: { wikidata: `Q${n}` }, ...extra })
}

describe('normalizeRanks', () => {
  it('turns duplicate, gapped and oversized ranks into a strict 1..N', () => {
    const pool = [
      artist(1, { popularityRank: 3 }),
      artist(2, { popularityRank: 3 }),
      artist(3, { popularityRank: 1 }),
      artist(4, { popularityRank: 1500 }),
      artist(5, { popularityRank: 0 }),
    ]
    const out = normalizeRanks(pool)
    expect(out.map((a) => [a.id, a.popularityRank])).toEqual([
      ['Q3', 1],
      ['Q1', 2],
      ['Q2', 3],
      ['Q4', 4],
      ['Q5', 5],
    ])
    expect(ranksAreDense(out)).toBe(true)
  })

  it('keeps at most POOL_SIZE (350) artists, ranked 1-350', () => {
    expect(POOL_SIZE).toBe(350)
    const pool = Array.from({ length: 1200 }, (_, i) => artist(i + 1, { popularityRank: 1 }))
    const out = normalizeRanks(pool)
    expect(out).toHaveLength(POOL_SIZE)
    expect(new Set(out.map((a) => a.popularityRank)).size).toBe(POOL_SIZE)
    expect(Math.min(...out.map((a) => a.popularityRank))).toBe(1)
    expect(Math.max(...out.map((a) => a.popularityRank))).toBe(POOL_SIZE)
    expect(out.filter((a) => a.answerEligible)).toHaveLength(ANSWER_POOL_SIZE)
  })

  it('lets every artist in the pool be a daily answer', () => {
    const out = normalizeRanks(Array.from({ length: 334 }, (_, i) => artist(i + 1, { popularityRank: i + 1 })))
    expect(out.every((a) => a.answerEligible)).toBe(true)
  })

  it('drops repeated artists (same id or same Spotify profile)', () => {
    const a = artist(1, { popularityRank: 1 })
    const b = { ...artist(2, { popularityRank: 2 }), ids: { wikidata: 'Q2', spotify: 'same' } } as Artist
    const c = { ...artist(3, { popularityRank: 3 }), ids: { wikidata: 'Q3', spotify: 'same' } } as Artist
    const out = assignRanks([a, a, b, c])
    expect(out.map((x) => [x.id, x.popularityRank])).toEqual([
      ['Q1', 1],
      ['Q2', 2],
    ])
  })
})

describe('rankBySpotify', () => {
  it('gives tied listener counts different ranks', () => {
    const artists = [artist(1), artist(2), artist(3)]
    const listeners = new Map([
      ['Q1', { id: 's1', listeners: 1200 }],
      ['Q2', { id: 's2', listeners: 1200 }],
      ['Q3', { id: 's3', listeners: 1200 }],
    ])
    const pool = rankBySpotify(artists, listeners)
    expect(pool.map((a) => a.popularityRank)).toEqual([1, 2, 3])
  })
})

describe('validateGameData', () => {
  it('rejects a dataset where two artists share a rank', () => {
    const artists = [artist(1, { popularityRank: 1 }), artist(2, { popularityRank: 1 })]
    expect(validateGameData({ artists, schedule: ['Q1'] })).toBeNull()
  })
})

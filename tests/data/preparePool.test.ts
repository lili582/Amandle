import { describe, it, expect } from 'vitest'
import { preparePrebuiltPool } from '../../src/data/preparePool'
import { EXCLUDED_QIDS } from '../../src/artist/curatedArtists'
import { makeArtist } from '../fixtures'

describe('preparePrebuiltPool', () => {
  it('drops removed artists from an already-deployed pool.json and closes the rank gap', () => {
    const removed = [...EXCLUDED_QIDS][0]
    const artists = [
      makeArtist({ id: 'Qa', nameHe: 'א', popularityRank: 1 }),
      makeArtist({ id: removed, nameHe: 'הוסר', popularityRank: 2 }),
      makeArtist({ id: 'Qb', nameHe: 'ב', popularityRank: 3 }),
    ]
    const pool = preparePrebuiltPool({ generatedAt: '2026-11-01', source: 'spotify', artists })!
    expect(pool.map((a) => [a.id, a.popularityRank])).toEqual([
      ['Qa', 1],
      ['Qb', 2],
    ])
  })

  it('removes פטריק סבג and אברהם פריד', () => {
    expect(EXCLUDED_QIDS.has('Q6981527')).toBe(true)
    expect(EXCLUDED_QIDS.has('Q2778189')).toBe(true)
  })
})

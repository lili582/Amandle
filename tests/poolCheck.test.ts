import { describe, expect, it } from 'vitest'
import {
  checkPool,
  diffPools,
  isStale,
  MIN_SAFE_POOL,
  summaryMarkdown,
  type PoolArtist,
  type PoolFile,
} from '../src/lib/poolCheck'

const artist = (i: number, rank = i): PoolArtist => ({ id: `Q${i}`, nameHe: `אמן ${i}`, popularityRank: rank })
const pool = (ids: number[], generatedAt = '2026-11-01T00:00:00Z'): PoolFile => ({
  generatedAt,
  artists: ids.map((id, i) => artist(id, i + 1)),
})
const range = (from: number, n: number) => Array.from({ length: n }, (_, i) => from + i)

describe('checkPool', () => {
  it('passes a normal update', () => {
    const prev = pool(range(1, 350))
    const next = pool([...range(1, 340), ...range(1001, 10)])
    const r = checkPool(prev, next)
    expect(r.ok).toBe(true)
    expect(r.diff?.joined).toHaveLength(10)
    expect(r.diff?.left).toHaveLength(10)
  })

  it('blocks a pool that is too small', () => {
    const r = checkPool(pool(range(1, 350)), pool(range(1, MIN_SAFE_POOL - 1)))
    expect(r.ok).toBe(false)
    expect(r.problems[0]).toMatch(/only 299 artists/)
  })

  it('blocks when more than 30% of the pool changes, unless forced', () => {
    const prev = pool(range(1, 350))
    const next = pool([...range(1, 200), ...range(1001, 150)])
    expect(checkPool(prev, next).ok).toBe(false)
    expect(checkPool(prev, next, { force: true }).ok).toBe(true)
  })

  it('never lets force skip the size rule', () => {
    expect(checkPool(null, pool(range(1, 10)), { force: true }).ok).toBe(false)
  })

  it('only checks the size when there is no live pool', () => {
    const r = checkPool(null, pool(range(1, 350)))
    expect(r.ok).toBe(true)
    expect(r.diff).toBeNull()
  })
})

describe('diffPools', () => {
  it('lists moves of 20 places or more, biggest first', () => {
    const prev = pool(range(1, 100))
    const order = range(1, 100)
    order.splice(order.indexOf(80), 1)
    order.unshift(80) // 80 jumps from #80 to #1
    const d = diffPools(prev, pool(order))
    expect(d.moved[0]).toMatchObject({ from: 80, to: 1 })
    expect(d.moved.every((m) => Math.abs(m.from - m.to) >= 20)).toBe(true)
  })
})

describe('isStale', () => {
  const now = Date.parse('2026-11-15T00:00:00Z')
  it('is stale after 13 days or with no pool', () => {
    expect(isStale(pool([1], '2026-11-01T00:00:00Z'), now)).toBe(true)
    expect(isStale(pool([1], '2026-11-10T00:00:00Z'), now)).toBe(false)
    expect(isStale(null, now)).toBe(true)
    expect(isStale(pool([1], 'not a date'), now)).toBe(true)
  })
})

describe('summaryMarkdown', () => {
  it('says whether the update was deployed', () => {
    const next = pool(range(1, 350))
    expect(summaryMarkdown(checkPool(null, next), next)).toMatch(/OK, deploying/)
    const small = pool(range(1, 5))
    expect(summaryMarkdown(checkPool(null, small), small)).toMatch(/BLOCKED/)
  })
})

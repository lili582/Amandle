import { describe, expect, it } from 'vitest'
import { applyPageviewRanks } from '../src/lib/popularity'
import { makeArtist } from './fixtures'

function ok(body: unknown) {
  return { ok: true, json: async () => body } as Response
}

describe('applyPageviewRanks', () => {
  it('sums 60 days of views, follows continuation and ranks by views', async () => {
    const artists = [
      makeArtist({ id: 'a', nameHe: 'א' }),
      makeArtist({ id: 'b', nameHe: 'ב (להקה)' }),
      makeArtist({ id: 'c', nameHe: 'ג' }),
    ]
    let calls = 0
    const fetchImpl = (async (url: string) => {
      calls++
      const u = new URL(url)
      expect(u.searchParams.get('origin')).toBe('*')
      if (!u.searchParams.get('pvcontinue')) {
        return ok({
          continue: { pvcontinue: 'x', continue: '||' },
          query: { pages: [{ title: 'א', pageviews: { d1: 10, d2: null } }, { title: 'ב (להקה)' }, { title: 'ג' }] },
        })
      }
      return ok({ query: { pages: [{ title: 'ב (להקה)', pageviews: { d1: 500 } }, { title: 'ג', pageviews: { d1: 50 } }] } })
    }) as unknown as typeof fetch
    await applyPageviewRanks(artists, { fetchImpl })
    expect(calls).toBe(2)
    expect(artists.map((a) => [a.id, a.metrics.hewikiViews60d, a.popularityRank])).toEqual([
      ['a', 10, 3],
      ['b', 500, 1],
      ['c', 50, 2],
    ])
  })
})

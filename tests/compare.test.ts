import { describe, expect, it } from 'vitest'
import { compareArtist, popularityCloseSpan } from '../src/lib/compare'
import { fixturesById, makeArtist } from './fixtures'

const A = (id: string) => fixturesById.get(id)!
const tile = (g: string, t: string, i: number, pool = 1000) => compareArtist(A(g), A(t), pool)[i]

describe('compareArtist (Spotle rules)', () => {
  it('guessing the target makes every tile green, in Spotle order', () => {
    const tiles = compareArtist(A('pop-alpha'), A('pop-alpha'))
    expect(tiles.map((t) => t.field)).toEqual(['breakthrough', 'members', 'popularity', 'gender', 'genre', 'age'])
    for (const t of tiles) {
      expect(t.match).toBe('correct')
      expect(t.arrow).toBeUndefined()
    }
  })

  it('stores the guessed value on each tile', () => {
    const tiles = compareArtist(A('rock-band'), A('pop-alpha'))
    expect(tiles.map((t) => t.value)).toEqual(['1985', '4', '#500', 'מעורב', 'רוק', String(new Date().getFullYear() - 1984)])
  })

  describe('breakthrough', () => {
    it('uses the dated hit, else falls back to the career start', () => {
      expect(compareArtist(A('pop-alpha'), A('pop-alpha'))[0].value).toBe('2010')
      expect(compareArtist(A('pop-beta'), A('pop-alpha'))[0].value).toBe('2013')
    })
    it('within 7 years is yellow with an arrow toward the answer', () => {
      expect(tile('pop-beta', 'pop-alpha', 0)).toMatchObject({ match: 'close', arrow: 'down' })
      expect(tile('pop-alpha', 'pop-beta', 0)).toMatchObject({ match: 'close', arrow: 'up' })
    })
    it('7 years apart is still yellow, 8 is gray', () => {
      const t = makeArtist({ id: 't', nameHe: 'ת', breakthroughYear: 2010 })
      const g7 = makeArtist({ id: 'g7', nameHe: 'ז', breakthroughYear: 2017 })
      const g8 = makeArtist({ id: 'g8', nameHe: 'ח', breakthroughYear: 2018 })
      expect(compareArtist(g7, t)[0].match).toBe('close')
      expect(compareArtist(g8, t)[0].match).toBe('wrong')
    })
    it('more than 7 years is gray with an arrow', () => {
      expect(tile('mizrahi-1', 'pop-alpha', 0)).toMatchObject({ match: 'wrong', arrow: 'up' })
    })
    it('unknown year is gray with no arrow', () => {
      const t = tile('unknown-1', 'pop-alpha', 0)
      expect(t.match).toBe('wrong')
      expect(t.arrow).toBeUndefined()
    })
  })

  describe('members', () => {
    it('same lineup size is green, anything else gray (no yellow)', () => {
      expect(tile('pop-beta', 'pop-alpha', 1).match).toBe('correct')
      expect(tile('rock-duo', 'rock-band', 1).match).toBe('wrong')
      expect(tile('pop-alpha', 'rock-band', 1).match).toBe('wrong')
    })
    it('two unknown band sizes are never green', () => {
      expect(tile('rock-band2', 'rock-band2', 1).match).toBe('wrong')
    })
  })

  describe('popularity', () => {
    it('within 5% of the pool is yellow', () => {
      expect(popularityCloseSpan(1000)).toBe(50)
      expect(popularityCloseSpan(100)).toBe(10)
      expect(tile('pop-beta', 'pop-alpha', 2)).toMatchObject({ match: 'close', arrow: 'up' })
    })
    it('far apart is gray; arrow up means the answer is more popular', () => {
      expect(tile('rock-band', 'pop-alpha', 2)).toMatchObject({ match: 'wrong', arrow: 'up' })
      expect(tile('pop-alpha', 'rock-band', 2)).toMatchObject({ match: 'wrong', arrow: 'down' })
    })
  })

  it('gender and genre are green or gray only', () => {
    expect(tile('pop-beta', 'pop-alpha', 3).match).toBe('wrong')
    expect(tile('rock-band', 'pop-alpha', 3).match).toBe('wrong')
    expect(tile('mizrahi-1', 'pop-alpha', 4).match).toBe('wrong')
    expect(tile('pop-beta', 'pop-alpha', 4).match).toBe('correct')
  })

  describe('age', () => {
    // pop-alpha born 1990, pop-beta 1993, hiphop-m 1995, mizrahi-1 died at 45.
    it('within 7 years is yellow; arrow up means the answer is older', () => {
      expect(tile('pop-beta', 'pop-alpha', 5)).toMatchObject({ match: 'close', arrow: 'up' })
      expect(tile('pop-alpha', 'hiphop-m', 5)).toMatchObject({ match: 'close', arrow: 'down' })
    })
    it('7 years apart is still yellow, 8 is gray', () => {
      const t = makeArtist({ id: 't', nameHe: 'ת', birthYear: 1990 })
      const g7 = makeArtist({ id: 'g7', nameHe: 'ז', birthYear: 1997 })
      const g8 = makeArtist({ id: 'g8', nameHe: 'ח', birthYear: 1998 })
      expect(compareArtist(g7, t)[5].match).toBe('close')
      expect(compareArtist(g8, t)[5].match).toBe('wrong')
    })
    it('a deceased artist counts by age at death', () => {
      // 45 at death vs. a living artist: compared on 45, never on years since birth.
      expect(tile('mizrahi-1', 'mizrahi-1', 5).match).toBe('correct')
      expect(compareArtist(A('mizrahi-1'), A('pop-alpha'))[5].value).toBe('45 ז״ל')
    })
    it('a band counts years since it formed; unknown is gray', () => {
      expect(compareArtist(A('rock-band'), A('pop-alpha'))[5].arrow).toBeDefined()
      const t = tile('unknown-1', 'pop-alpha', 5)
      expect(t.match).toBe('wrong')
      expect(t.arrow).toBeUndefined()
    })
  })
})

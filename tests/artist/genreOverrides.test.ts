import { describe, expect, it } from 'vitest'
import { applyGenreOverride, GENRE_OVERRIDES } from '../../src/artist/genreOverrides'
import { GENRE_RULES } from '../../src/sources/genreRules'

const AMIR_BENAYOUN = 'Q2920263'

describe('genre overrides', () => {
  it('only uses known genres', () => {
    const known = new Set(Object.values(GENRE_RULES))
    for (const g of Object.values(GENRE_OVERRIDES)) expect(known.has(g)).toBe(true)
  })

  it('replaces the primary genre and keeps the old one as secondary', () => {
    const fixed = applyGenreOverride({ id: AMIR_BENAYOUN, primaryGenre: 'jazz-soul', secondaryGenres: [] })
    expect(fixed.primaryGenre).toBe('mizrahi')
    expect(fixed.secondaryGenres).toEqual(['jazz-soul'])
  })

  it('leaves artists without an override alone', () => {
    const a = { id: 'Q1', primaryGenre: 'rock' as const, secondaryGenres: [] }
    expect(applyGenreOverride(a)).toBe(a)
  })
})

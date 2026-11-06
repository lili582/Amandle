import { describe, expect, it } from 'vitest'
import { isComplete, missingFields } from '../../src/game/complete'
import { makeArtist } from '../fixtures'

describe('missingFields', () => {
  it('a solo artist needs a year, an age and a known gender', () => {
    expect(missingFields(makeArtist({ id: 'a', nameHe: 'a', birthYear: 1980 }))).toEqual([])
    expect(missingFields(makeArtist({ id: 'a', nameHe: 'a', birthYear: 1980, debutYear: 0 }))).toEqual(['breakthrough'])
    expect(missingFields(makeArtist({ id: 'a', nameHe: 'a', birthYear: undefined }))).toEqual(['age'])
    expect(missingFields(makeArtist({ id: 'a', nameHe: 'a', birthYear: 1980, genderKnown: false }))).toEqual(['gender'])
  })
  it('treats an impossible age as unknown (Wikidata typo 1888 for 1988)', () => {
    expect(missingFields(makeArtist({ id: 'a', nameHe: 'a', birthYear: 1888 }))).toEqual(['age'])
    // A singer who died long ago keeps the age they died at.
    expect(missingFields(makeArtist({ id: 'a', nameHe: 'a', birthYear: 1900, diedYear: 1970, debutYear: 1930 }))).toEqual([])
  })
  it('needs a popularity rank', () => {
    expect(missingFields(makeArtist({ id: 'a', nameHe: 'a', birthYear: 1980, popularityRank: 0 }))).toEqual(['popularity'])
  })
  it('a band also needs its lineup size and formation year', () => {
    const band = makeArtist({ id: 'b', nameHe: 'b', type: 'band', members: 4, foundedYear: 1990 })
    expect(isComplete(band)).toBe(true)
    expect(missingFields({ ...band, members: 0 })).toEqual(['members'])
    expect(missingFields({ ...band, foundedYear: undefined })).toEqual(['age'])
  })
})

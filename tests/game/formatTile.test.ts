import { describe, expect, it } from 'vitest'
import { tileValue } from '../../src/game/formatTile'
import { makeArtist } from '../fixtures'

describe('tileValue', () => {
  it('formats every field', () => {
    const a = makeArtist({ id: 'x', nameHe: 'x', debutYear: 1999, popularityRank: 7, gender: 'female', primaryGenre: 'mizrahi', birthYear: 1980 })
    expect(tileValue(a, 'breakthrough')).toBe('1999')
    expect(tileValue({ ...a, breakthroughYear: 2004 }, 'breakthrough')).toBe('2004')
    expect(tileValue(a, 'members')).toBe('סולו')
    expect(tileValue(a, 'popularity')).toBe('#7')
    expect(tileValue(a, 'gender')).toBe('אישה')
    expect(tileValue(a, 'genre')).toBe('מזרחית')
    expect(tileValue(a, 'age')).toBe(String(new Date().getFullYear() - 1980))
  })

  it('shows group sizes and placeholders for unknowns', () => {
    expect(tileValue(makeArtist({ id: 'b', nameHe: 'b', type: 'band', members: 5 }), 'members')).toBe('5')
    expect(tileValue(makeArtist({ id: 'b', nameHe: 'b', type: 'band', members: 0 }), 'members')).toBe('להקה')
    expect(tileValue(makeArtist({ id: 'd', nameHe: 'd', type: 'duo', members: 2 }), 'members')).toBe('2')
    expect(tileValue(makeArtist({ id: 'u', nameHe: 'u', debutYear: 0 }), 'breakthrough')).toBe('—')
    expect(tileValue(makeArtist({ id: 'u', nameHe: 'u', birthYear: undefined }), 'age')).toBe('—')
    expect(tileValue(makeArtist({ id: 'z', nameHe: 'z', birthYear: 1950, diedYear: 2004 }), 'age')).toBe('54 ז״ל')
  })
})

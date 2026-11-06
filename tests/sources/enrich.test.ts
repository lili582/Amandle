import { describe, expect, it } from 'vitest'
import { applyEnrichment, applyDetails, baseTitle, breakthroughFromRecordings, debutFromReleaseGroups, genderOfMembers, membersFromRelations } from '../../src/sources/enrich'
import { makeArtist } from '../fixtures'

describe('MusicBrainz parsing', () => {
  it('debut = first studio album; else first EP/single; ignores compilations and live', () => {
    expect(
      debutFromReleaseGroups([
        { 'first-release-date': '1995-03', 'primary-type': 'Album' },
        { 'first-release-date': '1990', 'primary-type': 'Album', 'secondary-types': ['Compilation'] },
        { 'first-release-date': '1993-01-01', 'primary-type': 'Album' },
        { 'first-release-date': '1991', 'primary-type': 'Single' },
      ]),
    ).toBe(1993)
    expect(debutFromReleaseGroups([{ 'first-release-date': '2019', 'primary-type': 'EP' }])).toBe(2019)
    expect(debutFromReleaseGroups([])).toBeUndefined()
  })

  it('counts current members, or everyone when nobody is current', () => {
    const rel = (id: string, ended: boolean) => ({ type: 'member of band', direction: 'backward', ended, artist: { id, name: id } })
    expect(membersFromRelations([rel('a', false), rel('b', false), rel('c', true)])).toHaveLength(2)
    expect(membersFromRelations([rel('a', true), rel('b', true), rel('c', true)])).toHaveLength(3)
    expect(membersFromRelations([rel('a', false), { ...rel('x', false), type: 'producer' }])).toHaveLength(1)
  })

  it('derives a group gender from its members', () => {
    expect(genderOfMembers(['Male', 'Male'])).toBe('male')
    expect(genderOfMembers(['Female', null])).toBe('female')
    expect(genderOfMembers(['Male', 'Female'])).toBe('mixed')
    expect(genderOfMembers([null])).toBeUndefined()
  })
})

describe('breakthrough year', () => {
  it('earliest original release among the top tracks; ignores other songs', () => {
    const recs = [
      { title: 'שיר גדול', 'first-release-date': '2012-05-01' },
      { title: 'שיר גדול', 'first-release-date': '2016' }, // later reissue
      { title: 'Another Hit', 'first-release-date': '2014' },
      { title: 'שיר לא קשור', 'first-release-date': '2001' },
    ]
    expect(breakthroughFromRecordings(['Another Hit (Live)', 'שיר גדול - Remastered'], recs)).toBe(2012)
    expect(breakthroughFromRecordings(['nothing'], recs)).toBeUndefined()
  })
  it('only counts recordings credited to the artist', () => {
    const recs = [
      { title: 'Tel Aviv', 'first-release-date': '1982', 'artist-credit': [{ artist: { id: 'other' } }] },
      { title: 'Tel Aviv', 'first-release-date': '2013', 'artist-credit': [{ artist: { id: 'me' } }] },
    ]
    expect(breakthroughFromRecordings(['Tel Aviv'], recs, 'me')).toBe(2013)
  })
  it('normalises titles', () => {
    expect(baseTitle('Hello (Radio Edit)')).toBe(baseTitle('hello'))
  })
})

describe('applyEnrichment', () => {
  it('fills unknowns, never overwrites Wikidata-known lineup/gender', () => {
    const band = makeArtist({ id: 'b', nameHe: 'b', type: 'band', members: 0, gender: 'mixed', genderKnown: false, enriched: false })
    applyEnrichment(band, { members: 4, gender: 'male', debutYear: 1988, imageUrl: 'x.jpg' })
    expect(band).toMatchObject({ members: 4, gender: 'male', genderKnown: true, debutYear: 1988, imageUrl: 'x.jpg', enriched: true })

    const known = makeArtist({ id: 'k', nameHe: 'k', type: 'band', members: 3, gender: 'female', enriched: false })
    applyEnrichment(known, { members: 6, gender: 'male' })
    expect(known).toMatchObject({ members: 3, gender: 'female' })
  })

  it('rejects an impossible debut year', () => {
    const a = makeArtist({ id: 'a', nameHe: 'a', birthYear: 1990, debutYear: 2010 })
    applyEnrichment(a, { debutYear: 1970, breakthroughYear: 1985 })
    expect(a.debutYear).toBe(2010)
    expect(a.breakthroughYear).toBe(0)
  })
})

describe('applyDetails (pool build)', () => {
  it('fills the tile fields only and leaves the artist un-enriched', () => {
    const a = makeArtist({ id: 'y', nameHe: 'y', debutYear: 0, birthYear: 1990 })
    applyDetails(a, { debutYear: 2012, breakthroughYear: 2014, imageUrl: 'x', members: 3 })
    expect(a.debutYear).toBe(2012)
    expect(a.breakthroughYear).toBe(2014)
    expect(a.imageUrl).toBeUndefined()
    const band = makeArtist({ id: 'b', nameHe: 'b', type: 'band', members: 0, genderKnown: false })
    applyDetails(band, { members: 4, gender: 'mixed' })
    expect(band).toMatchObject({ members: 4, gender: 'mixed', genderKnown: true })
    expect(a.enriched).toBeUndefined()
  })
})

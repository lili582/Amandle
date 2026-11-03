import type { Artist } from '../src/types'

let q = 100
export function makeArtist(partial: Partial<Artist> & Pick<Artist, 'id' | 'nameHe'>): Artist {
  return {
    wikiTitle: partial.nameHe,
    nameEn: undefined,
    aliases: [],
    debutYear: 2000,
    birthYear: 1980,
    breakthroughYear: 0,
    type: 'solo',
    members: 1,
    gender: 'male',
    genderKnown: true,
    primaryGenre: 'pop',
    secondaryGenres: [],
    popularityRank: 1,
    answerEligible: true,
    ids: { wikidata: `Q${q++}` },
    metrics: { wikidataSitelinks: 10, hewikiViews60d: 100 },
    enriched: true,
    ...partial,
  }
}

// Fake artists covering every tile branch used by the unit tests.
export const fixtures: Artist[] = [
  makeArtist({ id: 'pop-alpha', nameHe: 'אמן פופ א', nameEn: 'Pop Alpha', aliases: ['אלפא'], debutYear: 2008, breakthroughYear: 2010, popularityRank: 1, birthYear: 1990 }),
  makeArtist({ id: 'pop-beta', nameHe: 'אמן פופ ב', nameEn: 'Pop Beta', aliases: ['ביטא'], debutYear: 2013, gender: 'female', popularityRank: 40, birthYear: 1993 }),
  makeArtist({ id: 'mizrahi-1', nameHe: 'זמר מזרחי', nameEn: 'Mizrahi Singer', debutYear: 1998, primaryGenre: 'mizrahi', secondaryGenres: ['pop'], popularityRank: 200, birthYear: 1975, diedYear: 2020 }),
  makeArtist({ id: 'rock-band', nameHe: 'להקת רוק א', nameEn: 'Rock Band A', debutYear: 1985, type: 'band', members: 4, gender: 'mixed', primaryGenre: 'rock', popularityRank: 500, foundedYear: 1984 }),
  makeArtist({ id: 'rock-band2', nameHe: 'להקת רוק ב', nameEn: 'Rock Band B', debutYear: 1990, type: 'band', members: 0, primaryGenre: 'rock', popularityRank: 240, foundedYear: 1988 }),
  makeArtist({ id: 'rock-duo', nameHe: 'צמד רוק', nameEn: 'Rock Duo', debutYear: 1995, type: 'duo', members: 2, primaryGenre: 'rock', popularityRank: 900, foundedYear: 1994 }),
  makeArtist({ id: 'hiphop-m', nameHe: 'ראפר', nameEn: 'Rapper', aliases: ['ראפ'], debutYear: 2015, primaryGenre: 'hiphop', popularityRank: 60, birthYear: 1995 }),
  makeArtist({ id: 'unknown-1', nameHe: 'אמן לא ידוע', debutYear: 0, birthYear: undefined, popularityRank: 30 }),
]

export const fixturesById: Map<string, Artist> = new Map(fixtures.map((a) => [a.id, a]))

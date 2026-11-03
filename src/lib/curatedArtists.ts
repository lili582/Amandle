import type { Artist, ArtistType, Gender, Genre } from '../types'

// Artists every Israeli player knows that the automatic pipeline keeps losing:
// no Hebrew-singer category on Wikipedia, no Spotify id on Wikidata, a band
// whose member count MusicBrainz doesn't know, or a newcomer too recent for
// either (איפה הילד?, מיכאל סוויסה, טונה, בן צור, מור, אופק אדנק...).
//
// Every tile value here is hand-checked against the artist's Hebrew Wikipedia
// article (Nov 2026). The nightly build (scripts/build-pool.ts) always reads
// their Spotify listeners like everyone else's, but never drops them: they
// skip the candidate gates, the Israel-share filter, the listener floor and
// the gap filling. If Wikidata also has the artist, these values win.
//
// To add someone: copy a line, fill in every field, and take the Spotify id
// from open.spotify.com/artist/<id>.
//   debut        = first release (album, EP or single that came out)
//   breakthrough = the year the artist became widely known (>= debut)
//   born         = birth year (solo) or formation year (duo / band)

export interface CuratedArtist {
  qid: string
  nameHe: string
  nameEn: string
  spotify: string
  type: ArtistType
  members: number
  gender: Gender
  genre: Genre
  debut: number
  breakthrough: number
  born: number
  died?: number
  aliases?: string[]
}

export const CURATED_ARTISTS: readonly CuratedArtist[] = [
  { qid: 'Q5348891', nameHe: 'איפה הילד', nameEn: 'Eifo HaYeled', spotify: '4tOEC0rfs2z2Sf1Tv2OKAg', type: 'band', members: 4, gender: 'male', genre: 'rock', debut: 1993, breakthrough: 1993, born: 1986, aliases: ['איפה הילד?'] },
  { qid: 'Q60951018', nameHe: 'מיכאל סוויסה', nameEn: 'Michael Swissa', spotify: '2oTKVerbNO0kejs87fV4jA', type: 'solo', members: 1, gender: 'male', genre: 'hiphop', debut: 2014, breakthrough: 2014, born: 1996 },
  { qid: 'Q21789555', nameHe: 'טונה', nameEn: 'Tuna', spotify: '17pbOSPIn3lmY0vHhOlKGL', type: 'solo', members: 1, gender: 'male', genre: 'hiphop', debut: 2006, breakthrough: 2015, born: 1984 },
  { qid: 'Q122926523', nameHe: 'ששון איפרם שאולוב', nameEn: 'Sasson Ifram Shaulov', spotify: '1Wq2STGiL7ZaIHAm5jMakc', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 2022, breakthrough: 2023, born: 2002 },
  { qid: 'Q133822007', nameHe: 'בן צור', nameEn: 'Ben Zur', spotify: '13Bny64Z0lG2BQFHhrMTPb', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 2021, breakthrough: 2021, born: 1999 },
  { qid: 'Q107994692', nameHe: 'מור', nameEn: 'Mor', spotify: '0oI0Dm98K3jmtSbfTLiChX', type: 'solo', members: 1, gender: 'female', genre: 'mizrahi', debut: 2021, breakthrough: 2021, born: 2001, aliases: ['מור רביעי'] },
  { qid: 'Q140044977', nameHe: 'אופק אדנק', nameEn: 'Ofek Adanek', spotify: '517NByhwSiSisC8rQZlcIv', type: 'solo', members: 1, gender: 'male', genre: 'hiphop', debut: 2021, breakthrough: 2021, born: 2002 },
  { qid: 'Q98945344', nameHe: 'בר צברי', nameEn: 'Bar Tzabary', spotify: '3lDTgudSVNR05wyiJ1RptF', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 2013, breakthrough: 2013, born: 1992 },
  { qid: 'Q56651641', nameHe: 'מרגי', nameEn: 'Mergui', spotify: '6grXi1oBW9ayoP4FTt4r2Z', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2018, breakthrough: 2018, born: 2000, aliases: ['יהונתן מרגי'] },
  { qid: 'Q130355280', nameHe: 'מתן חסן', nameEn: 'Matan Hasan', spotify: '36TG4OFhKuCHnTFCa6BEh7', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 2023, breakthrough: 2023, born: 1999, aliases: ["מ' המסתערב"] },
  { qid: 'Q2903846', nameHe: 'התקווה 6', nameEn: 'Hatikva 6', spotify: '3umXlcgiDTcCRkvPVobeJc', type: 'band', members: 8, gender: 'mixed', genre: 'hiphop', debut: 2007, breakthrough: 2007, born: 2003 },
  { qid: 'Q12411360', nameHe: 'רינת בר', nameEn: 'Rinat Bar', spotify: '4ZX6uAiFiYbKfAkYSPYM5W', type: 'solo', members: 1, gender: 'female', genre: 'mizrahi', debut: 2009, breakthrough: 2009, born: 1984 },
  { qid: 'Q55226701', nameHe: 'גיל ויין', nameEn: 'Gil Vain', spotify: '7LYtqxi8Le9d8KvQhzpcjj', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2019, breakthrough: 2019, born: 1993 },
  { qid: 'Q537222', nameHe: 'רן דנקר', nameEn: 'Ran Danker', spotify: '7hD6dkjWHapWVwkI6bjDFo', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2018, breakthrough: 2018, born: 1984 },
  { qid: 'Q25497019', nameHe: 'פלד', nameEn: 'Peled', spotify: '26lUUiDmS9zj1LOOCkZUiS', type: 'solo', members: 1, gender: 'male', genre: 'hiphop', debut: 2007, breakthrough: 2007, born: 1986, aliases: ['איתי פלד'] },
  { qid: 'Q17505283', nameHe: 'אדיר גץ', nameEn: 'Adir Getz', spotify: '2MOEM2cDGyOzUf7LrBFuIG', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2014, breakthrough: 2014, born: 1990 },
  { qid: 'Q85515954', nameHe: 'עדן מאירי', nameEn: 'Eden Meiri', spotify: '4qXTQzszopFkaczDBQCowt', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 2019, breakthrough: 2019, born: 2000 },
  { qid: 'Q16128985', nameHe: 'רותם כהן', nameEn: 'Rotem Cohen', spotify: '524rbl9t4PcNkv2PjItZw0', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2013, breakthrough: 2013, born: 1980 },
  { qid: 'Q114558299', nameHe: 'מאיה דדון', nameEn: 'Maya Dadon', spotify: '2CFhpsYDfBaq8q9enYLdBG', type: 'solo', members: 1, gender: 'female', genre: 'mizrahi', debut: 2022, breakthrough: 2022, born: 2006 },
  { qid: 'Q111792269', nameHe: 'נונו', nameEn: 'Nunu', spotify: '0wJDdyoTfE5SuqPNFvi2lG', type: 'solo', members: 1, gender: 'female', genre: 'pop', debut: 2021, breakthrough: 2021, born: 1998 },
  { qid: 'Q124013991', nameHe: 'יגל אושרי', nameEn: 'Yagel Oshri', spotify: '6Kn2CjfEButrWXszsA0E6Q', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2021, breakthrough: 2021, born: 2000 },
  // Already in the pool, but with wrong Wikidata dates: איתי לוי's birth is
  // recorded as 1888 (typo for 1988); אייל גולן's and אליעד נחום's debut came
  // out before they were 8.
  { qid: 'Q21570437', nameHe: 'איתי לוי', nameEn: 'Itay Levi', spotify: '6VdxGMRiiFQhI8F0FkuQZg', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 2013, breakthrough: 2013, born: 1988, aliases: ['Itay Levy'] },
  { qid: 'Q1382405', nameHe: 'אייל גולן', nameEn: 'Eyal Golan', spotify: '54jZWpivOTllo1afYNSx5U', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 1997, breakthrough: 1997, born: 1971 },
  { qid: 'Q6741400', nameHe: 'אליעד נחום', nameEn: 'Eliad Nachum', spotify: '3F78m0H4Y4a1Dvd79TKVvw', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2011, breakthrough: 2015, born: 1990, aliases: ['אליעד'] },
  { qid: 'Q111087', nameHe: 'עפרה חזה', nameEn: 'Ofra Haza', spotify: '6tOL5L1TlmBLdFMeEoXgae', type: 'solo', members: 1, gender: 'female', genre: 'mizrahi', debut: 1974, breakthrough: 1980, born: 1957, died: 2000 },
]

const byQid = new Map(CURATED_ARTISTS.map((c) => [c.qid, c]))

export function curatedFor(qid: string): CuratedArtist | undefined {
  return byQid.get(qid)
}

// A full pool entry from a curated record. Rank and listeners are filled in
// by the build like everyone else's. `base` (the Wikidata-built artist, when
// there is one) only contributes ids and metrics; the tiles are the curated ones.
export function curatedArtist(c: CuratedArtist, base?: Artist): Artist {
  const solo = c.type === 'solo'
  return {
    id: c.qid,
    nameHe: c.nameHe,
    wikiTitle: base?.wikiTitle ?? c.nameHe,
    nameEn: c.nameEn,
    aliases: [...new Set([c.nameHe, c.nameEn, ...(c.aliases ?? []), ...(base?.aliases ?? [])])],
    debutYear: c.debut,
    breakthroughYear: Math.max(c.breakthrough, c.debut),
    ...(solo ? { birthYear: c.born } : { foundedYear: c.born }),
    ...(c.died ? { diedYear: c.died } : {}),
    type: c.type,
    members: c.members,
    gender: c.gender,
    genderKnown: true,
    primaryGenre: c.genre,
    secondaryGenres: (base?.secondaryGenres ?? []).filter((g) => g !== c.genre).slice(0, 2),
    popularityRank: base?.popularityRank ?? 0,
    answerEligible: false,
    ids: { ...base?.ids, wikidata: c.qid, spotify: c.spotify },
    metrics: { wikidataSitelinks: 0, hewikiViews60d: 0, ...base?.metrics },
  }
}

// Deezer profiles that the name search gets wrong (a stray duplicate profile
// with the wrong picture and songs). QID -> the artist's real Deezer id.
// Pinned ids skip the name search entirely.
export const DEEZER_IDS: Readonly<Record<string, number>> = {
  Q26833615: 406841282, // סטטיק: 8341014 is a stray "סטטיק" profile (40 fans, wrong photo)
  Q21570437: 10348162, // איתי לוי is "Itay Levy" there; "Itay Levi" (0 fans) is someone else
}

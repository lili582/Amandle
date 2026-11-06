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
  // Trending in Israel (Spotify Israel charts, Nov 2026) but missing from the pool.
  { qid: 'Q118289471', nameHe: 'נס', nameEn: 'Ness', spotify: '2ygecp3YQJwBHL7LNzDgwe', type: 'solo', members: 1, gender: 'female', genre: 'hiphop', debut: 2022, breakthrough: 2022, born: 2002, aliases: ['נסיה לוי', 'נס וסטילה'] },
  { qid: 'Q118289474', nameHe: 'סטילה', nameEn: 'Stilla', spotify: '7lwdlhwSxbB36wqnOwo5Kd', type: 'solo', members: 1, gender: 'male', genre: 'hiphop', debut: 2022, breakthrough: 2022, born: 1998, aliases: ['STILLA', 'דור סורוקר'] },
  { qid: 'Q141485642', nameHe: 'יאנג בוטה', nameEn: 'Young Buta', spotify: '7eDcihyzgwCbWXFRJFc0MB', type: 'solo', members: 1, gender: 'male', genre: 'hiphop', debut: 2022, breakthrough: 2022, born: 2006, aliases: ['young buta', 'בוטה'] },
  { qid: 'Q66041205', nameHe: 'שרק', nameEn: 'Shreki', spotify: '01r7peBt7lJhz42nE04rpM', type: 'solo', members: 1, gender: 'male', genre: 'hiphop', debut: 2018, breakthrough: 2018, born: 1995, aliases: ['ShrekDiMC', 'שרקי'] },
  { qid: 'Q105745966', nameHe: 'גל אדם', nameEn: 'Gal Adam', spotify: '5sbVEFMCfdQ0T3vCqXax1K', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 2018, breakthrough: 2021, born: 2002 },
  { qid: 'Q8053834', nameHe: 'ישי לוי', nameEn: 'Ishay Levi', spotify: '453AwzpC0rSLstVxT0LZpy', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 1984, breakthrough: 1984, born: 1963, died: 2026 },
  { qid: 'Q88895494', nameHe: 'וייב איש', nameEn: 'Vibe Ish', spotify: '29AFXzlGto8fiywTMqEYHj', type: 'solo', members: 1, gender: 'male', genre: 'hiphop', debut: 2020, breakthrough: 2020, born: 1992 },
  { qid: 'Q65665707', nameHe: 'נורוז', nameEn: 'Noroz', spotify: '0rj0bYZWazgyJ3hZTDKQHD', type: 'solo', members: 1, gender: 'male', genre: 'hiphop', debut: 2017, breakthrough: 2017, born: 1999, aliases: ['NOROZ'] },
  { qid: 'Q5560699', nameHe: 'גלעד שגב', nameEn: 'Gilad Segev', spotify: '1dYnqsFdaibPEEIutRLTr0', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2004, breakthrough: 2004, born: 1974 },
  { qid: 'Q6712830', nameHe: 'מאור אדרי', nameEn: 'Maor Edri', spotify: '0iJF1SR5EbHAtVFgAz5tWH', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 2011, breakthrough: 2011, born: 1989 },
  { qid: 'Q113700418', nameHe: 'יונתן קלימי', nameEn: 'Yonatan Kalimi', spotify: '1Q1asWn5DqdokebjTj7qP9', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2021, breakthrough: 2021, born: 1993 },
  { qid: 'Q99312098', nameHe: 'רון בוחניק', nameEn: 'Ron Buhnik', spotify: '0mFHr7lwZmiRqsuy6JCS2K', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2017, breakthrough: 2017, born: 1994 },
  { qid: 'Q115051877', nameHe: 'ניר כנען', nameEn: 'Nir Kenaan', spotify: '0QiHQKrAfCCB0lVWnOxgLP', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2024, breakthrough: 2024, born: 2001 },
  { qid: 'Q105746465', nameHe: 'מושיקו מור', nameEn: 'Moshiko Mor', spotify: '6KskOtymSG2RrswMdNC2zC', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 2011, breakthrough: 2011, born: 1990 },
  { qid: 'Q27990307', nameHe: 'ענבל ביבי', nameEn: 'Inbal Bibi', spotify: '3ycYrLmJipiOEbtNdpfvhc', type: 'solo', members: 1, gender: 'female', genre: 'pop', debut: 2014, breakthrough: 2014, born: 1997 },
  { qid: 'Q86828376', nameHe: 'נוי פדלון', nameEn: 'Noy Fadlon', spotify: '4VFtBffxanXW7fbw1xH7at', type: 'solo', members: 1, gender: 'female', genre: 'pop', debut: 2018, breakthrough: 2018, born: 1994 },
  { qid: 'Q123593996', nameHe: 'כפיר צפריר', nameEn: 'Kfir Tsafrir', spotify: '7MKSeamhiRpa0xiS4FHGSC', type: 'solo', members: 1, gender: 'male', genre: 'hiphop', debut: 2020, breakthrough: 2020, born: 1990 },
  { qid: 'Q60529885', nameHe: 'דודו פארוק', nameEn: 'Dudu Faruk', spotify: '0PWRQodP2EvmBFpgyKUNc6', type: 'solo', members: 1, gender: 'male', genre: 'hiphop', debut: 2017, breakthrough: 2017, born: 1996 },
  { qid: 'Q96180163', nameHe: 'אלה לי', nameEn: 'Ella Lee', spotify: '0wVxjQGYkyNh5qQsVCZWlo', type: 'solo', members: 1, gender: 'female', genre: 'pop', debut: 2020, breakthrough: 2020, born: 2003, aliases: ['אלה לי להב'] },
  { qid: 'Q96152036', nameHe: 'אמיר ובן', nameEn: 'Amir Ve Ben', spotify: '6UReeaqNcjIfzIH13kTHKE', type: 'duo', members: 2, gender: 'male', genre: 'pop', debut: 2016, breakthrough: 2016, born: 2016 },
  // Asked for by the owner (Nov 3) and other well-known names that were missing.
  { qid: 'Q30526927', nameHe: 'איב אנד ליר', nameEn: 'Eve And Lear', spotify: '7rLIyZteTQHPhsqQN0Mcc1', type: 'duo', members: 2, gender: 'male', genre: 'mizrahi', debut: 2015, breakthrough: 2015, born: 2015, aliases: ['Eve & Lear', 'צחי ואלירון בוזגלו'] },
  { qid: 'Q25492125', nameHe: 'קוקי לבנה', nameEn: 'Cookie Levanna', spotify: '39hTcjXHjg9XAGWO5ubNCD', type: 'band', members: 4, gender: 'male', genre: 'rock', debut: 2011, breakthrough: 2011, born: 2006 },
  { qid: 'Q130380731', nameHe: 'עומרי סבח', nameEn: 'Omri Sabach', spotify: '3Mfj0eEUcnEo0fGZ2MTkA1', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2010, breakthrough: 2010, born: 1990 },
  { qid: 'Q5404343', nameHe: 'אתניקס', nameEn: 'Ethnix', spotify: '0rcuq0mzUaleXgXxuLFPPZ', type: 'band', members: 6, gender: 'male', genre: 'pop', debut: 1989, breakthrough: 1989, born: 1985, aliases: ['אתניX'] },
  { qid: 'Q13577205', nameHe: 'כנסיית השכל', nameEn: 'Knesiyat Hasechel', spotify: '16MkPn5NwSOt7xc4OqjOHp', type: 'band', members: 5, gender: 'male', genre: 'rock', debut: 1992, breakthrough: 1992, born: 1990 },
  { qid: 'Q7013436', nameHe: 'קובי אפללו', nameEn: 'Kobi Aflalo', spotify: '0xYY2tRJGTvQC6rPjk758w', type: 'solo', members: 1, gender: 'male', genre: 'rock', debut: 2007, breakthrough: 2007, born: 1976 },
  { qid: 'Q16133125', nameHe: 'עופר לוי', nameEn: 'Ofer Levi', spotify: '28G94gtkEJysBQoAUOdc0U', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 1986, breakthrough: 1990, born: 1964 },
  { qid: 'Q27990275', nameHe: 'מידד טסה', nameEn: 'Meydad Tasa', spotify: '3UJvSl87KCeQdagMKQ4zMZ', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 2006, breakthrough: 2006, born: 1993 },
  { qid: 'Q12404626', nameHe: 'בנזין', nameEn: 'Benzin', spotify: '5uiUKEGHCKUuHeyIIssGq4', type: 'band', members: 4, gender: 'male', genre: 'rock', debut: 1982, breakthrough: 1982, born: 1982 },
  { qid: 'Q20677096', nameHe: 'איציק קלה', nameEn: 'Itzik Kala', spotify: '76BvfDVhLQR66ZCGaYNDHM', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 1971, breakthrough: 1978, born: 1953 },
  { qid: 'Q2893357', nameHe: 'שימי תבורי', nameEn: 'Shimi Tavori', spotify: '4Uzm4t6wAufWqKP7ZgYLxF', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 1969, breakthrough: 1976, born: 1953 },
  // Asked for by the owner (Nov 3, second list) plus known names below the
  // listener floor that players still recognise.
  { qid: 'Q30526888', nameHe: 'פול טראנק', nameEn: 'Full Trunk', spotify: '1CD5WWtF6AFUq6BTY20I4k', type: 'band', members: 4, gender: 'male', genre: 'rock', debut: 2014, breakthrough: 2014, born: 2010, aliases: ['Full Trunk', 'גל ניסמן'] },
  { qid: 'Q30527146', nameHe: 'אביהו פנחסוב', nameEn: 'Avihu Pinhasov Rhythm Club', spotify: '4saB5ta3MrhGC4aYV0zF2r', type: 'band', members: 8, gender: 'male', genre: 'mizrahi', debut: 2015, breakthrough: 2015, born: 2012, aliases: ['מועדון הקצב של אביהו פנחסוב', 'Avihu Pinhasov'] },
  { qid: 'Q6984186', nameHe: 'אבי ביטר', nameEn: 'Avi Biter', spotify: '0ELP9dJqtW5kHzE6wMM7cF', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 1988, breakthrough: 1988, born: 1965 },
  { qid: 'Q536600', nameHe: 'שי גבסו', nameEn: 'Shay Gabso', spotify: '018HTJ9Cu6WXLAHEbUpU6r', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2003, breakthrough: 2003, born: 1984 },
  { qid: 'Q4522997', nameHe: 'אלישע בנאי', nameEn: 'Elisha Banai', spotify: '0Bm0XFIxlatSU7sjwwxrgV', type: 'solo', members: 1, gender: 'male', genre: 'rock', debut: 2010, breakthrough: 2012, born: 1988 },
  { qid: 'Q1825089', nameHe: 'חן אהרוני', nameEn: 'Chen Aharoni', spotify: '29RlGBlQk9j3MJF3uOMgoc', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2007, breakthrough: 2007, born: 1990 },
  { qid: 'Q115821275', nameHe: 'שירה מרגלית', nameEn: 'Shira Margalit', spotify: '3fuBh15tUjQVjzVZ3u73rz', type: 'solo', members: 1, gender: 'female', genre: 'pop', debut: 2017, breakthrough: 2017, born: 1994 },
  { qid: 'Q124363180', nameHe: 'אלין גולן', nameEn: 'Alin Golan', spotify: '0e2paefwT1ZqF2uvVq8Ldv', type: 'solo', members: 1, gender: 'female', genre: 'pop', debut: 2016, breakthrough: 2016, born: 2006 },
  { qid: 'Q29609198', nameHe: 'ניב דמירל', nameEn: 'Niv Demirel', spotify: '1ecWGP0ecxDqri9Tt3KJ7p', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2017, breakthrough: 2017, born: 1995 },
  { qid: 'Q132673778', nameHe: 'נופיה', nameEn: 'Nofia', spotify: '0rHxmqmqlCy0dQs0UqRq9q', type: 'solo', members: 1, gender: 'female', genre: 'pop', debut: 2022, breakthrough: 2022, born: 2000, aliases: ['נופיה ידידיה'] },
  { qid: 'Q114073813', nameHe: 'אליאב זוהר', nameEn: 'Eliav Zohar', spotify: '5hwdfRqm0A7u9z3LoTazVa', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2022, breakthrough: 2022, born: 2000 },
  { qid: 'Q122616083', nameHe: 'עטרה אוריה', nameEn: 'Atara Oria', spotify: '2B5CIVuJLzMYbtw6ViL85R', type: 'solo', members: 1, gender: 'female', genre: 'pop', debut: 2023, breakthrough: 2023, born: 1996 },
  { qid: 'Q67153673', nameHe: 'עדן דרסו', nameEn: 'Eden Derso', spotify: '7sG6GYc2AsX0HNOkVdGCO4', type: 'solo', members: 1, gender: 'female', genre: 'hiphop', debut: 2017, breakthrough: 2017, born: 1998 },
  { qid: 'Q6609112', nameHe: 'איציק שמלי', nameEn: 'Itzik Shamli', spotify: '3tZUy5tRdzX8UTNKQdUzbN', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 2002, breakthrough: 2002, born: 1980 },
  { qid: 'Q123594226', nameHe: 'מאור אשכנזי', nameEn: 'Maor Ashkenazi', spotify: '3iLqGRLvJTTS4KRx38j6et', type: 'solo', members: 1, gender: 'male', genre: 'hiphop', debut: 2018, breakthrough: 2018, born: 2000 },
  // Nov 5: 55 more artists from the Spotify Israel daily charts and well-known
  // names, each checked against Hebrew Wikipedia (birth year / career start).
  { qid: 'Q56605010', nameHe: 'יוסי שטרית', nameEn: 'Yossi Shitrit', spotify: '77UEAwv9U6K7AVecZYKirm', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 2016, breakthrough: 2016, born: 1997 },
  { qid: 'Q8071869', nameHe: 'זקני צפת', nameEn: 'Zikney Tzfat', spotify: '3M6YnfPlWWwWu0CZR33AIX', type: 'band', members: 4, gender: 'male', genre: 'rock', debut: 1990, breakthrough: 1990, born: 1990 },
  { qid: 'Q5554897', nameHe: 'גבע אלון', nameEn: 'Geva Alon', spotify: '1kW6jqgrymK0l58M3OqVMz', type: 'solo', members: 1, gender: 'male', genre: 'rock', debut: 1999, breakthrough: 1999, born: 1979 },
  { qid: 'Q25490320', nameHe: 'קפה שחור חזק', nameEn: 'Cafe Shahor Hazak', spotify: '0Og1wgYSLSQMsAiJi831Lj', type: 'duo', members: 2, gender: 'male', genre: 'hiphop', debut: 2006, breakthrough: 2006, born: 2006 },
  { qid: 'Q20034314', nameHe: 'גיא מזיג', nameEn: 'Guy Mazig', spotify: '2Ky0L9EAz66AEhFfeak23R', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 1999, breakthrough: 1999, born: 1978 },
  { qid: 'Q7378651', nameHe: 'רוחמה רז', nameEn: 'Ruchama Raz', spotify: '0kxMDgFDfRYyqs91HfrXIk', type: 'solo', members: 1, gender: 'female', genre: 'folk-israeli', debut: 1968, breakthrough: 1968, born: 1955 },
  { qid: 'Q7106608', nameHe: 'אושיק לוי', nameEn: 'Oshik Levi', spotify: '3tjoGZmGJVn69uCacptnWh', type: 'solo', members: 1, gender: 'male', genre: 'folk-israeli', debut: 1960, breakthrough: 1960, born: 1944 },
  { qid: 'Q5312088', nameHe: 'דודו אלהרר', nameEn: 'Dudu Elharar', spotify: '3ELOubnH7PInJmLhjlwK7n', type: 'solo', members: 1, gender: 'male', genre: 'folk-israeli', debut: 1966, breakthrough: 1966, born: 1945 },
  { qid: 'Q16131969', nameHe: 'גיא ויהל', nameEn: 'Guy & Yahel', spotify: '6W1YDSxykCcYNvuViqUlBv', type: 'duo', members: 2, gender: 'male', genre: 'pop', debut: 2011, breakthrough: 2011, born: 2011 },
  { qid: 'Q12408281', nameHe: 'יצחק קלפטר', nameEn: 'Itzhak Klepter', spotify: '5RgilsTbpogtECkhDgcOZh', type: 'solo', members: 1, gender: 'male', genre: 'rock', debut: 1966, breakthrough: 1966, born: 1950 },
  { qid: 'Q12405778', nameHe: 'דורית ראובני', nameEn: 'Dorit Reuveni', spotify: '1C0v00zfutIDcsVm4ZOJPO', type: 'solo', members: 1, gender: 'female', genre: 'folk-israeli', debut: 1969, breakthrough: 1969, born: 1952 },
  { qid: 'Q110822290', nameHe: 'מיכאל בן דוד', nameEn: 'Michael Ben David', spotify: '3ZOg74Rm98FXI86cSo0nIk', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2022, breakthrough: 2022, born: 1996 },
  { qid: 'Q42103808', nameHe: 'שקד קוממי', nameEn: 'Shaked Komemy', spotify: '04cVWLqEvM1oSZLhqs85K4', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 2012, breakthrough: 2012, born: 1991 },
  { qid: 'Q19201040', nameHe: 'שי צברי', nameEn: 'Shai Tsabari', spotify: '0T0COcAFHD9oZ704HbZr2A', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 2001, breakthrough: 2001, born: 1974 },
  { qid: 'Q2911580', nameHe: 'החלונות הגבוהים', nameEn: 'The High Windows', spotify: '74eDbuHo0vzUvayOnck5eh', type: 'band', members: 3, gender: 'mixed', genre: 'rock', debut: 1966, breakthrough: 1966, born: 1966 },
  { qid: 'Q60226219', nameHe: 'נופר סלמאן', nameEn: 'Nofar Salman', spotify: '3E6brPWNbeukI8w10ugzOx', type: 'solo', members: 1, gender: 'female', genre: 'pop', debut: 2015, breakthrough: 2015, born: 1998 },
  { qid: 'Q65620015', nameHe: 'טדי נגוסה', nameEn: 'Teddy Neguse', spotify: '1SOCXWLgBvXDqNobiSnGM7', type: 'solo', members: 1, gender: 'male', genre: 'hiphop', debut: 2016, breakthrough: 2016, born: 1995 },
  { qid: 'Q12411557', nameHe: 'שולה חן', nameEn: 'Shula Chen', spotify: '3wEOTP32nLxZcXuGJPA1Vl', type: 'solo', members: 1, gender: 'female', genre: 'folk-israeli', debut: 1965, breakthrough: 1965, born: 1947 },
  { qid: 'Q61711466', nameHe: 'קובי מרימי', nameEn: 'Kobi Marimi', spotify: '6476rpTPwbBtEubZWNyDBR', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2019, breakthrough: 2019, born: 1991 },
  { qid: 'Q7027242', nameHe: 'רגב הוד', nameEn: 'Regev Hod', spotify: '0Fhli3d4ykenPL9cA8RYay', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 1996, breakthrough: 1996, born: 1980 },
  { qid: 'Q1266365', nameHe: 'אורנה ומשה דץ', nameEn: 'Orna & Moshe Datz', spotify: '5GDVJO8maGeYi0mLt32QvM', type: 'duo', members: 2, gender: 'mixed', genre: 'pop', debut: 1985, breakthrough: 1985, born: 1985 },
  { qid: 'Q7338960', nameHe: 'רבקה זהר', nameEn: 'Rivka Zohar', spotify: '5ctTSlA3JZKProh0uSzTa8', type: 'solo', members: 1, gender: 'female', genre: 'pop', debut: 1966, breakthrough: 1966, born: 1948 },
  { qid: 'Q98590377', nameHe: 'תמיר בר', nameEn: 'Tamir Bar', spotify: '1UpRHyPDQSJ3qKmRb45d1L', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2015, breakthrough: 2015, born: 1986 },
  { qid: 'Q67307311', nameHe: 'טל טירנגל', nameEn: 'Tal Tirangel', spotify: '0blGw2n2pKoYT6x8wSFvNy', type: 'solo', members: 1, gender: 'male', genre: 'hiphop', debut: 2010, breakthrough: 2010, born: 1984 },
  { qid: 'Q66041206', nameHe: 'צוקוש', nameEn: 'Tzukush', spotify: '0jYSahOLG4qqGLfKGpNCz8', type: 'solo', members: 1, gender: 'male', genre: 'hiphop', debut: 2016, breakthrough: 2016, born: 1995 },
  { qid: 'Q139585963', nameHe: 'אנדרדוג', nameEn: 'Underdog', spotify: '6znqejxfvDmjHwqhVKsAyg', type: 'solo', members: 1, gender: 'male', genre: 'hiphop', debut: 2016, breakthrough: 2016, born: 1994 },
  { qid: 'Q6915489', nameHe: 'סגיב כהן', nameEn: 'Sagiv Cohen', spotify: '4Kgi5dpoYaM4RZXDMZLhkb', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 2001, breakthrough: 2001, born: 1975 },
  { qid: 'Q6864776', nameHe: 'אבנר גדסי', nameEn: 'Avner Gadasi', spotify: '2Eij3bHbG52JBSEqXSwga3', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 1970, breakthrough: 1970, born: 1952 },
  { qid: 'Q16133082', nameHe: 'החצר האחורית', nameEn: 'The Backyard', spotify: '52m4avwDcrat4zSI2UljXB', type: 'band', members: 4, gender: 'male', genre: 'rock', debut: 2013, breakthrough: 2013, born: 2013 },
  { qid: 'Q2905704', nameHe: 'אהרן רזאל', nameEn: 'Aaron Razel', spotify: '2RqSKsuk1Nv2drLcQd0HT0', type: 'solo', members: 1, gender: 'male', genre: 'religious-pop', debut: 1997, breakthrough: 1997, born: 1974 },
  { qid: 'Q4790616', nameHe: 'אריק לביא', nameEn: 'Arik Lavie', spotify: '0Upqi9ESPwxVOGFQ287ors', type: 'solo', members: 1, gender: 'male', genre: 'folk-israeli', debut: 1946, breakthrough: 1946, born: 1927, died: 2004 },
  { qid: 'Q270374', nameHe: 'אסתר עופרים', nameEn: 'Esther Ofarim', spotify: '0G8JL8AMaRc50OwZz7YsFE', type: 'solo', members: 1, gender: 'female', genre: 'folk-israeli', debut: 1954, breakthrough: 1954, born: 1941 },
  { qid: 'Q579498', nameHe: 'יפה ירקוני', nameEn: 'Yaffa Yarkoni', spotify: '76pEKLfsS529BIAOR3xBKD', type: 'solo', members: 1, gender: 'female', genre: 'folk-israeli', debut: 1933, breakthrough: 1933, born: 1925, died: 2012 },
  { qid: 'Q1174277', nameHe: 'דוד ד\'אור', nameEn: 'David D\'Or', spotify: '0XfCgx3ePED141a3TsQbVz', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 1975, breakthrough: 1975, born: 1965 },
  { qid: 'Q77658', nameHe: 'פבלו רוזנברג', nameEn: 'Pablo Rosenberg', spotify: '1fgztbZ7IPnchuO4vdTuri', type: 'solo', members: 1, gender: 'male', genre: 'rock', debut: 1980, breakthrough: 1980, born: 1965 },
  { qid: 'Q12410384', nameHe: 'עמיר לב', nameEn: 'Amir Lev', spotify: '405W8bax1d6ErtkwTg6siH', type: 'solo', members: 1, gender: 'male', genre: 'rock', debut: 1989, breakthrough: 1989, born: 1962 },
  { qid: 'Q12410459', nameHe: 'ערן צור', nameEn: 'Eran Tzur', spotify: '55Jd6KSpdVaT4A7cMQXdYY', type: 'solo', members: 1, gender: 'male', genre: 'rock', debut: 1986, breakthrough: 1986, born: 1965 },
  { qid: 'Q12403901', nameHe: 'אלון אולארצ\'יק', nameEn: 'Alon Oleartchik', spotify: '7oXPj4DkjAxME8ExDAfwJP', type: 'solo', members: 1, gender: 'male', genre: 'rock', debut: 1968, breakthrough: 1968, born: 1950 },
  { qid: 'Q17045328', nameHe: 'יהלי סובול', nameEn: 'Yali Sobol', spotify: '3cPFiAwdwlzCq7gBVIlBfa', type: 'solo', members: 1, gender: 'male', genre: 'rock', debut: 1995, breakthrough: 1995, born: 1972 },
  { qid: 'Q17505305', nameHe: 'סיון טלמור', nameEn: 'Sivan Talmor', spotify: '4OuNFhB4UqOVluGG75fiWd', type: 'solo', members: 1, gender: 'female', genre: 'pop', debut: 1998, breakthrough: 1998, born: 1986 },
  { qid: 'Q201204', nameHe: 'דנה אינטרנשיונל', nameEn: 'Dana International', spotify: '03IVYRlAC972SOHPb86Usr', type: 'solo', members: 1, gender: 'female', genre: 'pop', debut: 1992, breakthrough: 1992, born: 1969 },
  { qid: 'Q124813035', nameHe: 'מיקה משה', nameEn: 'Mika Moshe', spotify: '2TbLxamjJeEArYTdwdpvC6', type: 'solo', members: 1, gender: 'female', genre: 'pop', debut: 2020, breakthrough: 2020, born: 2007 },
  { qid: 'Q2905481', nameHe: 'עידן יניב', nameEn: 'Idan Yaniv', spotify: '7oni2LL8WaTD7NcAX4sD9t', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 1998, breakthrough: 1998, born: 1986 },
  { qid: 'Q6837137', nameHe: 'אלי לוזון', nameEn: 'Eli Luzon', spotify: '3TMkdyWxU7U3ARqkHntS8P', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 1979, breakthrough: 1979, born: 1966 },
  { qid: 'Q319142', nameHe: 'בועז מעודה', nameEn: 'Boaz Mauda', spotify: '2AnuAAz9zLa1l71EyYxOqB', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2007, breakthrough: 2007, born: 1987 },
  { qid: 'Q6842966', nameHe: 'בן סנוף', nameEn: 'Ben Snof', spotify: '1k8sIESDVitP38QJAjAtHf', type: 'solo', members: 1, gender: 'male', genre: 'religious-pop', debut: 1993, breakthrough: 1993, born: 1986 },
  { qid: 'Q12411952', nameHe: 'ששי קשת', nameEn: 'Sassi Keshet', spotify: '0mRZBJzO69F835eotg9sJK', type: 'solo', members: 1, gender: 'male', genre: 'folk-israeli', debut: 1966, breakthrough: 1966, born: 1946 },
  { qid: 'Q4734336', nameHe: 'אלון דה לוקו', nameEn: 'Alon De Loco', spotify: '1zW6ryC9mUyqvSOu0IFrvP', type: 'solo', members: 1, gender: 'male', genre: 'hiphop', debut: 2005, breakthrough: 2005, born: 1974 },
  { qid: 'Q3701528', nameHe: 'דני ליטני', nameEn: 'Danny Litani', spotify: '5VibPvaM4debC46CEWd6yv', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 1960, breakthrough: 1960, born: 1943 },
  { qid: 'Q33179362', nameHe: 'אביאור מלסה', nameEn: 'Avior Malasa', spotify: '68Ke9ZS9HaflKmoddMeZHc', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 2016, breakthrough: 2016, born: 1995 },
  { qid: 'Q27231692', nameHe: 'עדי ביטי', nameEn: 'Adi Bity', spotify: '6wmkSxRAKlQl86DzjXRUMh', type: 'solo', members: 1, gender: 'female', genre: 'pop', debut: 2014, breakthrough: 2014, born: 2001 },
  { qid: 'Q3431891', nameHe: 'ריף כהן', nameEn: 'Riff Cohen', spotify: '3yKO4z2CeXv9sxD1zSw0Sg', type: 'solo', members: 1, gender: 'female', genre: 'indie-alt', debut: 2012, breakthrough: 2012, born: 1984 },
  { qid: 'Q24576294', nameHe: 'עוזיה צדוק', nameEn: 'Uziya Tzadok', spotify: '4oj3UzQdheKhYevdMIkNGO', type: 'solo', members: 1, gender: 'male', genre: 'religious-pop', debut: 2015, breakthrough: 2015, born: 2002 },
  { qid: 'Q7049007', nameHe: 'יעל דקלבאום', nameEn: 'Yael Deckelbaum', spotify: '1mDm3a7s9MFggKUShPdKpj', type: 'solo', members: 1, gender: 'female', genre: 'indie-alt', debut: 1995, breakthrough: 1995, born: 1979 },
  { qid: 'Q12404809', nameHe: 'ג\'קי מקייטן', nameEn: 'Jacky Makayten', spotify: '4EBpGXacIAmRFpcQ3qZ01e', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 1980, breakthrough: 1980, born: 1955, died: 2012 },
  { qid: 'Q7222341', nameHe: 'שחר אבן צור', nameEn: 'Shahar Even Tzur', spotify: '6G6Py0ET2H4GQnRqQ6AuQN', type: 'solo', members: 1, gender: 'male', genre: 'rock', debut: 1995, breakthrough: 1995, born: 1972 },
  { qid: 'Q12407544', nameHe: 'חמי רודנר', nameEn: 'Hemi Rudner', spotify: '73Cuv6pUbmERHKWEGD4ffj', type: 'solo', members: 1, gender: 'male', genre: 'rock', debut: 1985, breakthrough: 1993, born: 1964 },
  { qid: 'Q97683152', nameHe: 'ליהי טולדנו', nameEn: 'Lihi Toledano', spotify: '1zFuOvKD7y6cnjH5RJ0Prx', type: 'solo', members: 1, gender: 'female', genre: 'pop', debut: 2018, breakthrough: 2018, born: 2002 },
  { qid: 'Q113584465', nameHe: 'שאזאמאט', nameEn: 'Shazamat', spotify: '0uo5SLiIan9YDCQWy20wyV', type: 'band', members: 7, gender: 'male', genre: 'hiphop', debut: 2017, breakthrough: 2019, born: 2017, aliases: ['שאזאמט'] },
  { qid: 'Q5636861', nameHe: 'הבילויים', nameEn: 'Habiluim', spotify: '0UsbPF0Mx5Y6mWwMEWihWN', type: 'band', members: 4, gender: 'mixed', genre: 'rock', debut: 1996, breakthrough: 2003, born: 1996 },
  { qid: 'Q16128770', nameHe: 'המכשפות', nameEn: 'The Witches', spotify: '7qtubK9xEI56XRpNfSbrdO', type: 'band', members: 3, gender: 'female', genre: 'rock', debut: 1992, breakthrough: 1994, born: 1992 },
  { qid: 'Q24841631', nameHe: 'איציק דדיה', nameEn: 'Itzik Dadya', spotify: '70287pcNpILjcpoBl0soPs', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 2002, breakthrough: 2002, born: 1993 },
  { qid: 'Q238719', nameHe: 'נעמי שמר', nameEn: 'Naomi Shemer', spotify: '4V6wf2ynZAUYlG8WnyQrIz', type: 'solo', members: 1, gender: 'female', genre: 'folk-israeli', debut: 1951, breakthrough: 1951, born: 1930, died: 2004 },
  { qid: 'Q433246', nameHe: 'דנה ברגר', nameEn: 'Dana Berger', spotify: '7Ajb0nIvHDMuwppUJouvFH', type: 'solo', members: 1, gender: 'female', genre: 'pop', debut: 1987, breakthrough: 1990, born: 1970 },
  { qid: 'Q2360762', nameHe: 'שושנה דמארי', nameEn: 'Shoshana Damari', spotify: '74d511JBN1RXijrUZtCqlq', type: 'solo', members: 1, gender: 'female', genre: 'folk-israeli', debut: 1936, breakthrough: 1936, born: 1923, died: 2006 },
  { qid: 'Q12406902', nameHe: 'הפרברים', nameEn: 'HaParvarim', spotify: '2LOJIQPpWqcbbCFKb1FFHT', type: 'band', members: 2, gender: 'male', genre: 'folk-israeli', debut: 1960, breakthrough: 1960, born: 1960 },
  { qid: 'Q5209968', nameHe: 'דקלון', nameEn: 'Daklon', spotify: '0bTYoIetJJchsvROUsC3TD', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 1950, breakthrough: 1950, born: 1944 },
  { qid: 'Q460148', nameHe: 'יזהר כהן', nameEn: 'Izhar Cohen', spotify: '32IVrcvpLGzEikbSdCK85a', type: 'solo', members: 1, gender: 'male', genre: 'pop', debut: 1969, breakthrough: 1969, born: 1951 },
  { qid: 'Q64775156', nameHe: 'עדן אלנה', nameEn: 'Eden Alene', spotify: '3E7T8t0FwjEVxg9jufWZQG', type: 'solo', members: 1, gender: 'female', genre: 'pop', debut: 2017, breakthrough: 2017, born: 2000 },
  { qid: 'Q6976150', nameHe: 'אילן וירצברג', nameEn: 'Ilan Virtzberg', spotify: '2WKxCQrt9JiAL7gQRebT1W', type: 'solo', members: 1, gender: 'male', genre: 'rock', debut: 1971, breakthrough: 1971, born: 1951 },
  { qid: 'Q926040', nameHe: 'חלב ודבש', nameEn: 'Milk and Honey', spotify: '1Lo6MZvxle35h8Qu6oD0Xn', type: 'band', members: 4, gender: 'mixed', genre: 'pop', debut: 1979, breakthrough: 1979, born: 1979 },
  { qid: 'Q8072524', nameHe: 'ציון גולן', nameEn: 'Zion Golan', spotify: '3CZPOR06sMMvYVWnQX171K', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 1971, breakthrough: 1971, born: 1955 },
  { qid: 'Q2078758', nameHe: 'מאיה בוסקילה', nameEn: 'Maya Buskila', spotify: '4UnEeDqvDJudbJcn6GYSlS', type: 'solo', members: 1, gender: 'female', genre: 'pop', debut: 2003, breakthrough: 2003, born: 1977 },
  { qid: 'Q27020042', nameHe: 'שריף', nameEn: 'Sharif', spotify: '5ohA6EGbNVotSDuR07EGdS', type: 'solo', members: 1, gender: 'male', genre: 'mizrahi', debut: 1992, breakthrough: 1992, born: 1979, aliases: ['מייק שריף'] },
  { qid: 'Q105811980', nameHe: 'נועם קלינשטיין', nameEn: 'Noam Kleinstein', spotify: '0fApsdhIzCLZQh7hZShlqV', type: 'solo', members: 1, gender: 'female', genre: 'pop', debut: 2019, breakthrough: 2019, born: 2001, aliases: ['נועם קליינשטיין'] },
  { qid: 'Q12405841', nameHe: 'דן תורן', nameEn: 'Dan Toren', spotify: '285uARLcuYJ5SqmbGnJuRl', type: 'solo', members: 1, gender: 'male', genre: 'rock', debut: 1979, breakthrough: 1979, born: 1960, died: 2024 },
  { qid: 'Q125634912', nameHe: 'השמחות', nameEn: 'Hasmachot', spotify: '7lwWNLsfAlgQBtHFFZdXjP', type: 'band', members: 6, gender: 'male', genre: 'rock', debut: 1996, breakthrough: 1998, born: 1996 },
  { qid: 'Q61126341', nameHe: 'האחים צברי', nameEn: 'The Zabari Brothers', spotify: '0ZGlz6T4yzJWtwYISiglZ0', type: 'band', members: 2, gender: 'male', genre: 'rock', debut: 2013, breakthrough: 2013, born: 2013 },
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

// Artists Lili removed from the game. The nightly build drops them even if
// Wikidata/Spotify would otherwise rank them into the pool.
export const EXCLUDED_QIDS: ReadonlySet<string> = new Set([
  'Q113903728', // נמואל
  'Q12407566', // חנן יובל
  'Q42306376', // מוטי שטיינמץ
  'Q6950519', // חיים ישראל
  'Q116692489', // מאי ספדיה
])

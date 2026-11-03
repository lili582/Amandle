import type { Artist, Genre } from '../types'

// Hand-checked genre for artists whose Wikidata genre (or the occupation
// guess) doesn't match how Israeli listeners would describe them.
// Keyed by Wikidata QID; the Hebrew name is only a reminder.
// Applied in the nightly build (buildArtists) and again on the client to the
// deployed pool.json, so a fix takes effect without waiting for a rebuild.
// To fix another artist: add a line here.
export const GENRE_OVERRIDES: Readonly<Record<string, Genre>> = {
  Q118195754: 'pop', // ליעד מאיר (was hiphop)
  Q1772804: 'pop', // עידן רייכל (was folk-israeli)
  Q85692890: 'pop', // יסמין מועלם (was hiphop)
  Q2911752: 'religious-pop', // שולי רנד (was pop)
  Q43139030: 'pop', // נועה קירל (was hiphop)
  Q18147844: 'religious-pop', // ישי ריבו (was rock)
  Q7038982: 'rock', // אמיר דדון (was jazz-soul)
  Q6969364: 'mizrahi', // לירן דנינו (was jazz-soul)
  Q29512717: 'pop', // עקיבא (was jazz-soul)
  Q6730003: 'pop', // עידן רפאל חביב (was folk-israeli)
  Q6583345: 'pop', // נתן גושן (was rock)
  Q58008542: 'pop', // בניה ברבי (was mizrahi)
  Q110887946: 'mizrahi', // אבי אבורומי (was ethnic-world)
  Q1494846: 'mizrahi', // ליאור נרקיס (was pop)
  Q19894291: 'mizrahi', // נסרין קדרי (was mediterranean)
  Q4790480: 'rock', // אריאל זילבר (was hiphop)
  Q731076: 'rock', // דויד ברוזה (was pop)
  Q298205: 'pop', // ריטה (was rock)
  Q6741400: 'pop', // אליעד נחום (was electronic)
  Q349662: 'mizrahi', // שלומי שבת (was pop)
  Q2920263: 'mizrahi', // עמיר בניון (was jazz-soul)
  Q108669027: 'pop', // יאיר אליצור (was hiphop)
  Q5220776: 'rock', // דני רובס (was pop)
  Q2898233: 'pop', // רוני דלומי (was rock)
  Q12405808: 'mizrahi', // דיקלה (was pop)
  Q7029966: 'rock', // מרסדס בנד (was jazz-soul)
  Q47402082: 'mizrahi', // סטפן לגר (was hiphop)
  Q2910872: 'pop', // מתי כספי (was jazz-soul)
  Q66828275: 'mizrahi', // שחר סאול (was hiphop)
  Q66990446: 'indie-alt', // עטר מיינר (was jazz-soul)
  Q2911185: 'rock', // יהודה פוליקר (was pop)
  Q16130041: 'pop', // שלומי שבן (was rock)
  Q7070133: 'pop', // נורית גלרון (was rock)
  Q2915715: 'folk-israeli', // עוזי חיטמן (was rock)
  Q2091045: 'folk-israeli', // יהורם גאון (was pop)
  Q16129085: 'pop', // יגאל בשן (was rock)
  Q7499585: 'pop', // שלמה גרוניך (was rock)
  Q65666034: 'pop', // חן פורתי (was hiphop)
  Q2910959: 'indie-alt', // רונה קינן (was rock)
  Q40856678: 'electronic', // נגה ארז (was hiphop)
  Q182083: 'pop', // אפרת גוש (was hiphop)
  Q467369: 'pop', // אתי אנקרי (was rock)
}

// Returns the artist with the curated genre as primary. The genre it
// replaces moves into secondaryGenres.
export function applyGenreOverride<T extends Pick<Artist, 'id' | 'primaryGenre' | 'secondaryGenres'>>(a: T): T {
  const g = GENRE_OVERRIDES[a.id]
  if (!g || g === a.primaryGenre) return a
  const rest = [a.primaryGenre, ...(a.secondaryGenres ?? [])].filter((x) => x !== g)
  return { ...a, primaryGenre: g, secondaryGenres: [...new Set(rest)].slice(0, 2) }
}

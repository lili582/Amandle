import { describe, it, expect } from 'vitest'
import { buildArtists, displayName, fetchArtistPool, groupGender, mapGenreLabel, POOL_QUERY } from '../../src/sources/wikidata'

const ENTITY = 'http://www.wikidata.org/entity/'
type Row = Record<string, string>
const toBindings = (rows: Row[]) =>
  rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { value: v }])))

const ROWS: Row[] = [
  { item: `${ENTITY}Q1`, heTitle: 'סקאזי', kinds: 'human', genres: 'electronic music|hip hop', sex: 'male', en: 'Skazi', workStart: '1998-01-01T00:00:00Z', birth: '1975-01-01T00:00:00Z', sitelinks: '40', deezer: '12345', mbid: 'mb-1', members: '0', memberSexes: '' },
  { item: `${ENTITY}Q2`, heTitle: 'טיפקס (להקה)', kinds: 'rock band', genres: 'rock music', en: 'Teapacks', inception: '1988-01-01T00:00:00Z', sitelinks: '19', members: '5', memberSexes: 'female|male' },
  { item: `${ENTITY}Q3`, heTitle: 'צמד', kinds: 'musical duo', genres: 'pop music|Mizrahi music', sitelinks: '19', members: '0', memberSexes: '' },
  { item: `${ENTITY}Q4`, heTitle: 'סרט', kinds: 'film', genres: 'pop music', sitelinks: '99' },
  { item: `${ENTITY}Q5`, heTitle: 'משורר', kinds: 'human', genres: 'poetry', sitelinks: '50' },
  { item: `${ENTITY}Q6`, heTitle: 'בלי שנה', kinds: 'human', genres: 'pop music', sitelinks: '5' },
]

describe('mapGenreLabel', () => {
  it('maps Wikidata labels, incl. reversed and suffixed forms', () => {
    expect(mapGenreLabel('pop music')).toBe('pop')
    expect(mapGenreLabel('Mizrahi music')).toBe('mizrahi')
    expect(mapGenreLabel('music of Israel')).toBe('folk-israeli')
    expect(mapGenreLabel('  ROCK MUSIC ')).toBe('rock')
  })
  it('rejects non-musical genres', () => {
    expect(mapGenreLabel('poetry')).toBeUndefined()
    expect(mapGenreLabel('documentary film')).toBeUndefined()
  })
})

describe('buildArtists', () => {
  const artists = buildArtists(toBindings(ROWS) as never, 2026)
  const byQ = (q: string) => artists.find((a) => a.ids.wikidata === q)

  it('keeps only people and musical groups with a music genre', () => {
    expect(artists.map((a) => a.ids.wikidata).sort()).toEqual(['Q1', 'Q2', 'Q3', 'Q6'])
  })

  it('reads a solo artist', () => {
    expect(byQ('Q1')).toMatchObject({
      id: 'Q1', nameHe: 'סקאזי', type: 'solo', members: 1, gender: 'male', debutYear: 1998,
      primaryGenre: 'hiphop', secondaryGenres: ['electronic'], birthYear: 1975,
      ids: { wikidata: 'Q1', deezer: 12345, musicbrainz: 'mb-1' },
    })
  })

  it('reads a band: display name, member count and gender from members', () => {
    expect(byQ('Q2')).toMatchObject({ nameHe: 'טיפקס', wikiTitle: 'טיפקס (להקה)', type: 'band', members: 5, gender: 'mixed', genderKnown: true, foundedYear: 1988 })
  })

  it('a duo is 2 members; specific genre wins over pop; unknown gender is flagged', () => {
    expect(byQ('Q3')).toMatchObject({ type: 'duo', members: 2, primaryGenre: 'mizrahi', genderKnown: false })
  })

  it('keeps artists with no start year (resolved later from MusicBrainz)', () => {
    expect(byQ('Q6')?.debutYear).toBe(0)
  })

  it('ranks by sitelinks with a QID tie-break and is reproducible', () => {
    expect(artists.map((a) => a.ids.wikidata)).toEqual(['Q1', 'Q2', 'Q3', 'Q6'])
    expect(buildArtists(toBindings([...ROWS].reverse()) as never, 2026).map((a) => a.id)).toEqual(artists.map((a) => a.id))
  })
})

describe('helpers', () => {
  it('strips the disambiguator from article titles', () => {
    expect(displayName('משינה (להקה)')).toBe('משינה')
    expect(displayName('ריטה')).toBe('ריטה')
  })
  it('group gender from members or kind', () => {
    expect(groupGender(['male', 'male'], [])).toBe('male')
    expect(groupGender([], ['girl group'])).toBe('female')
    expect(groupGender([], ['rock band'])).toBeUndefined()
  })
})

describe('fetchArtistPool', () => {
  it('sends the SPARQL query and retries a failed attempt', async () => {
    let calls = 0
    const fetchImpl = (async (url: string) => {
      calls++
      expect(url).toContain(encodeURIComponent(POOL_QUERY.slice(0, 40)))
      if (calls === 1) return { ok: false, status: 504 } as Response
      return { ok: true, json: async () => ({ results: { bindings: toBindings(ROWS) } }) } as Response
    }) as unknown as typeof fetch
    const artists = await fetchArtistPool({ fetchImpl })
    expect(calls).toBe(2)
    expect(artists).toHaveLength(4)
  })
})

describe('poolQuery / spotifyIdsByQid', () => {
  it('requires a Spotify id and lowers the sitelinks floor only for the nightly build', async () => {
    const { poolQuery, POOL_QUERY } = await import('../../src/sources/wikidata')
    expect(POOL_QUERY).not.toContain('P1902 ?sp .')
    expect(POOL_QUERY).toContain('FILTER(?sl >= 3)')
    const q = poolQuery({ minSitelinks: 1, requireSpotify: true })
    expect(q).toContain('?item wdt:P1902 ?sp .')
    expect(q).toContain('FILTER(?sl >= 1)')
  })
  it('collects every valid Spotify id per artist', async () => {
    const { spotifyIdsByQid } = await import('../../src/sources/wikidata')
    const id1 = '4wLXwxDeWQ8mtUIRPxGiD6'
    const id2 = '1Xyo4u8uXC1ZmMpatF05PJ'
    const m = spotifyIdsByQid([
      { item: { value: 'http://www.wikidata.org/entity/Q1' }, spotify: { value: `${id1}|bad id|${id2}` } },
      { item: { value: 'http://www.wikidata.org/entity/Q2' }, spotify: { value: '' } },
    ])
    expect(m.get('Q1')).toEqual([id1, id2])
    expect(m.has('Q2')).toBe(false)
  })
})

describe('Spotify build: artists without a Wikidata genre', () => {
  const row = (genres: string, occupations: string) => ({
    item: { value: 'http://www.wikidata.org/entity/Q68084854' },
    heTitle: { value: 'אושר כהן' },
    kinds: { value: 'human' },
    genres: { value: genres },
    occupations: { value: occupations },
    sitelinks: { value: '2' },
  })
  it('keeps them and infers a genre from occupation', async () => {
    const { buildArtists, inferGenre } = await import('../../src/sources/wikidata')
    expect(buildArtists([row('', 'singer')], 2026, true)[0].primaryGenre).toBe('pop')
    expect(buildArtists([row('', 'rapper|singer')], 2026, true)[0].primaryGenre).toBe('hiphop')
    expect(inferGenre(['disc jockey'])).toBe('electronic')
    expect(inferGenre(['hazzan'])).toBe('religious-pop')
  })
  it('the live pool still drops them', async () => {
    const { buildArtists } = await import('../../src/sources/wikidata')
    expect(() => buildArtists([row('', 'singer')], 2026)).toThrow()
  })
})

describe('nonHebrewQids', () => {
  it('flags artists whose listed languages exclude Hebrew, keeps unknown', async () => {
    const { nonHebrewQids } = await import('../../src/sources/wikidata')
    const r = (q: string, langs: string) => ({ item: { value: `http://www.wikidata.org/entity/${q}` }, langs: { value: langs } })
    const s = nonHebrewQids([r('Q1', 'de'), r('Q2', 'he|en'), r('Q3', ''), r('Q4', 'ru|en')])
    expect([...s].sort()).toEqual(['Q1', 'Q4'])
  })
})

describe('Spotify name search matching', () => {
  it('matches the Hebrew title or the English label exactly', async () => {
    const { matchesCandidate } = await import('../../src/sources/wikidata')
    const c = { qid: 'Q28053146', title: 'עדן בן זקן', en: 'Eden Ben Zaken', sitelinks: 3 }
    expect(matchesCandidate('Eden Ben Zaken', c)).toBe(true)
    expect(matchesCandidate('עדן בן זקן', c)).toBe(true)
    expect(matchesCandidate('Mor', c)).toBe(false)
    const band = { qid: 'Q1', title: 'טיפקס (להקה)', sitelinks: 3 }
    expect(matchesCandidate('טיפקס', band)).toBe(true)
  })
  it('targets exact items in qids mode', async () => {
    const { poolQuery } = await import('../../src/sources/wikidata')
    const q = poolQuery({ qids: ['Q1', 'Q2'] })
    expect(q).toContain('VALUES ?item { wd:Q1 wd:Q2 }')
    expect(q).not.toContain('wdt:P27 wd:Q801')
    expect(q).toContain('OPTIONAL { ?item wdt:P136')
  })
})

describe('hebrewSingerQids', () => {
  it('needs Hebrew among the languages, and a singing occupation for a solo artist', async () => {
    const { hebrewSingerQids } = await import('../../src/sources/wikidata')
    const r = (q: string, kinds: string, langs: string, occupations: string) => ({
      item: { value: `http://www.wikidata.org/entity/${q}` },
      kinds: { value: kinds },
      langs: { value: langs },
      occupations: { value: occupations },
    })
    const s = hebrewSingerQids([
      r('Q1', 'human', 'he|en', 'singer|actor'),
      r('Q2', 'human', 'en', 'singer'), // English only
      r('Q3', 'human', '', 'singer'), // no language listed
      r('Q4', 'human', 'he', 'disc jockey|record producer'), // not a singer
      r('Q5', 'human', 'he', 'rapper'),
      r('Q6', 'rock band', 'he', ''),
      r('Q7', 'rock band', 'en', ''),
    ])
    expect([...s].sort()).toEqual(['Q1', 'Q5', 'Q6'])
  })
})

describe('buildArtists genre hints', () => {
  it('uses a Hebrew Wikipedia category genre when Wikidata has none', () => {
    const row = {
      item: { value: 'http://www.wikidata.org/entity/Q5348891' },
      heTitle: { value: 'איפה הילד?' },
      kinds: { value: 'rock band' },
      sitelinks: { value: '3' },
    }
    const [a] = buildArtists([row], 2026, true, new Map([['Q5348891', 'rock' as const]]))
    expect(a.primaryGenre).toBe('rock')
    expect(a.nameHe).toBe('איפה הילד?')
    expect(a.type).toBe('band')
  })
})

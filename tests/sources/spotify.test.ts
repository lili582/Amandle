import { describe, it, expect, vi } from 'vitest'
import {
  parseCount,
  parseMonthlyListeners,
  fetchMonthlyListeners,
  rankBySpotify,
  parseTopCities,
  israelAudience,
  spotifyImageUrl,
} from '../../src/sources/spotify'
import { ANSWER_POOL_SIZE } from '../../src/config'
import { makeArtist } from '../fixtures'

describe('parseMonthlyListeners', () => {
  it('reads the Open Graph description', () => {
    const html = '<meta property="og:description" content="Artist · 1.2M monthly listeners.">'
    expect(parseMonthlyListeners(html)).toBe(1_200_000)
    expect(parseMonthlyListeners('Artist · 345.6K monthly listeners.')).toBe(345_600)
    expect(parseMonthlyListeners('Artist · 1,234 monthly listeners.')).toBe(1234)
    expect(parseMonthlyListeners('Artist · 87 monthly listeners.')).toBe(87)
  })
  it('prefers the exact embedded integer', () => {
    expect(parseMonthlyListeners('{"monthlyListeners":1234567} 1.2M monthly listeners')).toBe(1_234_567)
  })
  it('returns null when the page has no count', () => {
    expect(parseMonthlyListeners('<html><body>Spotify</body></html>')).toBeNull()
  })
  it('parses suffixes', () => {
    expect(parseCount('2.5', 'm')).toBe(2_500_000)
    expect(parseCount('x')).toBeNull()
  })
})

describe('fetchMonthlyListeners', () => {
  const ok = (body: string) => ({ ok: true, status: 200, headers: new Headers(), text: async () => body }) as Response
  it('retries after 429 and then parses', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, headers: new Headers({ 'retry-after': '1' }) } as Response)
      .mockResolvedValueOnce(ok('Artist · 10K monthly listeners.'))
    const sleep = vi.fn(async () => {})
    expect(await fetchMonthlyListeners('abc', { fetchImpl, sleep })).toBe(10_000)
    expect(sleep).toHaveBeenCalledWith(1000)
    expect(fetchImpl.mock.calls[0][0]).toBe('https://open.spotify.com/artist/abc')
  })
  it('gives up with null on 404', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404, headers: new Headers() } as Response)
    expect(await fetchMonthlyListeners('abc', { fetchImpl })).toBeNull()
  })
})

describe('rankBySpotify', () => {
  const a = makeArtist({ id: 'Q1', nameHe: 'א', ids: { wikidata: 'Q1' } })
  const b = makeArtist({ id: 'Q2', nameHe: 'ב', ids: { wikidata: 'Q2' } })
  const c = makeArtist({ id: 'Q3', nameHe: 'ג', ids: { wikidata: 'Q3' } })
  const d = makeArtist({ id: 'Q4', nameHe: 'ד', ids: { wikidata: 'Q4' } })
  const listeners = new Map([
    ['Q1', { id: 's1', listeners: 500 }],
    ['Q2', { id: 's2', listeners: 9000 }],
    ['Q3', { id: 's3', listeners: 0 }],
  ])

  it('ranks by monthly listeners and drops artists without any', () => {
    const pool = rankBySpotify([a, b, c, d], listeners)
    expect(pool.map((x) => x.id)).toEqual(['Q2', 'Q1'])
    expect(pool.map((x) => x.popularityRank)).toEqual([1, 2])
    expect(pool[0].ids.spotify).toBe('s2')
    expect(pool[0].metrics.spotifyListeners).toBe(9000)
  })

  it('caps the pool size and limits daily answers to the top of it', () => {
    const many = Array.from({ length: ANSWER_POOL_SIZE + 20 }, (_, i) =>
      makeArtist({ id: `Q${1000 + i}`, nameHe: `x${i}`, ids: { wikidata: `Q${1000 + i}` } }),
    )
    const m = new Map(many.map((x, i) => [x.id, { id: `s${i}`, listeners: 10_000 - i }]))
    const pool = rankBySpotify(many, m, ANSWER_POOL_SIZE + 10)
    expect(pool).toHaveLength(ANSWER_POOL_SIZE + 10)
    expect(pool.filter((x) => x.answerEligible)).toHaveLength(ANSWER_POOL_SIZE)
    expect(pool[ANSWER_POOL_SIZE].answerEligible).toBe(false)
  })
})

describe('parseMonthlyListeners on the rendered page', () => {
  it('prefers the exact figure over the rounded one', () => {
    expect(parseMonthlyListeners('Temper City\n31m monthly listeners\n30,984,889 monthly listeners')).toBe(30_984_889)
    expect(parseMonthlyListeners('835.9k monthly listeners')).toBe(835_900)
  })
})

describe('Israeli audience', () => {
  const omerAdam =
    'About\n1,207,186 monthly listeners\nTel Aviv, IL\n613,135 listeners\nPetah Tikva, IL\n127,067 listeners\n' +
    'Rishon LeTsiyyon, IL\n95,990 listeners\nRamat Gan, IL\n85,656 listeners\nJerusalem, IL\n81,550 listeners\n'
  const linet =
    'Istanbul, TR\n884,188 listeners\nAnkara, TR\n413,077 listeners\nIzmir, TR\n240,159 listeners\n' +
    'Bursa, TR\n161,427 listeners\nMersin, TR\n103,533 listeners'

  it('parses the top cities from the About card', () => {
    const cities = parseTopCities(omerAdam)
    expect(cities).toHaveLength(5)
    expect(cities[0]).toEqual({ city: 'Tel Aviv', country: 'IL', listeners: 613_135 })
  })

  it('counts only Israeli cities', () => {
    expect(israelAudience(1_207_186, parseTopCities(omerAdam))).toEqual({ listeners: 1_207_186, share: 1 })
    expect(israelAudience(3_007_968, parseTopCities(linet))).toEqual({ listeners: 0, share: 0 })
    const mixed = parseTopCities('Tel Aviv, IL\n300 listeners\nParis, FR\n100 listeners')
    expect(israelAudience(1000, mixed)).toEqual({ listeners: 750, share: 0.75 })
  })

  it('estimates the whole Israeli audience, not just the top five cities', () => {
    // עפרה חזה, Oct 2026: the old top-city sum (35,592) put her under the 40K floor.
    const ofra = parseTopCities(
      'Tel Aviv, IL\n32,117 listeners\nLondon, GB\n5,093 listeners\nLos Angeles, US\n3,643 listeners\n' +
        'New York City, US\n3,631 listeners\nPetah Tikva, IL\n3,475 listeners',
    )
    const est = israelAudience(347_720, ofra)
    expect(est.listeners).toBeGreaterThan(200_000)
    expect(est.share).toBeCloseTo(0.74, 2)
  })

  it('stores pictures on the canonical image host', () => {
    expect(spotifyImageUrl('https://image-cdn-ak.spotifycdn.com/image/ab67616100005174b04a09c32a3a18ba53690d4c')).toBe(
      'https://i.scdn.co/image/ab67616100005174b04a09c32a3a18ba53690d4c',
    )
    expect(spotifyImageUrl(undefined)).toBeNull()
  })

  it('assumes Israel when the page shows no cities', () => {
    expect(israelAudience(4200, [])).toEqual({ listeners: 4200, share: 1 })
  })

  it('ranks by monthly listeners, and keeps the Israeli estimate', () => {
    // נגה ארז: 864K monthly listeners, ~485K estimated in Israel, ranks above
    // an artist with 600K listeners who are all in Israel.
    const noga = makeArtist({ id: 'Q10', nameHe: 'נגה ארז', ids: { wikidata: 'Q10' } })
    const local = makeArtist({ id: 'Q11', nameHe: 'מקומי', ids: { wikidata: 'Q11' } })
    const ranked = rankBySpotify(
      [local, noga],
      new Map([
        ['Q10', { id: 'sn', listeners: 864_287, israelListeners: 485_327 }],
        ['Q11', { id: 'sl', listeners: 600_000, israelListeners: 600_000 }],
      ]),
    )
    expect(ranked.map((a) => a.id)).toEqual(['Q10', 'Q11'])
    expect(ranked[0].metrics.spotifyListeners).toBe(864_287)
    expect(ranked[0].metrics.spotifyListenersIL).toBe(485_327)
  })
})

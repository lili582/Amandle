import { describe, expect, it } from 'vitest'
import { CURATED_ARTISTS, curatedArtist, curatedFor, DEEZER_IDS, EXCLUDED_QIDS } from '../src/lib/curatedArtists'
import { isComplete } from '../src/lib/complete'
import { GENRE_RULES } from '../src/lib/genreRules'
import { applyEnrichment, fetchEnrichment } from '../src/lib/enrich'
import { makeArtist } from './fixtures'

const THIS_YEAR = 2026

describe('curated artists', () => {
  it('are complete, sane and unique', () => {
    const genres = new Set(Object.values(GENRE_RULES))
    const qids = new Set<string>()
    const spotify = new Set<string>()
    for (const c of CURATED_ARTISTS) {
      expect(qids.has(c.qid), c.nameHe).toBe(false)
      expect(spotify.has(c.spotify), c.nameHe).toBe(false)
      qids.add(c.qid)
      spotify.add(c.spotify)
      expect(c.spotify, c.nameHe).toMatch(/^[0-9A-Za-z]{22}$/)
      expect(genres.has(c.genre), c.nameHe).toBe(true)
      expect(c.breakthrough, c.nameHe).toBeGreaterThanOrEqual(c.debut)
      expect(c.debut, c.nameHe).toBeLessThanOrEqual(THIS_YEAR)
      if (c.type === 'solo') {
        expect(c.members).toBe(1)
        expect(c.debut - c.born, c.nameHe).toBeGreaterThanOrEqual(5)
      } else {
        expect(c.members, c.nameHe).toBeGreaterThanOrEqual(2)
        expect(c.debut, c.nameHe).toBeGreaterThanOrEqual(c.born)
      }
      const a = { ...curatedArtist(c), popularityRank: 1 }
      expect(isComplete(a, THIS_YEAR), c.nameHe).toBe(true)
    }
  })

  it('includes the artists players reported missing', () => {
    expect(curatedFor('Q5348891')?.nameHe).toBe('איפה הילד')
    expect(curatedFor('Q60951018')?.nameHe).toBe('מיכאל סוויסה')
  })

  it('never curates an excluded artist', () => {
    for (const c of CURATED_ARTISTS) expect(EXCLUDED_QIDS.has(c.qid), c.nameHe).toBe(false)
    expect(EXCLUDED_QIDS.has('Q116692489')).toBe(true) // מאי ספדיה
  })

  it('keeps the curated tiles over Wikidata values', () => {
    const base = makeArtist({ id: 'Q5348891', nameHe: 'איפה הילד?', members: 0, primaryGenre: 'pop', ids: { wikidata: 'Q5348891', musicbrainz: 'mb' } })
    const a = curatedArtist(curatedFor('Q5348891')!, base)
    expect(a).toMatchObject({ members: 4, primaryGenre: 'rock', type: 'band', foundedYear: 1986, genderKnown: true })
    expect(a.ids).toMatchObject({ wikidata: 'Q5348891', musicbrainz: 'mb', spotify: '4tOEC0rfs2z2Sf1Tv2OKAg' })
  })

  it("never lets Deezer replace the pool's picture", () => {
    const a = makeArtist({ id: 'Q26833615', imageUrl: 'https://i.scdn.co/image/static', ids: { wikidata: 'Q26833615', deezer: 8341014 } })
    applyEnrichment(a, { imageUrl: 'https://cdn-images.dzcdn.net/wrong.jpg', deezerId: 8341014 })
    expect(a.imageUrl).toBe('https://i.scdn.co/image/static')
    expect(a.ids.deezer).toBe(DEEZER_IDS.Q26833615)
  })

  it('picks the Deezer profile with the most fans among exact name matches', async () => {
    const urls: string[] = []
    const dzGet = async <T,>(url: string): Promise<T> => {
      urls.push(url)
      if (url.includes('/search/artist')) {
        return {
          data: [
            { id: 1, name: 'Itay Levi', nb_fan: 0, picture_medium: 'wrong.jpg' },
            { id: 2, name: 'Itay Levi', nb_fan: 26_000, picture_medium: 'right.jpg' },
          ],
        } as T
      }
      return { data: [] } as T
    }
    const a = makeArtist({ id: 'Q1', nameHe: 'זמר', nameEn: 'Itay Levi', ids: { wikidata: 'Q1' } })
    const { e } = await fetchEnrichment(a, { dzGet, fetchImpl: (async () => new Response('{}')) as typeof fetch })
    expect(e.deezerId).toBe(2)
    expect(e.imageUrl).toBe('right.jpg')
  })
})

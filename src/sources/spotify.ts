import type { Artist } from '../artist'
import { POOL_SIZE } from '../config'
import { assignRanks, compareByPopularity } from '../artist'

// Spotify popularity for the nightly pool build (scripts/build-pool.ts).
//
// Spotify's Web API cannot rank artists any more: the February 2026 changes
// removed `popularity` and `followers` from the artist object. The number
// Spotle itself uses, monthly listeners, is printed on every public artist
// page (open.spotify.com/artist/<id>), so the build reads it from there.
// This runs in Node only, never in the player's browser (no CORS there).

// "1.2M" -> 1_200_000, "345.6K" -> 345_600, "1,234,567" -> 1_234_567.
export function parseCount(raw: string, suffix?: string): number | null {
  const n = Number(raw.replace(/,/g, ''))
  if (!Number.isFinite(n)) return null
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(suffix ?? '').toUpperCase()] ?? 1
  return Math.round(n * mult)
}

// Monthly listeners from an artist page. Prefers the exact integer when the
// page embeds its data; otherwise the (rounded) figure from the Open Graph
// description, e.g. "Artist · 1.2M monthly listeners.".
export function parseMonthlyListeners(html: string): number | null {
  const exact = /"monthlyListeners"\s*:\s*(\d+)/.exec(html)
  if (exact) return Number(exact[1])
  // The rendered page shows both "31m monthly listeners" and
  // "30,984,889 monthly listeners": prefer the most precise figure.
  const hits = [...html.matchAll(/([\d][\d.,]*)\s*([KMB])?\s+monthly listeners/gi)]
  if (hits.length) {
    const precise = hits.find((m) => !m[2] && m[1].replace(/\D/g, '').length >= 4)
    const m = precise ?? hits[0]
    return parseCount(m[1], m[2])
  }
  return null
}

// "Where people listen" on the artist's About card: the top five cities,
// e.g. "Tel Aviv, IL\n613,135 listeners". Returns [] when the card isn't there.
export interface CityListeners {
  city: string
  country: string
  listeners: number
}

export function parseTopCities(text: string): CityListeners[] {
  return [...text.matchAll(/([^\n,]+), ([A-Z]{2})\s*\n\s*([\d,]+) listeners/g)].map((m) => ({
    city: m[1].trim(),
    country: m[2],
    listeners: Number(m[3].replace(/,/g, '')),
  }))
}

// Estimated listeners in Israel and Israel's share of the top-city listeners.
// The estimate is total x share: the top five cities alone cover only part of
// an artist's Israeli audience (everyone outside Tel Aviv, Petah Tikva,
// Rishon, Ramat Gan and Jerusalem), so summing them undercounted mid-size
// artists by half and pushed them under the listener floor (עפרה חזה: 348K
// monthly listeners, 36K in her top cities). With no city data (very small
// artists) Israel is assumed: every candidate is already an Israeli artist.
export function israelAudience(total: number, cities: CityListeners[]): { listeners: number; share: number } {
  if (cities.length === 0) return { listeners: total, share: 1 }
  const all = cities.reduce((n, c) => n + c.listeners, 0)
  const il = cities.filter((c) => c.country === 'IL').reduce((n, c) => n + c.listeners, 0)
  const share = all > 0 ? il / all : 0
  return { listeners: Math.round(total * share), share }
}

// The artist's profile picture, from Spotify's public oEmbed endpoint (no key).
// Same profile as the listener count, so the photo always matches the artist.
// null = no picture / not reachable.
export async function fetchSpotifyImage(spotifyId: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  try {
    const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/artist/${spotifyId}`)}`
    const res = await fetchImpl(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const j = (await res.json()) as { thumbnail_url?: string }
    return spotifyImageUrl(j.thumbnail_url)
  } catch {
    return null
  }
}

// oEmbed answers with a regional CDN host (image-cdn-ak / -fa ...); the image
// id is the stable part, so store it on Spotify's canonical image host.
export function spotifyImageUrl(thumb: string | undefined | null): string | null {
  if (!thumb) return null
  const m = /\/image\/([0-9a-f]{20,})/.exec(thumb)
  return m ? `https://i.scdn.co/image/${m[1]}` : thumb
}

export interface ListenerFetchOptions {
  fetchImpl?: typeof fetch
  userAgent?: string
  retries?: number
  sleep?: (ms: number) => Promise<void>
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// null = the page could not be read or parsed (not "zero listeners").
export async function fetchMonthlyListeners(
  spotifyId: string,
  opts: ListenerFetchOptions = {},
): Promise<number | null> {
  const { fetchImpl = fetch, userAgent, retries = 3, sleep = realSleep } = opts
  const url = `https://open.spotify.com/artist/${spotifyId}`
  for (let attempt = 0; attempt <= retries; attempt++) {
    let res: Response
    try {
      res = await fetchImpl(url, {
        headers: {
          'Accept-Language': 'en',
          Accept: 'text/html',
          ...(userAgent ? { 'User-Agent': userAgent } : {}),
        },
      })
    } catch {
      await sleep(1000 * 2 ** attempt)
      continue
    }
    if (res.status === 404) return null
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get('retry-after'))
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * 2 ** attempt)
      continue
    }
    if (!res.ok) return null
    return parseMonthlyListeners(await res.text())
  }
  return null
}

export interface SpotifyHit {
  id: string
  listeners: number
  // Estimated monthly listeners in Israel (see israelAudience). Not the ranking
  // score since 0.10.0: build-pool.ts uses it for the Israel filter and the
  // listener floor, and it is stored as metrics.spotifyListenersIL.
  israelListeners?: number
}

// Keeps the `size` artists with the most Spotify monthly listeners (the number
// on the artist's page) and ranks them 1..n, one artist per rank (sitelinks,
// then QID, break ties - the page figure is rounded). Two Wikidata items that
// resolve to the same Spotify profile count once. Acts whose audience is
// mostly abroad never get here: build-pool.ts drops them first. The top
// ANSWER_POOL_SIZE (the whole pool) can be a daily answer.
export function rankBySpotify(
  artists: Artist[],
  listeners: Map<string, SpotifyHit>,
  size = POOL_SIZE,
): Artist[] {
  const score = (h: SpotifyHit) => h.listeners
  const withListeners = artists
    .filter((a) => {
      const hit = listeners.get(a.id)
      return hit != null && score(hit) > 0
    })
    .map((a) => {
      const hit = listeners.get(a.id)!
      return {
        ...a,
        ids: { ...a.ids, spotify: hit.id },
        metrics: {
          ...a.metrics,
          spotifyListeners: hit.listeners,
          ...(hit.israelListeners != null ? { spotifyListenersIL: hit.israelListeners } : {}),
        },
      }
    })
  const byListeners = compareByPopularity((a) => a.metrics.spotifyListeners ?? 0)
  return assignRanks(withListeners.sort(byListeners), size)
}

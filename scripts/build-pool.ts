// Pool build (every two weeks, .github/workflows/update-pool.yml): the top
// POOL_SIZE Hebrew-singing Israeli artists by Spotify monthly listeners.
//
//   npm run build:pool                       -> public/data/pool.json
//   npm run build:pool -- --out dist/data/pool.json
//
// 1. Candidates, from two sources:
//    a. Hebrew Wikipedia categories: every page in "זמרים השרים בעברית" /
//       "זמרות השרות בעברית" and the Israeli band categories
//       (src/sources/hewikiCategories.ts). This is what finds acts whose Wikidata
//       item is too sparse for (b) - איפה הילד?, טיפקס, יוני בלוך.
//    b. Wikidata: Israeli music artists with a Spotify id (P1902), kept when
//       Hebrew is among their languages (hebrewSingerQids).
//    Wikidata supplies the tile fields for both (fetched by QID for (a)).
// 2. Spotify: each artist's public page, rendered in headless Chromium
//    (Playwright): monthly listeners and the top-5 cities from the About card.
//    Artists with no Spotify id on Wikidata are found with Spotify search.
// 3. Filters: artists whose top-city audience is mostly abroad
//    (< MIN_ISRAEL_SHARE in Israel) or who have fewer than MIN_LISTENERS_IL
//    estimated Israeli listeners are dropped.
//    Rank = Spotify monthly listeners, the number on the artist's page.
// 4. Fill the gaps (fill.ts), keep the first POOL_SIZE complete artists, rank
//    them 1..N and write data/pool.json (generated, never committed).
//
// Exits non-zero when too few artists resolve (Wikidata down, Spotify page
// format changed, rate limited), so the deploy keeps yesterday's site
// instead of shipping a broken pool.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { MIN_ISRAEL_SHARE, MIN_LISTENERS_IL, POOL_SIZE } from '../src/config.ts'
import {
  buildArtists,
  fetchMissingSpotifyCandidates,
  fetchPoolRows,
  hebrewSingerQids,
  matchesCandidate,
  nonHebrewQids,
  spotifyIdsByQid,
  type SearchCandidate,
  type SparqlRow,
  fetchCategoryCandidates,
  fetchSpotifyImage,
  israelAudience,
  parseMonthlyListeners,
  parseTopCities,
  rankBySpotify,
  type CityListeners,
  type SpotifyHit,
} from '../src/sources/index.ts'
import { chromium, type Browser, type Page } from 'playwright'
import type { Artist, Genre, PrebuiltPool } from '../src/artist/index.ts'
import { assignRanks, CURATED_ARTISTS, curatedArtist, EXCLUDED_QIDS } from '../src/artist/index.ts'
import { fillUntil } from '../src/pool/index.ts'

const args = process.argv.slice(2)
const outArg = args.indexOf('--out')
const OUT = outArg >= 0 ? args[outArg + 1] : 'public/data/pool.json'

const CONTACT = process.env.CONTACT_EMAIL || 'https://github.com/lili582/amandle'
// Wikidata refuses anonymous clients; identify the bot.
const WIKIDATA_UA = `AmandleBot/1.0 (${CONTACT})`
const CONCURRENCY = Number(process.env.SPOTIFY_CONCURRENCY || 6)
const DELAY_MS = Number(process.env.SPOTIFY_DELAY_MS || 200)
const PAGE_TIMEOUT_MS = 25_000
// Fewer ranked artists than this = something upstream broke.
const MIN_POOL = Number(process.env.MIN_POOL ?? 150)
const LISTENER_FLOOR = Number(process.env.MIN_LISTENERS_IL ?? MIN_LISTENERS_IL)
const ISRAEL_SHARE = Number(process.env.MIN_ISRAEL_SHARE ?? MIN_ISRAEL_SHARE)
const CITIES_TIMEOUT_MS = 8_000
// Hard cap on one Spotify job (all its tries). Playwright calls such as
// newPage/close have no timeout of their own, and one wedged page used to
// stall a worker forever; once every worker was stuck the build hung for days.
const TASK_TIMEOUT_MS = Number(process.env.SPOTIFY_TASK_TIMEOUT_MS || 90_000)
// No progress at all for this long = give up (exit 1, live site unchanged).
const STALL_MS = Number(process.env.STALL_MS || 10 * 60_000)
// Restart Chromium every N pages so its memory doesn't grow without bound.
const PAGES_PER_BROWSER = Number(process.env.PAGES_PER_BROWSER || 400)

// Resume cache: search hits (stable for weeks) and profile readings (valid
// for a few hours), so a re-run after a crash or a stall skips what is done.
const CACHE_FILE = process.env.SPOTIFY_CACHE || '.cache/spotify-cache.json'
const SEARCH_TTL_MS = 30 * 24 * 3600_000
const SEARCH_MISS_TTL_MS = 7 * 24 * 3600_000
const PROFILE_TTL_MS = Number(process.env.PROFILE_TTL_HOURS || 20) * 3600_000

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const stamp = () => new Date().toLocaleTimeString('en-GB', { hour12: false })
const log = (m: string) => {
  lastProgress = Date.now()
  console.log(`[${stamp()}] ${m}`)
}

// --- watchdog -------------------------------------------------------------
let lastProgress = Date.now()
const watchdog = setInterval(() => {
  const idle = Date.now() - lastProgress
  if (idle > STALL_MS) {
    console.error(`[${stamp()}] STALLED: no progress for ${Math.round(idle / 60_000)} min, giving up.`)
    process.exit(1)
  }
}, 30_000)
watchdog.unref()

class Timeout extends Error {}
function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let t: NodeJS.Timeout | undefined
  return Promise.race([
    p,
    new Promise<never>((_, reject) => {
      t = setTimeout(() => reject(new Timeout(`${what} timed out after ${ms / 1000}s`)), ms)
    }),
  ]).finally(() => clearTimeout(t))
}

// --- browser (relaunched when it dies or after PAGES_PER_BROWSER pages) ----
let browser: Browser | null = null
let launching: Promise<Browser> | null = null
let pagesOpened = 0
let openPages = 0

async function getBrowser(): Promise<Browser> {
  if (browser?.isConnected() && pagesOpened < PAGES_PER_BROWSER) return browser
  if (!launching) {
    launching = (async () => {
      const old = browser
      browser = null
      if (old) {
        // Let in-flight pages finish (bounded), then close the old instance.
        const until = Date.now() + 30_000
        while (openPages > 0 && Date.now() < until) await sleep(250)
        await withTimeout(old.close(), 10_000, 'browser.close').catch(() => {})
      }
      const b = await withTimeout(chromium.launch(), 60_000, 'chromium.launch')
      pagesOpened = 0
      browser = b
      return b
    })().finally(() => {
      launching = null
    })
  }
  return launching
}

// Runs fn on a fresh page. Never waits on a wedged page: open and close are
// both bounded.
async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const b = await getBrowser()
  const page = await withTimeout(b.newPage({ locale: 'en-US' }), 20_000, 'newPage')
  pagesOpened++
  openPages++
  try {
    return await fn(page)
  } finally {
    openPages--
    void withTimeout(page.close(), 10_000, 'page.close').catch(() => {})
  }
}

// --- resume cache -----------------------------------------------------------
interface Cache {
  search: Record<string, { sid: string | null; at: number }>
  profiles: Record<string, PageReading & { at: number }>
}
let cache: Cache = { search: {}, profiles: {} }
let cacheDirty = 0

async function loadCache() {
  try {
    const raw = JSON.parse(await readFile(CACHE_FILE, 'utf8')) as Partial<Cache>
    cache = { search: raw.search ?? {}, profiles: raw.profiles ?? {} }
  } catch {
    // first run, or an unreadable cache: start empty
  }
}

async function saveCache(force = false) {
  if (!force && ++cacheDirty < 25) return
  cacheDirty = 0
  try {
    await mkdir(dirname(CACHE_FILE), { recursive: true })
    const tmp = `${CACHE_FILE}.tmp`
    await writeFile(tmp, JSON.stringify(cache))
    await rename(tmp, CACHE_FILE)
  } catch (err) {
    console.error(`cache not saved: ${err instanceof Error ? err.message : err}`)
  }
}

function cachedSearch(qid: string): string | null | undefined {
  const e = cache.search[qid]
  if (!e) return undefined
  const ttl = e.sid ? SEARCH_TTL_MS : SEARCH_MISS_TTL_MS
  return Date.now() - e.at < ttl ? e.sid : undefined
}

function cachedProfile(sid: string): PageReading | undefined {
  const e = cache.profiles[sid]
  return e && Date.now() - e.at < PROFILE_TTL_MS ? { listeners: e.listeners, cities: e.cities } : undefined
}

// Opens the About card (it holds "Where people listen": the top 5 cities).
// Passed as a string so the bundler can't inject helpers into page code.
const OPEN_ABOUT = `(() => {
  const h = [...document.querySelectorAll('h2')].find((x) => (x.textContent || '').trim() === 'About')
  let s = h ? h.parentElement : null
  for (let i = 0; s && i < 6 && !/monthly listeners/i.test(s.textContent || ''); i++) s = s.parentElement
  const b = s ? s.querySelector('button') : null
  if (b) { b.scrollIntoView(); b.click() }
  return Boolean(b)
})()`

interface PageReading {
  listeners: number
  cities: CityListeners[]
}

// Renders open.spotify.com/artist/<id>: "835.9K monthly listeners" and the
// top cities. null = unreadable after two tries (not "zero listeners").
async function readListeners(spotifyId: string): Promise<PageReading | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await withPage(async (page) => {
      await page.goto(`https://open.spotify.com/artist/${spotifyId}`, {
        waitUntil: 'domcontentloaded',
        timeout: PAGE_TIMEOUT_MS,
      })
      await page.waitForFunction(() => /monthly listeners/i.test(document.body?.innerText ?? ''), null, {
        timeout: PAGE_TIMEOUT_MS,
      })
      const listeners = parseMonthlyListeners(await page.innerText('body'))
      if (listeners == null) throw new Error('no count')
      let cities: CityListeners[] = []
      try {
        if (await page.evaluate(OPEN_ABOUT)) {
          await page.waitForFunction(`/, [A-Z]{2}\\s*\\n\\s*[\\d,]+ listeners/.test(document.body.innerText)`, null, {
            timeout: CITIES_TIMEOUT_MS,
          })
          cities = parseTopCities(await page.innerText('body'))
        }
      } catch {
        // no "Where people listen" (small artists): israelAudience assumes Israel
      }
      return { listeners, cities }
      })
    } catch {
      await sleep(2000 * (attempt + 1))
    }
  }
  return null
}

// Searches Spotify for an artist Wikidata has no Spotify id for, and returns
// the id of the first result whose name matches exactly (Hebrew or English).
// Tries the Hebrew name first, then the English one (Spotify often lists
// Israeli artists in Latin letters: "Yoni Bloch", "Eifo HaYeled").
async function searchSpotifyId(c: SearchCandidate): Promise<string | null> {
  const queries = [...new Set([c.title.replace(/\s*\([^)]*\)\s*$/, ''), c.en].filter((x): x is string => Boolean(x)))]
  for (const query of queries) {
    try {
      const hit = await withPage(async (page) => {
      const q = encodeURIComponent(query)
      await page.goto(`https://open.spotify.com/search/${q}/artists`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS })
      await page.waitForSelector('main a[href^="/artist/"]', { timeout: PAGE_TIMEOUT_MS })
      await sleep(500)
      const results = await page.$$eval('main a[href^="/artist/"]', (as) =>
        as.slice(0, 8).map((a) => [a.getAttribute('href')!.split('/')[2], (a.textContent || a.getAttribute('title') || '').trim()]),
      )
      return results.find(([, name]) => matchesCandidate(name, c))?.[0] ?? null
      })
      if (hit) return hit
    } catch {
      // try the next name
    }
  }
  return null
}

// Runs fn over items with CONCURRENCY workers. Each job is capped at
// TASK_TIMEOUT_MS; a job that times out counts as failed (onTimeout) and
// the worker moves on instead of waiting forever.
async function runPool<T>(items: T[], fn: (item: T) => Promise<void>, onTimeout: (item: T) => void) {
  let next = 0
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) {
        const item = items[next++]
        try {
          await withTimeout(fn(item), TASK_TIMEOUT_MS, 'Spotify job')
        } catch {
          onTimeout(item)
        }
        lastProgress = Date.now()
        await sleep(DELAY_MS)
      }
    }),
  )
}

async function main() {
  const t0 = Date.now()
  const headers = { 'User-Agent': WIKIDATA_UA }

  // 1a. Hebrew Wikipedia categories: Hebrew singers and Israeli bands.
  const cats = await fetchCategoryCandidates({ userAgent: WIKIDATA_UA, log })
  const hints = new Map<string, Genre>()
  for (const c of cats.values()) if (c.genreHint) hints.set(c.qid, c.genreHint)

  // 1b. Wikidata: Israeli artists with a Spotify id.
  log('Wikidata: querying Israeli artists with a Spotify id...')
  const rows: SparqlRow[] = await fetchPoolRows({ minSitelinks: 1, requireSpotify: true, headers })
  const inRows = new Set(rows.map((r) => r.item?.value.split('/').pop()))
  const catQids = [...cats.keys()].filter((q) => !inRows.has(q))
  for (let i = 0; i < catQids.length; i += 150) {
    rows.push(...(await fetchPoolRows({ qids: catQids.slice(i, i + 150), headers })))
  }
  log(`Wikidata: ${rows.length} rows (${catQids.length} fetched for category artists)`)

  // Hebrew singers only. A category says it outright; otherwise Wikidata must
  // list Hebrew (and a singing occupation for soloists).
  const hebrew = hebrewSingerQids(rows)
  const notHebrew = nonHebrewQids(rows)
  const keep = (a: Artist) => {
    const cat = cats.get(a.id)
    if (cat?.kind === 'singer') return true
    if (cat?.kind === 'group' && a.type !== 'solo') return !notHebrew.has(a.id)
    return hebrew.has(a.id)
  }
  const built = buildArtists(rows, undefined, true, hints)
  const artists = built.filter((a) => keep(a) && !EXCLUDED_QIDS.has(a.id))
  log(`Candidates: ${artists.length} Hebrew-singing artists (${built.length - artists.length} others dropped)`)

  // Hand-checked artists (src/artist/curatedArtists.ts) are always candidates,
  // with their curated tiles and Spotify profile.
  const curated = new Set(CURATED_ARTISTS.map((c) => c.qid))
  for (const c of CURATED_ARTISTS) {
    const base = built.find((a) => a.id === c.qid)
    const i = artists.findIndex((a) => a.id === c.qid)
    if (i >= 0) artists[i] = curatedArtist(c, base)
    else artists.push(curatedArtist(c, base))
  }
  log(`Curated: ${CURATED_ARTISTS.length} hand-checked artists added`)

  const spotifyIds = spotifyIdsByQid(rows)
  for (const c of CURATED_ARTISTS) spotifyIds.set(c.qid, [c.spotify])
  const best = new Map<string, SpotifyHit & { share: number }>()
  let failed = 0

  await loadCache()
  try {
    // Artists with no Spotify id on Wikidata: find them by name on Spotify.
    const known = new Set(artists.map((a) => a.id))
    // Wikidata-only musicians outside the Hebrew-singer/band categories are
    // rarely household names; searching them doubles the build time.
    const extra = process.env.SEARCH_EXTRA === '1' ? await fetchMissingSpotifyCandidates({ headers }) : []
    const toSearch: SearchCandidate[] = [
      ...artists
        .filter((a) => !spotifyIds.has(a.id))
        .map((a) => ({ qid: a.id, title: a.wikiTitle, en: a.nameEn, sitelinks: a.metrics.wikidataSitelinks })),
      ...extra.filter((c) => !known.has(c.qid)),
    ]
    const found = new Map<string, string>()
    const searchTodo: SearchCandidate[] = []
    for (const c of toSearch) {
      const hit = cachedSearch(c.qid)
      if (hit === undefined) searchTodo.push(c)
      else if (hit) found.set(c.qid, hit)
    }
    log(
      `Spotify search: ${toSearch.length} artists without a Spotify id on Wikidata ` +
        `(${toSearch.length - searchTodo.length} from cache, ${searchTodo.length} to search)`,
    )
    let searched = 0
    let searchTimeouts = 0
    const searchStep = () => {
      if (++searched % 100 === 0)
        log(`Spotify search: ${searched}/${searchTodo.length} (${found.size} matched, ${searchTimeouts} timed out)`)
    }
    await runPool(
      searchTodo,
      async (c) => {
        const sid = await searchSpotifyId(c)
        if (sid) found.set(c.qid, sid)
        cache.search[c.qid] = { sid, at: Date.now() }
        await saveCache()
        searchStep()
      },
      () => {
        searchTimeouts++
        searchStep()
      },
    )
    await saveCache(true)
    log(`Spotify search: matched ${found.size}/${toSearch.length}`)
    for (const [qid, sid] of found) spotifyIds.set(qid, [sid])

    // Search hits that weren't candidates yet (Wikidata-only musicians).
    const newQids = [...found.keys()].filter((q) => !known.has(q))
    for (let i = 0; i < newQids.length; i += 150) {
      const more = await fetchPoolRows({ qids: newQids.slice(i, i + 150), headers })
      const ok = hebrewSingerQids(more)
      for (const a of buildArtists(more, undefined, true, hints)) {
        if (!ok.has(a.id) || known.has(a.id)) continue
        artists.push(a)
        known.add(a.id)
      }
    }

    const jobs = artists.flatMap((a) => (spotifyIds.get(a.id) ?? []).map((sid) => ({ qid: a.id, sid })))

    // qid -> the artist's biggest Spotify profile in Israel
    const record = (qid: string, sid: string, r: PageReading) => {
      const il = israelAudience(r.listeners, r.cities)
      if (il.listeners > (best.get(qid)?.israelListeners ?? -1)) {
        best.set(qid, { id: sid, listeners: r.listeners, israelListeners: il.listeners, share: il.share })
      }
    }
    const readTodo: typeof jobs = []
    for (const j of jobs) {
      const r = cachedProfile(j.sid)
      if (r) record(j.qid, j.sid, r)
      else readTodo.push(j)
    }
    log(
      `Spotify: reading ${jobs.length} profiles for ${artists.length} artists ` +
        `(${jobs.length - readTodo.length} from cache, ${readTodo.length} to read)`,
    )

    let done = 0
    const readStep = () => {
      if (++done % 100 === 0) log(`Spotify: ${done}/${readTodo.length} (${failed} unreadable)`)
    }
    await runPool(
      readTodo,
      async ({ qid, sid }) => {
        const r = await readListeners(sid)
        if (r == null) failed++
        else {
          record(qid, sid, r)
          cache.profiles[sid] = { ...r, at: Date.now() }
          await saveCache()
        }
        readStep()
      },
      () => {
        failed++
        readStep()
      },
    )
    await saveCache(true)
    log(`Spotify: ${jobs.length - failed}/${jobs.length} profiles read`)
  } finally {
    const b = browser
    browser = null
    if (b) await withTimeout(b.close(), 15_000, 'browser.close').catch(() => {})
  }

  // Known in Israel: most of the top-city audience must be Israeli.
  const missingCurated = CURATED_ARTISTS.filter((c) => !best.has(c.qid)).map((c) => c.nameHe)
  if (missingCurated.length) log(`WARNING: no Spotify reading for curated ${missingCurated.join(', ')}`)
  const abroad = [...best.entries()].filter(([q, h]) => h.share < ISRAEL_SHARE && !curated.has(q))
  for (const [qid] of abroad) best.delete(qid)
  const names = new Map(artists.map((a) => [a.id, a.nameHe]))
  log(
    `Israel filter: dropped ${abroad.length} artists with < ${Math.round(ISRAEL_SHARE * 100)}% of their audience in Israel, e.g. ` +
      abroad
        .sort((x, y) => y[1].listeners - x[1].listeners)
        .slice(0, 10)
        .map(([q, h]) => `${names.get(q)} (${Math.round(h.share * 100)}%)`)
        .join(', '),
  )

  // Known at all: drop the long tail with few Israeli listeners.
  const tail = [...best.entries()].filter(([q, h]) => (h.israelListeners ?? 0) < LISTENER_FLOOR && !curated.has(q))
  for (const [qid] of tail) best.delete(qid)
  log(`Listener floor: dropped ${tail.length} artists with < ${LISTENER_FLOOR.toLocaleString('en')} listeners in Israel`)

  // Most monthly listeners first; fill the gaps Wikidata leaves (fill.ts)
  // and keep the first POOL_SIZE artists with every tile known (complete.ts).
  const ranked = rankBySpotify(artists, best, Number.MAX_SAFE_INTEGER)
  const report = await fillUntil(ranked, POOL_SIZE, {
    userAgent: WIKIDATA_UA,
    log,
  })
  log(`Fill: completed ${report.filled}, skipped ${report.dropped.length} still missing a tile`)
  const pool = assignRanks(report.complete, POOL_SIZE)
  if (pool.length < MIN_POOL) {
    throw new Error(
      `only ${pool.length} artists have Spotify listeners (need ${MIN_POOL}); ` +
        `${failed} Spotify pages were unreadable. Not writing ${OUT}.`,
    )
  }

  // Pictures from each artist's Spotify profile (the same one ranked above),
  // so the reveal photo always matches the artist. Deezer is only a fallback.
  let pictures = 0
  await runPool(
    pool,
    async (a) => {
      const sid = a.ids.spotify
      const img = sid ? await fetchSpotifyImage(sid) : null
      if (img) {
        a.imageUrl = img
        pictures++
      }
    },
    () => {},
  )
  log(`Pictures: ${pictures}/${pool.length} from Spotify`)

  const out: PrebuiltPool = { generatedAt: new Date().toISOString(), source: 'spotify', artists: pool }
  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(out))
  const top = pool
    .slice(0, 20)
    .map((a) => `${a.popularityRank}. ${a.nameHe} (${a.metrics.spotifyListeners?.toLocaleString('en')} monthly listeners)`)
  log(`Wrote ${pool.length} artists to ${OUT} in ${Math.round((Date.now() - t0) / 1000)}s`)
  log(top.join('\n'))
}

main().then(
  // Exit explicitly: a timed-out Playwright call left behind must not keep
  // the process (and the deploy after it) waiting.
  () => process.exit(0),
  (err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  },
)

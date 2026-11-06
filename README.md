# אמנדל — נחשו את האמן הישראלי היומי

A Hebrew, RTL, daily Spotle clone with Israeli artists only: identify the day's
artist in 10 guesses. Each guess reveals six Spotle-style tiles — breakthrough
year (in place of debut album), members, popularity, gender, genre, and age (in
place of nationality, since every artist is Israeli).

Live: https://amandle-eta.vercel.app

| Tile | Green | Yellow | Arrow |
|------|-------|--------|-------|
| שנת פריצה | same year | within 7 years | yes |
| חברים | same lineup size | — | — |
| פופולריות | same rank | within 5% of the pool (Spotle: 50 of 1,000) | yes |
| מגדר | same | — | — |
| ז׳אנר | same | — | — |
| גיל | same age | within 7 years | yes |

## Stack

- React 19 / Vite 8 / TypeScript 6, oxlint, Vitest (jsdom)
- RTL Heebo UI, dark/light themes, colorblind mode, reduced-motion support
- PWA manifest + icons for installability
- Hosted on Vercel

## Getting started

```bash
npm install
npm run dev          # dev server; ?day=N previews any date (DEV builds only)
npm test             # vitest (headless)
npm run lint         # oxlint
npm run typecheck    # tsc -b
npm run build        # tsc -b && vite build -> dist/
npm run preview      # serve dist/ locally
npm run build:pool   # rebuild public/data/pool.json (slow: reads Spotify)
npm run fill:pool    # fill gaps in the existing pool.json, no Spotify
npm run check:pool   # compare a new pool.json with the live one
```

On Windows, `start-game.bat` runs the dev server and opens the game.

## The artist pool: `public/data/pool.json`

The game plays from one file, `public/data/pool.json`: the **350** most popular
Hebrew-singing Israeli artists (`POOL_SIZE` in `src/config.ts`), each with all
six tile values, a popularity rank 1–350, its Wikidata / MusicBrainz / Spotify
ids, Spotify monthly listeners and a picture. Every artist in it can be guessed
and can be the daily answer. The file is generated, never committed
(`.gitignore`), and shipped to Vercel with the site.

### How it's built (`npm run build:pool`, `scripts/build-pool.ts`)

1. **Candidates**: every page in Hebrew Wikipedia's Hebrew-singer and
   Israeli-band categories, plus Israeli artists on Wikidata whose languages
   include Hebrew. Hand-checked artists (`src/lib/curatedArtists.ts`) are
   always candidates; `EXCLUDED_QIDS` there are never in the pool.
2. **Spotify**: each artist's public page is opened in headless Chromium
   (Playwright) to read its monthly listeners and top 5 cities. Artists with
   no Spotify id on Wikidata are found with Spotify search.
3. **Filters**: artists whose top-city audience is mostly abroad
   (`MIN_ISRAEL_SHARE`, e.g. Linet) and artists with fewer than
   `MIN_LISTENERS_IL` estimated Israeli listeners are left out. Hand-checked
   artists skip both filters.
4. **Rank**: by Spotify **monthly listeners**, the number on the artist's
   page, highest first (`rankBySpotify` in `src/lib/spotify.ts`). Ties are
   broken by Wikidata sitelinks, then by id, so the order is stable.
5. **Every tile filled**: walking the ranking from the top, gaps Wikidata
   leaves are filled from MusicBrainz and Deezer (`src/lib/fill.ts`); an
   artist still missing a tile is skipped and the next one takes its place
   (`src/lib/complete.ts`).
6. **Write** the top 350 to `public/data/pool.json`. If fewer than `MIN_POOL`
   artists resolve, nothing is written.

A resume cache in `.cache/spotify-cache.json` (gitignored) lets a re-run after
a crash skip what is already done. None of this needs an API key.

### Automatic update every two weeks (`.github/workflows/update-pool.yml`)

The workflow wakes every Sunday at 03:17 Israel time (04:17 in summer) and
rebuilds only when the live pool is 13 or more days old, so it updates every
two weeks, and a run that fails is retried the next Sunday.

1. Download the live `pool.json` and check its age (`npm run check:pool -- --stale`).
2. Build a new pool (up to 3 tries, resuming from the cache).
3. **Safety check** (`src/lib/poolCheck.ts`): the new pool is not deployed when
   it has fewer than 300 artists, or when more than 30% of the live pool would
   be replaced. The run summary lists who joined, who left and who moved 20+
   places. Each new pool is kept as a run artifact for 90 days.
4. Tests, then deploy to Vercel, then confirm the live site serves the new file.

When anything fails, the live site keeps its current pool and GitHub emails you.
You can also start it by hand: GitHub → Actions → **Update pool** → Run workflow
(**rebuild** = don't wait for 13 days, **force** = allow more than 30% change).

One-time setup, in GitHub → Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `VERCEL_TOKEN` | a token from vercel.com/account/tokens |
| `VERCEL_ORG_ID` | `orgId` in `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `projectId` in `.vercel/project.json` |

Optional variable `SITE_URL` if the site moves (default
`https://amandle-eta.vercel.app`). GitHub turns off scheduled workflows after
60 days without commits in a public repo; re-enable it from the Actions tab.

### Updating by hand (Windows)

`build-and-deploy.bat` does the same on your PC: rebuild the pool (with
retries), then deploy to Vercel with the Vercel CLI. A log of each run is
written to `logs/`.

## Data at play time

| Source | Used for |
|--------|----------|
| `data/pool.json` | the pool and every tile value |
| MusicBrainz / Deezer | on demand for guessed artists: picture, top tracks, 30-second preview on the reveal card (`src/lib/enrich.ts`) |
| Wikidata + Hebrew Wikipedia page views | fallback only when `pool.json` is missing (local dev without `build:pool`) |

The pool is cached in IndexedDB until the Israeli midnight (keyed by build, so
a deploy replaces it at once); per-artist enrichment is cached for 7 days.

Age is the artist's age (age at death for a deceased artist, shown as "ז״ל");
for a group, years since it was formed (`src/lib/age.ts`).

The daily answer uses rendezvous hashing over the pool (`rendezvousSchedule` in
`src/lib/daily.ts`), so a pool update only changes the days a joining or
leaving artist would have won, and an answer never repeats within 60 days.

`localStorage` (namespace `amandle:v1`) holds today's game, settings and stats.
Every access is wrapped so the game works with storage blocked, just without
persistence.

## Versions

SemVer, with a git tag per release and `CHANGELOG.md`. Every change goes on its
own branch with a PR. Decisions and their reasons are in `DECISIONS.md`.

CI (`.github/workflows/ci.yml`) runs lint, typecheck and tests on every push and PR.

## Before launch

- [ ] Set `GAME_URL`, `REPORT_EMAIL` and `OWNER_NAME` in `src/config.ts` (the
  legal pages show them as the site operator and accessibility contact).
- [ ] Add the three Vercel secrets so the automatic update can deploy.

## Legal pages

Footer links (also reachable as `#privacy`, `#terms`, `#accessibility`) open
three Hebrew pages whose text lives in `src/legal.he.ts`:

- **מדיניות פרטיות** — no accounts, cookies, analytics or ads; what is kept in
  localStorage/IndexedDB and for how long; which third-party services the
  browser contacts.
- **תנאי שימוש** — free, as-is, no accuracy warranty, limitation of liability,
  IP and non-affiliation, takedown requests, Israeli law / Tel Aviv courts.
- **הצהרת נגישות** — IS 5568 / WCAG AA intent, what was done, known limits,
  accessibility contact (`OWNER_NAME`, `CONTACT_EMAIL`).

Related: Settings has a **מחיקת הנתונים שלי** button (wipes all local data);
Heebo is self-hosted via `@fontsource/heebo` (no Google Fonts requests); the
reveal card credits Deezer. If you add analytics, ads, accounts or a new data
source, update the privacy policy and `LEGAL_UPDATED` in the same change.

## Credits / licensing

Data: Spotify (public artist pages), Wikidata (CC0), Wikipedia, MusicBrainz
(CC0), Deezer API. No accounts, no analytics, no third-party cookies, and no
API keys.

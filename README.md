# אמנדל — נחשו את האמן הישראלי היומי

A Hebrew, RTL, daily Spotle clone with Israeli artists only: identify the day's
artist in 10 guesses. Each guess reveals six Spotle-style tiles — breakthrough
year (in place of debut album), members, popularity, gender, genre, and age (in
place of nationality, since every artist is Israeli).

All data is fetched live from public APIs. There is no committed dataset and no
JSON data file; the only rules in the repo are the genre mapping and the tile
thresholds, both in TypeScript.

| Tile | Green | Yellow | Arrow |
|------|-------|--------|-------|
| שנת פריצה | same year | within 5 years | yes |
| חברים | same lineup size | — | — |
| פופולריות | same rank | within 5% of the pool (Spotle: 50 of 1,000) | yes |
| מגדר | same | — | — |
| ז׳אנר | same | — | — |
| גיל | same age | within 5 years | yes |

## Stack

- React 19 / Vite 8 / TypeScript 6, oxlint, Vitest (jsdom)
- RTL Heebo UI, dark/light themes, colorblind mode, reduced-motion support
- PWA manifest + icons for installability

## Getting started

```bash
npm install
npm run dev          # dev server; ?day=N previews any date (DEV builds only)
npm test             # vitest (headless)
npm run lint         # oxlint
npm run typecheck    # tsc --noEmit style check
npm run build        # tsc -b && vite build -> dist/
npm run preview      # serve dist/ locally
```

## Artist data (live APIs)

| Source | Used for | How |
|--------|----------|-----|
| Wikidata Query Service | the roster: name, solo/duo/band, gender, genres, career start, birth/death/formation years, band members, MusicBrainz/Deezer ids | one aggregated SPARQL query at load (`src/lib/wikidata.ts`) |
| Hebrew Wikipedia (MediaWiki API) | popularity rank = page views in the last 60 days; also picks the 250 daily-answer candidates | `prop=pageviews`, 50 titles per request (`src/lib/popularity.ts`) |
| MusicBrainz | breakthrough year = earliest original release year among the artist's 20 most played Deezer tracks (fallback: first album, then Wikidata career start); band lineup size and member genders when Wikidata lacks them | on demand, only for guessed artists and the answer, ≤1 req/s (`src/lib/enrich.ts`) |
| Deezer | artist picture, the 20 most played tracks (for the breakthrough year), and the top track's 30-second preview on the reveal card | JSONP on demand (`src/lib/enrich.ts`, `src/lib/jsonp.ts`) |

### Every artist has every tile

An artist only enters the pool when all six tiles have a real value (no "—"):
a career-start year, a lineup size, a known gender (for groups: the members'
genders), a mapped genre, a popularity rank, and a birth or formation year.
`src/lib/complete.ts` defines the rule.

- `npm run build:pool` gathers candidates from Hebrew Wikipedia's Hebrew-singer
  and Israeli-band categories plus Wikidata, and ranks them by Spotify monthly
  listeners **in Israel** (the Israeli cities among each artist's top 5);
  artists whose audience is mostly abroad are left out (`MIN_ISRAEL_SHARE`).
- It then walks that ranking from the top and
  fills holes Wikidata leaves (`src/lib/fill.ts`): MusicBrainz for lineup,
  member genders, birth/formation year and first release, Deezer albums as a
  second source for the first release. An artist still missing something is
  skipped and the next one takes its place, so the pool stays at 1,000.
  MusicBrainz allows ~1 request/s, so this adds ~15–30 minutes to the build.
- `npm run fill:pool` does the same to an existing `public/data/pool.json`
  without re-reading Spotify (incomplete artists are removed, the rest are
  re-ranked in order).
- The game itself also drops any incomplete artist it loads (an old pool file,
  or the live Wikidata fallback, which can't fill gaps).

None of these need an API key. The roster is cached in IndexedDB until the
Israeli midnight; per-artist enrichment is cached for 7 days.

Age is the artist's age (age at death for a deceased artist, shown as "ז״ל");
for a group, years since it was formed (`src/lib/age.ts`).

The daily answer uses rendezvous hashing over the answer candidates
(`rendezvousSchedule` in `src/lib/daily.ts`), so small day-to-day drift in page
views only affects the days a marginal artist would have won, and an answer
never repeats within 60 days.

### What this costs

- First load: the Wikidata query (~5–30s) plus ~12 page-view requests.
- A guess waits for MusicBrainz (1–4s, rate limited); after 12s the game
  compares with what it has.
- Hand-checked corrections (the old `overrides.json`) are gone, so a wrong
  Wikidata value shows up as-is. Fix it on Wikidata and it propagates.

`localStorage` (namespace `amandle:v1`) holds today's game, settings and stats;
the artist cache lives in IndexedDB. Every access is wrapped so the game works
with storage blocked, just without persistence.

## Deployment (GitHub Pages)

- CI (`.github/workflows/ci.yml`): lint + typecheck + vitest on push/PR.
- Deploy (`.github/workflows/deploy.yml`): build → Pages on push to `main`.

Before enabling Pages:

1. Set `GAME_URL`, `REPORT_EMAIL` and `OWNER_NAME` in `src/config.ts` (the
   legal pages show them as the site operator and accessibility contact).
2. Push to GitHub; in Settings → Pages choose **Source: GitHub Actions**.
3. Verify `/` returns 200. There is no `/data/` to check — the roster comes
   from Wikidata at run time, so test it on the deployed origin once.

## Launch checklist (spec section 14)

- [x] ≥300-artist pool (~550 live, all with a Hebrew Wikipedia article)
- [x] no `"other"` genre; every pooled artist resolves to one of the twelve genres
- [x] every pooled artist has a value for all six tiles (`src/lib/complete.ts`)
- [x] compare/normalizeHe/daily logic covered incl. DST and arrows
- [x] full game playable on 360px, keyboard-only, screen reader
- [x] RTL correct; storage-disabled safe; reload restores the board
- [x] colorblind + reduced motion
- [x] first load < 250 KB gzipped (JS ~90 KB; nothing else to download)
- [x] CI runs lint + tsc + vitest
- [ ] first-load wait (6–30s) judged acceptable in a real browser
- [ ] `OWNER_NAME` and `REPORT_EMAIL` set (legal pages + accessibility contact)
- [x] daily answers limited to the 250 most-viewed artists on Hebrew Wikipedia

## Legal pages

Footer links (also reachable as `#privacy`, `#terms`, `#accessibility`) open
three Hebrew pages whose text lives in `src/legal.he.ts`:

- **מדיניות פרטיות** — no accounts, cookies, analytics or ads; what is kept in
  localStorage/IndexedDB and for how long; which third-party services the
  browser contacts (GitHub Pages, Wikimedia, MusicBrainz, Deezer).
- **תנאי שימוש** — free, as-is, no accuracy warranty, limitation of liability,
  IP and non-affiliation, takedown requests, Israeli law / Tel Aviv courts.
- **הצהרת נגישות** — IS 5568 / WCAG AA intent, what was done, known limits,
  accessibility contact (`OWNER_NAME`, `CONTACT_EMAIL`).

Related: Settings has a **מחיקת הנתונים שלי** button (wipes all local data);
Heebo is self-hosted via `@fontsource/heebo` (no Google Fonts requests); the
reveal card credits Deezer. If you add analytics, ads, accounts or a new data
source, update the privacy policy and `LEGAL_UPDATED` in the same change.

## Credits / licensing

Data: Wikidata (CC0), Wikipedia page views, MusicBrainz (CC0), Deezer API,
all queried at run time. No accounts, no analytics, no third-party cookies, and no
API keys.
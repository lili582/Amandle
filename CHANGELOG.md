# Changelog

All notable changes to Amandle. Versions follow [SemVer](https://semver.org/).

## [0.10.2] - 2026-11-06

### Changed
- Code split into modules, one folder per job: `artist/`, `text/`,
  `storage/`, `sources/`, `game/`, `pool/`, `data/`, `ui/` (replacing the
  flat `src/lib/`, `src/hooks/` and `src/components/`). Each has an
  `index.ts` that other modules import from. Tests moved to matching folders
  under `tests/`. No change to how the game plays. The map is in the README
  ("How the code is organised").
- `src/types.ts` split into `artist/types.ts` (the artist, the pool.json
  shape) and `game/types.ts` (tiles, guesses, saved board, stats,
  `GameData`).
- `isComplete` / `missingFields` are the only names for the "every tile
  filled" check (the `hasAllData`, `hasAllDetails` and `missingDetails`
  aliases are gone).

### Removed
- Unused code: `lib/region.ts`, `lib/soundcloud.ts` (and their tests) and the
  `SHOW_IMAGES` setting.

## [0.10.1] - 2026-11-06

### Removed
- "מתוך 350 אמנים ישראלים" from the subtitle under the title.
- The game number ("משחק מספר N") above the guess counter.

## [0.10.0] - 2026-11-06

### Changed
- Popularity rank = Spotify monthly listeners (the number on the artist's
  page), highest first. Before, it was an estimate of listeners in Israel.
  Artists whose audience is mostly abroad are still left out. Takes effect at
  the next pool build; the live pool is unchanged.

### Added
- Automatic pool update every two weeks (`.github/workflows/update-pool.yml`):
  rebuilds `pool.json` when the live one is 13+ days old and deploys it to
  Vercel. Needs the `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`
  secrets.
- Safety check before deploying (`npm run check:pool`, `src/lib/poolCheck.ts`):
  no deploy when the new pool has fewer than 300 artists or more than 30% of
  it changed. The run summary lists who joined, left and moved 20+ places.

### Removed
- GitHub Pages deploy (`.github/workflows/deploy.yml`); the site is on Vercel.
- `deploy-vercel.bat` (`build-and-deploy.bat` deploys), `push-fix.bat`,
  `push-fix.sh` and old log files.

### Docs
- README rewritten to match how the game works now (pool.json, 350 artists,
  Vercel, the two-week update).

## [0.9.0] - 2026-11-06

### Changed
- Swapped five artists: שריף, נועם קלינשטיין, דן תורן, השמחות and האחים צברי
  are in; נמואל, חנן יובל, מוטי שטיינמץ, חיים ישראל and מאי ספדיה are out.
- Removed artists are on an exclusion list (`EXCLUDED_QIDS`), so the nightly
  build won't bring them back. Still 350 artists.

## [0.8.0] - 2026-11-06

### Changed
- The pool is the 350 most popular artists (`POOL_SIZE` 1000 → 350), and every
  one of them can be the daily answer. The popularity tile's help text now says
  1–350.

### Added
- 16 artists to fill the pool to 350: איציק דדיה, חיים ישראל, נעמי שמר, מוטי שטיינמץ, חנן יובל, דנה ברגר, שושנה דמארי, נמואל, הפרברים, דקלון, יזהר כהן, עדן אלנה, אילן וירצברג, חלב ודבש, ציון גולן, מאיה בוסקילה.
  149 of the 350 are hand-checked.

## [0.7.0] - 2026-11-06

### Changed
- Every artist in the pool can now be the daily answer, not only the top 150
  (`ANSWER_POOL_SIZE` = `POOL_SIZE`). The answer schedule is recomputed, so the
  day's answer may change once when this is deployed.

## [0.6.0] - 2026-11-05

### Added
- שחר אבן צור, חמי רודנר, ליהי טולדנו, שאזאמאט, הבילויים, המכשפות (hand-checked
  against Hebrew Wikipedia). The pool is now 334 artists; 133 of them hand-checked.

## [0.5.0] - 2026-11-05

### Added
- 55 more artists (Spotify Israel daily charts and well-known names, each
  checked against Hebrew Wikipedia): קפה שחור חזק, יצחק קלפטר, גיא מזיג, שי צברי, מיקה משה, אושיק לוי, ריף כהן, החלונות הגבוהים, אריק לביא, זקני צפת, תמיר בר, גיא ויהל, יוסי שטרית, שקד קוממי, רוחמה רז, עדי ביטי, טדי נגוסה, סיון טלמור, יפה ירקוני, אלון אולארצ'יק, דוד ד'אור, דנה אינטרנשיונל, פבלו רוזנברג, עידן יניב, סגיב כהן, אביאור מלסה, אהרן רזאל, דני ליטני, גבע אלון, החצר האחורית, צוקוש, יעל דקלבאום, אלי לוזון, בן סנוף, רבקה זהר, אורנה ומשה דץ, ערן צור, אנדרדוג, טל טירנגל, אבנר גדסי, רגב הוד, שולה חן, נופר סלמאן, דורית ראובני, עמיר לב, אלון דה לוקו, ג'קי מקייטן, עוזיה צדוק, דודו אלהרר, ששי קשת, אסתר עופרים, מיכאל בן דוד, קובי מרימי, יהלי סובול, בועז מעודה.
  The pool is now 328 artists; 127 of them hand-checked.

### Fixed
- New artists didn't show up after a deploy until the next day: players'
  cached pool is now keyed by the build, so every deploy replaces it at once.
  `DATA_SCHEMA_VERSION` v13.

## [0.4.0] - 2026-11-03

### Added
- פול טראנק (#24) and אביהו פנחסוב (מועדון הקצב, #74), plus known names that
  are below the listener floor: אבי ביטר, שי גבסו, אלישע בנאי, חן אהרוני,
  שירה מרגלית, מאי ספדיה, אלין גולן, ניב דמירל, נופיה, אליאב זוהר, עטרה
  אוריה, עדן דרסו, איציק שמלי and מאור אשכנזי. The pool is now 273 artists;
  72 of them hand-checked.

## [0.3.0] - 2026-11-03

### Added
- 11 more well-known artists: איב אנד ליר, קוקי לבנה, עומרי סבח, אתניקס,
  כנסיית השכל, קובי אפללו, עופר לוי, מידד טסה, בנזין, איציק קלה and
  שימי תבורי. The pool is now 257 artists; 56 of them hand-checked.

## [0.2.0] - 2026-11-03

### Added
- 20 artists trending in Israel (Spotify Israel charts) that were missing:
  סטילה, נס, יאנג בוטה, שרק, גל אדם, ישי לוי, וייב איש, נורוז, גלעד שגב,
  מאור אדרי, יונתן קלימי, רון בוחניק, ניר כנען, מושיקו מור, ענבל ביבי,
  נוי פדלון, כפיר צפריר, דודו פארוק, אלה לי and אמיר ובן. The pool is now
  246 artists; 45 of them hand-checked.

## [0.1.1] - 2026-11-03

### Fixed
- איתי לוי: age (Wikidata has his birth as 1888 instead of 1988) and picture
  (the Deezer name search found an empty "Itay Levi" profile; his is "Itay Levy").
- אייל גולן and אליעד נחום: career-start years that came before they were 8.
- Deezer lookups now take the exact-name match with the most fans, not the
  first result, so an empty duplicate profile can't supply the photo.
- An age over 100 for a living artist counts as unknown, so a date typo can't
  reach a tile.

## [0.1.0] - 2026-11-02

First versioned release.

### Added
- Hand-checked artists (`src/lib/curatedArtists.ts`): 22 well-known artists the
  automatic pipeline kept missing are always in the pool, including איפה הילד,
  מיכאל סוויסה, אופק אדנק, בן צור, ששון איפרם שאולוב, מור, טונה, בר צברי,
  מרגי, התקווה 6 and עפרה חזה.
- Every artist's picture now comes from their Spotify profile, baked into
  `pool.json` by the nightly build.

### Fixed
- סטטיק showed someone else's photo (a stray Deezer profile).
- רוני דלומי's genre is פופ (the fix from 2026-10-28 is now deployed).
- Listeners in Israel are estimated from the whole audience, not only the
  top five cities, so mid-size artists are no longer cut by the listener floor.
- A date-dependent storage test that started failing in November 2026.

### Changed
- `DATA_SCHEMA_VERSION` v12 and enrichment cache `enrich:v3:`: players drop
  cached pools and cached Deezer results.

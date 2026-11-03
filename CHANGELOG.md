# Changelog

All notable changes to Amandle. Versions follow [SemVer](https://semver.org/).

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

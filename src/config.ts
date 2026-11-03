// Central app configuration. Rename the game here only.
export const GAME_NAME = 'אמנדל'
export const GAME_URL = 'https://lili582.github.io/amandle/'
// Owner's inbox for data corrections (mailto in the footer and end dialog).
export const REPORT_EMAIL = 'owner@example.com' // TODO: set before launch

// Legal pages (privacy policy, terms of use, accessibility statement).
// The site operator's name, shown as the party responsible for the site and as
// the accessibility contact person required by Israeli accessibility rules.
export const OWNER_NAME = 'שם בעלת האתר' // TODO: set before launch
// Contact for privacy, accessibility and copyright requests.
export const CONTACT_EMAIL = REPORT_EMAIL
// Shown as "last updated" on the legal pages. Bump when you change their text.
export const LEGAL_UPDATED = '21.10.2026'
export const MAX_GUESSES = 10
// Israeli calendar date when the daily puzzle series starts.
export const LAUNCH_DATE = '2026-10-01'
export const TZ = 'Asia/Jerusalem'
export const SHOW_IMAGES = false

// How long a Wikidata-derived dataset is considered fresh before we re-query
// the endpoint. Also pins the daily puzzle: within the TTL every player reuses
// the same cached pool, so the derived answer cannot shift mid-day.
export const DATA_CACHE_TTL_MS = 24 * 60 * 60 * 1000

// Bump together with a breaking shape change of the cached dataset. The old
// value is keyed into IndexedDB, so bumping it discards stale caches.
export const DATA_SCHEMA_VERSION = 'v12'

// How many of the most popular artists can be a daily answer. Everyone in the
// pool can still be guessed.
export const ANSWER_POOL_SIZE = 150

// The pool: the Hebrew-singing Israeli artists with the most Spotify monthly
// listeners *in Israel*. Built by scripts/build-pool.ts, served as data/pool.json.
export const POOL_SIZE = 1000

// An artist enters the pool only when at least this share of the listeners in
// their Spotify top cities are in Israel. Keeps out Israeli-born acts whose
// audience is abroad (Temper City, Linet, Vini Vici), which Israeli players
// wouldn't recognise.
export const MIN_ISRAEL_SHARE = 0.5

// Minimum Spotify monthly listeners *in Israel* to be in the pool at all
// (neither guessable nor a daily answer). Cuts the long tail of acts few
// players know (סגיב כהן ~36K, דוד ד'אור ~23K, שרון חזיז ~4K, names with a
// few hundred listeners). ~210 artists clear it (Oct 2026).
export const MIN_LISTENERS_IL = 40_000

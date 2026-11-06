// data/ — Play time: get the pool into the browser. pool.json first, then the day's
// IndexedDB copy, then a live Wikidata fallback. Returns the pool and the
// derived answer schedule.
//
// This file is the module's interface: other modules import from here only.
// Files inside data/ import each other directly.

export { loadGameData } from './dataLoader'
export type { DataSource, LoadResult } from './dataLoader'

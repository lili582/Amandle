// game/ — The rules of a round: the daily answer, comparing a guess to the answer
// (tiles), search, share text, stats, and useGame, the React hook that runs
// one day's game on top of them.
//
// This file is the module's interface: other modules import from here only.
// Files inside game/ import each other directly.

export { isComplete, missingFields } from './complete'
export { dayNumberFor, israelDateString, israelMidnightEpoch, rendezvousSchedule, tomorrowIsraelDateString } from './daily'
export { tileValue } from './formatTile'
export { reportLink } from './report'
export { buildSearchIndex, searchArtists } from './search'
export type { SearchEntry, SearchResult } from './search'
export { buildShareText, shareText } from './share'
export { winRate } from './stats'
export { TILE_FIELDS } from './types'
export type { GameData, Match, SaveState, StatsState, TileField, TileResult } from './types'
export { useGame } from './useGame'
export type { GameMode } from './useGame'

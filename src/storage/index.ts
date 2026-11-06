// storage/ — Everything saved in the player's browser: boards, stats and settings
// (localStorage), the cached pool and enrichments (IndexedDB), and
// "delete my data".
//
// This file is the module's interface: other modules import from here only.
// Files inside storage/ import each other directly.

export { deleteAllData } from './deleteData'
export { idbRead, idbWrite } from './idb'
export { cleanupOldGames, emptyStats, loadGame, loadSettings, loadStats, markStatsRecorded, saveGame, saveSettings, saveStats, statsRecorded } from './storage'
export type { Settings } from './storage'

// pool/ — Build time only (Node, scripts/): fill the gaps in a candidate list and
// decide whether a freshly built pool.json is safe to deploy.
//
// This file is the module's interface: other modules import from here only.
// Files inside pool/ import each other directly.

export { fillUntil } from './fill'
export { checkPool, isStale, poolAgeDays, summaryMarkdown } from './poolCheck'
export type { PoolFile } from './poolCheck'

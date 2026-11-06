// Fills missing tile data in an existing pool.json without re-reading Spotify:
//
//   npm run fill:pool                         -> rewrites public/data/pool.json
//   npm run fill:pool -- --in a.json --out b.json
//
// Artists that MusicBrainz/Deezer can't complete are removed and the rest are
// re-ranked 1..N in their existing order. The nightly build-pool already does
// this; use this script to repair a pool you already have.

import { readFile, writeFile } from 'node:fs/promises'
import { POOL_SIZE } from '../src/config.ts'
import { fillUntil } from '../src/pool/index.ts'
import { isComplete, missingFields } from '../src/game/index.ts'
import { assignRanks } from '../src/artist/index.ts'
import type { PrebuiltPool } from '../src/artist/index.ts'

const args = process.argv.slice(2)
const arg = (name: string, dflt: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt)
const IN = arg('--in', 'public/data/pool.json')
const OUT = arg('--out', IN)
const CONTACT = process.env.CONTACT_EMAIL || 'https://github.com/lili582/amandle'

async function main() {
  const pool = JSON.parse(await readFile(IN, 'utf8')) as PrebuiltPool
  const ordered = [...pool.artists].sort((x, y) => x.popularityRank - y.popularityRank)
  const gaps = ordered.filter((a) => missingFields(a).length > 0)
  console.log(`${IN}: ${ordered.length} artists, ${gaps.length} missing at least one tile`)
  const counts: Record<string, number> = {}
  for (const a of gaps) for (const f of missingFields(a)) counts[f] = (counts[f] ?? 0) + 1
  console.log('Missing by tile:', counts)

  const report = await fillUntil(ordered, POOL_SIZE, {
    userAgent: `AmandleBot/1.0 (${CONTACT})`,
    log: (m) => console.log(m),
  })
  const artists = assignRanks(report.complete, POOL_SIZE)
  if (artists.some((a) => !isComplete(a))) throw new Error('internal: an incomplete artist survived the fill')

  await writeFile(OUT, JSON.stringify({ ...pool, artists } satisfies PrebuiltPool))
  console.log(`Completed ${report.filled}, removed ${report.dropped.length}. Wrote ${artists.length} artists to ${OUT}`)
  for (const d of report.dropped) console.log(`  removed ${d.artist.nameHe} (${d.artist.id}): ${d.missing.join(', ')}`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

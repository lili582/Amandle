// Checks a freshly built pool against the live one before it is deployed.
//
//   npm run check:pool -- --next public/data/pool.json --prev live-pool.json [--force]
//   npm run check:pool -- --stale live-pool.json
//
// --next/--prev: prints the change summary (also to the GitHub Actions run
// summary) and exits 1 when the new pool looks broken (src/lib/poolCheck.ts).
// A missing or unreadable --prev only skips the comparison.
// --stale: prints "stale=true|false" for GITHUB_OUTPUT (missing file = stale).

import { appendFile, readFile } from 'node:fs/promises'
import { checkPool, isStale, poolAgeDays, summaryMarkdown, type PoolFile } from '../src/lib/poolCheck.ts'

const args = process.argv.slice(2)
const arg = (name: string) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

async function readPool(path: string | undefined): Promise<PoolFile | null> {
  if (!path) return null
  try {
    const json = JSON.parse(await readFile(path, 'utf8')) as PoolFile
    return Array.isArray(json.artists) ? json : null
  } catch {
    return null
  }
}

async function main(): Promise<number> {
  const stalePath = arg('--stale')
  if (stalePath !== undefined) {
    const live = await readPool(stalePath)
    const age = live ? poolAgeDays(live.generatedAt) : Number.POSITIVE_INFINITY
    console.log(`Live pool age: ${Number.isFinite(age) ? `${age.toFixed(1)} days` : 'unknown'}`)
    console.log(`stale=${isStale(live)}`)
    return 0
  }

  const next = await readPool(arg('--next') ?? 'public/data/pool.json')
  if (!next) {
    console.error('No new pool to check.')
    return 1
  }
  const prev = await readPool(arg('--prev'))
  const result = checkPool(prev, next, { force: args.includes('--force') })
  const md = summaryMarkdown(result, next)
  console.log(md)
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, md + '\n')
  return result.ok ? 0 : 1
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  },
)

// Packs the site for Vercel in the Build Output API format (.vercel/output),
// so one deploy carries both the static game and the /api/guess function.
// Runs as the last step of `npm run build`, after `vite build` wrote dist/.
//
//   .vercel/output/config.json                     routes
//   .vercel/output/static/                         copy of dist/
//   .vercel/output/functions/api/guess.func/
//     index.mjs        server/vercel.ts bundled with everything it imports
//     pool.json        this deploy's pool (when public/data/pool.json exists)
//     .vc-config.json  Node.js runtime settings
//
// Vercel uses .vercel/output as is when the build command creates it.

import { build } from 'esbuild'
import { cp, mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const OUT = '.vercel/output'
const FUNC = join(OUT, 'functions/api/guess.func')
const POOL = 'public/data/pool.json'

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function main(): Promise<void> {
  if (!(await exists('dist/index.html'))) throw new Error('dist/ is missing: run vite build first')
  await rm(OUT, { recursive: true, force: true })

  await cp('dist', join(OUT, 'static'), { recursive: true })

  await mkdir(FUNC, { recursive: true })
  await build({
    entryPoints: ['server/vercel.ts'],
    outfile: join(FUNC, 'index.mjs'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    legalComments: 'none',
    logLevel: 'warning',
  })
  await writeFile(
    join(FUNC, '.vc-config.json'),
    JSON.stringify(
      { runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs', shouldAddHelpers: false, maxDuration: 60 },
      null,
      2,
    ),
  )
  if (await exists(POOL)) {
    await cp(POOL, join(FUNC, 'pool.json'))
  } else {
    console.warn(`${POOL} not found: /api/guess will use the live Wikidata pool, like the browser.`)
  }

  await writeFile(
    join(OUT, 'config.json'),
    JSON.stringify(
      {
        version: 3,
        routes: [
          { handle: 'filesystem' },
          // Unknown paths get the small page that sends players home.
          { src: '/(.*)', status: 404, dest: '/404.html' },
        ],
      },
      null,
      2,
    ),
  )
  console.log(`Packed ${OUT} (static site + /api/guess)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

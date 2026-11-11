/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { pathToFileURL } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const GUESS_API = '/api/guess'

// /api/guess on the local servers, so `npm run dev` (start-game.bat) and
// `npm run preview` play exactly like the deployed site:
//   dev:     loads server/node.ts through Vite (no build needed). Future days
//            are allowed, for the ?day=N preview.
//   preview: runs the bundled function from .vercel/output (npm run build).
// The seed comes from AMANDLE_SEED in .env.local (optional locally).
function guessApi(): Plugin {
  type Handle = (req: IncomingMessage, res: ServerResponse) => Promise<void>
  type NodeModule = {
    handleNodeRequest: (
      req: IncomingMessage,
      res: ServerResponse,
      opts: { poolFile: string; env: Record<string, string | undefined>; allowFuture: boolean },
    ) => Promise<void>
  }
  const serve = (load: () => Promise<Handle>) => (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url?.split('?')[0] !== GUESS_API) return next()
    load()
      .then((handle) => handle(req, res))
      .catch((err: unknown) => {
        console.error(err)
        res.statusCode = 500
        res.end('{"error":"unavailable"}')
      })
  }
  return {
    name: 'amandle-guess-api',
    configureServer(server) {
      const env = { ...process.env, ...loadEnv(server.config.mode, process.cwd(), 'AMANDLE_') }
      server.middlewares.use(
        serve(async () => {
          const mod = (await server.ssrLoadModule('/server/node.ts')) as NodeModule
          return (req, res) => mod.handleNodeRequest(req, res, { poolFile: 'public/data/pool.json', env, allowFuture: true })
        }),
      )
    },
    configurePreviewServer(server) {
      const env = { ...process.env, ...loadEnv(server.config.mode, process.cwd(), 'AMANDLE_') }
      const fn = pathToFileURL(`${process.cwd()}/.vercel/output/functions/api/guess.func/index.mjs`).href
      server.middlewares.use(
        serve(async () => {
          Object.assign(process.env, env)
          const mod = (await import(/* @vite-ignore */ fn)) as { default: Handle }
          return mod.default
        }),
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), guessApi()],
  // A new id on every build: the players' cached pool (dataLoader.ts) is keyed
  // by it, so a deploy with new artists reaches them right away instead of
  // the next day.
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(Date.now().toString(36)),
  },
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'jsdom',
    globals: true,
  },
})

import type { IncomingMessage, ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import { seedConfigFromEnv } from './answers'
import { handleGuess } from './handler'

// Plain Node (req, res) adapter for handleGuess. Used by the Vercel function
// (server/vercel.ts) and by the Vite dev / preview server (vite.config.ts).

const MAX_BODY_BYTES = 16 * 1024

async function readJson(req: IncomingMessage & { body?: unknown }): Promise<unknown> {
  // Some hosts parse the body before we see it.
  if (req.body !== undefined) {
    if (typeof req.body === 'string') return JSON.parse(req.body)
    if (req.body instanceof Uint8Array) return JSON.parse(Buffer.from(req.body).toString('utf8'))
    return req.body
  }
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string)
    size += b.length
    if (size > MAX_BODY_BYTES) throw new Error('body too large')
    chunks.push(b)
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null
}

export interface NodeHandlerOptions {
  // Path of pool.json for this deploy (missing file = live Wikidata pool).
  poolFile: string | URL
  env?: Record<string, string | undefined>
  allowFuture?: boolean
}

let warnedNoSeed = false

export async function handleNodeRequest(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
  opts: NodeHandlerOptions,
): Promise<void> {
  const env = opts.env ?? process.env
  const seeds = seedConfigFromEnv(env)
  if (!seeds.secret && !warnedNoSeed) {
    warnedNoSeed = true
    console.warn('[api/guess] AMANDLE_SEED is not set: answers use the public seed and can be worked out from the code.')
  }
  let body: unknown
  try {
    body = await readJson(req)
  } catch {
    body = null
  }
  const result = await handleGuess(req.method, body, {
    seeds,
    allowFuture: opts.allowFuture,
    readPoolFile: async () => {
      try {
        return JSON.parse(await readFile(opts.poolFile, 'utf8'))
      } catch {
        return null
      }
    },
  })
  res.statusCode = result.status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  // Every answer is personal to the request (and may reveal the answer):
  // never cache it anywhere.
  res.setHeader('Cache-Control', 'no-store')
  if (result.status === 405) res.setHeader('Allow', 'POST')
  res.end(JSON.stringify(result.body))
}

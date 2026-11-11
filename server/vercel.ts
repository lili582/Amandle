import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleNodeRequest } from './node'

// The Vercel function behind /api/guess. scripts/build-vercel-output.ts
// bundles this file (and everything it imports) into
// .vercel/output/functions/api/guess.func/index.mjs, with this deploy's
// pool.json copied next to it.

const POOL_FILE = new URL('./pool.json', import.meta.url)

export default function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return handleNodeRequest(req, res, { poolFile: POOL_FILE })
}

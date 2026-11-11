import type { GuessError, GuessRequest, GuessResponse } from '../src/game/guessProtocol'
import { scoreGuess, type SeedConfig } from './answers'
import { loadServerPool, type PoolSource } from './pool'

// POST /api/guess, independent of the HTTP server (Vercel function, Vite dev
// server, tests): body in, status + JSON out.

export interface HandlerDeps extends PoolSource {
  seeds: SeedConfig
  now?: () => number
  allowFuture?: boolean
}

export interface HandlerResult {
  status: number
  body: GuessResponse | GuessError
}

const MAX_ID_LENGTH = 200

function parseRequest(raw: unknown): GuessRequest | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<GuessRequest>
  const okId = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= MAX_ID_LENGTH
  if (typeof r.date !== 'string' || !okId(r.guess)) return null
  const previous = r.previous ?? []
  if (!Array.isArray(previous) || previous.length > 50 || !previous.every(okId)) return null
  return { date: r.date, guess: r.guess, previous }
}

export async function handleGuess(method: string | undefined, rawBody: unknown, deps: HandlerDeps): Promise<HandlerResult> {
  if (method !== 'POST') return { status: 405, body: { error: 'badRequest' } }
  const req = parseRequest(rawBody)
  if (!req) return { status: 400, body: { error: 'badRequest' } }
  const now = deps.now?.() ?? Date.now()
  let pool
  try {
    pool = await loadServerPool(deps, now)
  } catch (err) {
    console.error('[api/guess] could not load the pool', err)
    return { status: 503, body: { error: 'unavailable' } }
  }
  const r = scoreGuess({ ...pool, seeds: deps.seeds, ...req, now, allowFuture: deps.allowFuture })
  return r.ok ? { status: 200, body: r.body } : { status: r.status, body: { error: r.error } }
}

import { GUESS_API_PATH, type GuessError, type GuessRequest, type GuessResponse } from './guessProtocol'
import { TILE_FIELDS } from './types'

// Asks the server how a guess scores. The browser never knows the answer
// while a round is running; it learns it from `answerId` when the round ends.

export type CheckGuess = (req: GuessRequest, signal?: AbortSignal) => Promise<GuessResponse>

export class GuessApiError extends Error {
  readonly code: string
  constructor(code: string) {
    super(`guess API: ${code}`)
    this.code = code
  }
}

const TIMEOUT_MS = 15_000

function isResponse(x: unknown): x is GuessResponse {
  if (!x || typeof x !== 'object') return false
  const r = x as Partial<GuessResponse>
  return (
    typeof r.correct === 'boolean' &&
    Array.isArray(r.tiles) &&
    r.tiles.length === TILE_FIELDS.length &&
    r.tiles.every((t, i) => t && t.field === TILE_FIELDS[i]) &&
    (r.answerId === undefined || typeof r.answerId === 'string')
  )
}

export function makeCheckGuess(fetchImpl: typeof fetch = (...a) => fetch(...a)): CheckGuess {
  return async (req, signal) => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    const onAbort = () => ctrl.abort()
    signal?.addEventListener('abort', onAbort)
    try {
      let res: Response
      try {
        res = await fetchImpl(GUESS_API_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
          signal: ctrl.signal,
          cache: 'no-store',
        })
      } catch {
        throw new GuessApiError('network')
      }
      let body: unknown = null
      try {
        body = await res.json()
      } catch {
        // not JSON (an HTML 404 page when there is no API, a proxy error)
      }
      if (!res.ok) throw new GuessApiError((body as Partial<GuessError> | null)?.error ?? `http${res.status}`)
      if (!isResponse(body)) throw new GuessApiError('badResponse')
      return body
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
  }
}

export const checkGuess: CheckGuess = makeCheckGuess()

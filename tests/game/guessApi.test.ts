import { describe, it, expect } from 'vitest'
import { makeCheckGuess, GuessApiError } from '../../src/game/guessApi'
import { TILE_FIELDS } from '../../src/game/types'

const tiles = TILE_FIELDS.map((field) => ({ field, match: 'wrong' as const }))
const req = { date: '2026-11-20', guess: 'Q1', previous: [] }

function respond(status: number, body: unknown): typeof fetch {
  return (async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })) as typeof fetch
}

describe('checkGuess', () => {
  it('posts the guess and returns the scored row', async () => {
    let sent: RequestInit | undefined
    const check = makeCheckGuess((async (_url: string, init?: RequestInit) => {
      sent = init
      return new Response(JSON.stringify({ tiles, correct: false }))
    }) as typeof fetch)
    expect(await check(req)).toEqual({ tiles, correct: false })
    expect(sent?.method).toBe('POST')
    expect(JSON.parse(String(sent?.body))).toEqual(req)
  })

  it('turns server errors into GuessApiError with the server code', async () => {
    await expect(makeCheckGuess(respond(403, { error: 'futureDate' }))(req)).rejects.toMatchObject({ code: 'futureDate' })
    // No API on this host (an HTML 404 page).
    await expect(makeCheckGuess(respond(404, '<html>'))(req)).rejects.toMatchObject({ code: 'http404' })
  })

  it('rejects a malformed answer and network failures', async () => {
    await expect(makeCheckGuess(respond(200, { tiles: [], correct: true }))(req)).rejects.toBeInstanceOf(GuessApiError)
    const offline = (() => Promise.reject(new TypeError('offline'))) as typeof fetch
    await expect(makeCheckGuess(offline)(req)).rejects.toMatchObject({ code: 'network' })
  })
})

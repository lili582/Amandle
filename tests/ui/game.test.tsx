import { describe, expect, it, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Artist } from '../../src/artist/types'
import { makeArtist } from '../fixtures'

// The live MusicBrainz/Deezer lookups are not part of these tests.
vi.mock('../../src/sources/enrich', () => ({ enrichArtist: () => Promise.resolve() }))
import type { GameData } from '../../src/game/types'
import { useGame } from '../../src/game/useGame'
import { Game } from '../../src/ui/Game'
import { strings } from '../../src/text/strings.he'
import { loadStats, saveStats, emptyStats, loadGame } from '../../src/storage/storage'
import { dayNumberFor, israelDateString, yesterdayIsraelDateString } from '../../src/game/daily'
import type { GameMode } from '../../src/game/useGame'
import type { CheckGuess } from '../../src/game/guessApi'
import { answerIdFor, scoreGuess, type SeedConfig } from '../../server/answers'

function artist(id: string, nameHe: string): Artist {
  return makeArtist({ id, nameHe })
}

const ART_A = artist('a', 'אמן א')
const ART_B = artist('b', 'אמן ב')
const ARTISTS = [ART_A, ART_B]

function makeData(): GameData {
  return { artists: ARTISTS }
}

// The server, in process: the real scoring rules with a test seed, standing in
// for POST /api/guess.
const SEEDS: SeedConfig = { secret: 'test-seed', from: '2000-01-01' }
const BY_ID = new Map(ARTISTS.map((a) => [a.id, a]))
const serverCheck: CheckGuess = async (req) => {
  const r = scoreGuess({ artists: ARTISTS, byId: BY_ID, seeds: SEEDS, ...req, now: Date.now() })
  if (!r.ok) throw new Error(r.error)
  return r.body
}
const api = vi.hoisted(() => ({ calls: 0 }))
vi.mock('../../src/game/guessApi', async (orig) => ({
  ...(await orig<typeof import('../../src/game/guessApi')>()),
  checkGuess: (...args: Parameters<CheckGuess>) => {
    api.calls++
    return serverCheck(...args)
  },
}))

// The target depends on the day; ask the in-process server so these tests
// pass on any calendar day.
const targetIdOf = (_data?: GameData, date = israelDateString(new Date())) => answerIdFor(ARTISTS, date, SEEDS)!

function Harness({ data, mode }: { data: GameData; mode?: GameMode }) {
  const g = useGame(data, mode)
  return (
    <div>
      <span data-status={g.status} />
      <span data-count={String(g.guesses.length)} />
      <span data-target={g.target?.id ?? ''} />
      <button data-testid="guess-a" onClick={() => g.submitGuess(ART_A)} />
      <button data-testid="guess-b" onClick={() => g.submitGuess(ART_B)} />
    </div>
  )
}

function setup() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  return { container, root }
}

function tearDown(root: Root, container: HTMLElement) {
  act(() => {
    root.unmount()
  })
  document.body.removeChild(container)
}

// Guesses resolve after the (mocked) enrichment promise, so flush it.
async function click(container: HTMLElement, id: string) {
  await act(async () => {
    const el = container.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement | null
    el?.click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('useGame (mounted in jsdom)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    saveStats(emptyStats())
  })

it('guessing a wrong artist keeps the game playing and survives a reload', async () => {
    const { container, root } = setup()
    act(() => root.render(<Harness data={makeData()} />))
    const targetId = targetIdOf(makeData())
    const wrongId = targetId === 'a' ? 'b' : 'a'
    await click(container, `guess-${wrongId}`)
    expect(container.querySelector('[data-status]')?.getAttribute('data-status')).toBe('playing')
    expect(container.querySelector('[data-count]')?.getAttribute('data-count')).toBe('1')
    tearDown(root, container)

    // Mid-game reload: the board must restore the guess in progress.
    const again = setup()
    act(() => again.root.render(<Harness data={makeData()} />))
    expect(again.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe('playing')
    expect(again.container.querySelector('[data-count]')?.getAttribute('data-count')).toBe('1')
    tearDown(again.root, again.container)
  })

it('guessing the target wins immediately and records the result exactly once', async () => {
    const { container, root } = setup()
    act(() => root.render(<Harness data={makeData()} />))
    const targetId = targetIdOf(makeData())
    await click(container, `guess-${targetId}`)
    expect(container.querySelector('[data-status]')?.getAttribute('data-status')).toBe('won')
    expect(container.querySelector('[data-count]')?.getAttribute('data-count')).toBe('1')

    const stats = loadStats()
    expect(stats.played).toBe(1)
    expect(stats.wins).toBe(1)
    expect(stats.dist[0]).toBe(1)
    tearDown(root, container)

    // "Reload": a fresh root restores the saved game; stats are not re-counted.
    const again = setup()
    act(() => again.root.render(<Harness data={makeData()} />))
    expect(again.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe('won')
    expect(again.container.querySelector('[data-count]')?.getAttribute('data-count')).toBe('1')
    expect(loadStats().played).toBe(1)
    expect(loadStats().wins).toBe(1)
    tearDown(again.root, again.container)
  })

it('submits after a win are ignored', async () => {
    const { container, root } = setup()
    act(() => root.render(<Harness data={makeData()} />))
    const targetId = targetIdOf(makeData())
    await click(container, `guess-${targetId}`)
    await click(container, `guess-${targetId}`)
expect(loadStats().played).toBe(1)
    expect(container.querySelector('[data-count]')?.getAttribute('data-count')).toBe('1')
    tearDown(root, container)
  })

  it('the win dialog close button dismisses the end modal', async () => {
    const { container, root } = setup()
    act(() => root.render(<Game data={makeData()} source="network" />))

    const targetId = targetIdOf(makeData())
    const targetName = targetId === 'a' ? ART_A.nameHe : ART_B.nameHe

    const input = container.querySelector('input.combo-input') as HTMLInputElement
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )!.set!
      setter.call(input, targetName)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(container.querySelector<HTMLElement>('li.combo-option')).not.toBeNull()
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await new Promise((r) => setTimeout(r, 0))
    })
    const dialog = container.querySelector('.modal')
    expect(dialog).not.toBeNull()
    expect(dialog?.textContent).toContain(strings.winShort)
    // The reveal card shows the target artist after the round ends.
    expect(dialog?.querySelector('.reveal-name')?.textContent).toBe(targetName)
    expect(dialog?.querySelector('.end-headline')?.textContent).toContain(targetName)

    const close = container.querySelector<HTMLButtonElement>(`button[aria-label="${strings.close}"]`)
    expect(close).not.toBeNull()
    act(() => close?.click())
    expect(container.querySelector('.modal')).toBeNull()
    tearDown(root, container)
  })

  it('retro mode plays yesterday\'s artist, saves under yesterday and never touches stats', async () => {
    const data = makeData()
    const today = israelDateString(new Date())
    const yesterday = yesterdayIsraelDateString(today)
    const yTarget = targetIdOf(data, yesterday)

    const { container, root } = setup()
    act(() => root.render(<Harness data={data} mode="yesterday" />))
    // The answer is not known until the round ends.
    expect(container.querySelector('[data-target]')?.getAttribute('data-target')).toBe('')
    await click(container, `guess-${yTarget}`)
    expect(container.querySelector('[data-status]')?.getAttribute('data-status')).toBe('won')
    expect(container.querySelector('[data-target]')?.getAttribute('data-target')).toBe(yTarget)
    expect(loadGame(yesterday)?.status).toBe('won')
    expect(loadGame(today)).toBeNull()
    expect(loadStats().played).toBe(0)
    expect(loadStats().streak).toBe(0)
    tearDown(root, container)

    // Today's game is untouched and still records stats normally.
    const again = setup()
    act(() => again.root.render(<Harness data={data} />))
    expect(again.container.querySelector('[data-status]')?.getAttribute('data-status')).toBe('playing')
    expect(again.container.querySelector('[data-count]')?.getAttribute('data-count')).toBe('0')
    tearDown(again.root, again.container)
  })

  it('the header button switches to yesterday\'s game and back', async () => {
    const { container, root } = setup()
    act(() => root.render(<Game data={makeData()} source="network" />))
    const btn = container.querySelector<HTMLButtonElement>(`button[aria-label="${strings.btnYesterday}"]`)
    // Only offered once the series has a yesterday.
    if (dayNumberFor(israelDateString(new Date())) < 1) {
      expect(btn).toBeNull()
      tearDown(root, container)
      return
    }
    expect(btn).not.toBeNull()
    expect(container.querySelector('.retro-banner')).toBeNull()
    act(() => btn?.click())
    expect(container.querySelector('.retro-banner')?.textContent).toContain(strings.retroBanner)
    expect(btn?.getAttribute('aria-pressed')).toBe('true')
    const back = container.querySelector<HTMLButtonElement>('.retro-banner .link-btn')
    act(() => back?.click())
    expect(container.querySelector('.retro-banner')).toBeNull()
    tearDown(root, container)
  })

  it('does not know the answer while playing, and learns it on a win', async () => {
    const { container, root } = setup()
    act(() => root.render(<Harness data={makeData()} />))
    const targetId = targetIdOf()
    const wrongId = targetId === 'a' ? 'b' : 'a'
    await click(container, `guess-${wrongId}`)
    expect(container.querySelector('[data-target]')?.getAttribute('data-target')).toBe('')
    await click(container, `guess-${targetId}`)
    expect(container.querySelector('[data-target]')?.getAttribute('data-target')).toBe(targetId)
    expect(loadGame(israelDateString(new Date()))?.answerId).toBe(targetId)
    tearDown(root, container)
  })

  it('shows a notice and keeps the board when the server cannot be reached', async () => {
    const failing: CheckGuess = () => Promise.reject(new Error('offline'))
    function Failing() {
      const g = useGame(makeData(), 'daily', failing)
      return (
        <div>
          <span data-count={String(g.guesses.length)} />
          <span data-notice={g.notice ?? ''} />
          <span data-pending={String(g.pending)} />
          <button data-testid="guess-a" onClick={() => g.submitGuess(ART_A)} />
        </div>
      )
    }
    const { container, root } = setup()
    act(() => root.render(<Failing />))
    await click(container, 'guess-a')
    expect(container.querySelector('[data-count]')?.getAttribute('data-count')).toBe('0')
    expect(container.querySelector('[data-notice]')?.getAttribute('data-notice')).toBe('guessFailed')
    expect(container.querySelector('[data-pending]')?.getAttribute('data-pending')).toBe('false')
    tearDown(root, container)
  })

  it('a lost board saved before 0.11.0 gets no answer unless it really used every guess', async () => {
    const today = israelDateString(new Date())
    const targetId = targetIdOf()
    const wrongId = targetId === 'a' ? 'b' : 'a'
    // An old lost board: no answerId stored.
    window.localStorage.clear()
    const { saveGame } = await import('../../src/storage/storage')
    saveGame(today, {
      date: today,
      status: 'lost',
      guesses: [{ artistId: wrongId, tiles: (await serverCheck({ date: today, guess: wrongId, previous: [] })).tiles }],
    })
    const { container, root } = setup()
    await act(async () => {
      root.render(<Harness data={makeData()} />)
      await new Promise((r) => setTimeout(r, 0))
    })
    // One wrong guess is not a finished round for the server, so it keeps the
    // answer to itself; the board stays lost without a reveal.
    expect(container.querySelector('[data-status]')?.getAttribute('data-status')).toBe('lost')
    expect(container.querySelector('[data-target]')?.getAttribute('data-target')).toBe('')
    tearDown(root, container)
  })
})

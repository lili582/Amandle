import { describe, expect, it, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Artist } from '../src/types'
import { makeArtist } from './fixtures'

// The live MusicBrainz/Deezer lookups are not part of these tests.
vi.mock('../src/lib/enrich', () => ({ enrichArtist: () => Promise.resolve() }))
import type { GameData } from '../src/lib/dataLoader'
import { useGame } from '../src/hooks/useGame'
import { Game } from '../src/Game'
import { strings } from '../src/strings.he'
import { loadStats, saveStats, emptyStats } from '../src/lib/storage'
import { answerForDay, dayNumberFor, israelDateString, yesterdayIsraelDateString } from '../src/lib/daily'
import { loadGame } from '../src/lib/storage'
import type { GameMode } from '../src/hooks/useGame'

function artist(id: string, nameHe: string): Artist {
  return makeArtist({ id, nameHe })
}

const ART_A = artist('a', 'אמן א')
const ART_B = artist('b', 'אמן ב')

function makeData(): GameData {
  return { artists: [ART_A, ART_B], schedule: ['a', 'b'] }
}

// The target depends on today's schedule index; derive it the same way useGame
// does so these tests pass on any calendar day.
const targetIdOf = (data: GameData) =>
  answerForDay(data.schedule, dayNumberFor(israelDateString(new Date())))

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
    const yTarget = answerForDay(data.schedule, dayNumberFor(today) - 1)

    const { container, root } = setup()
    act(() => root.render(<Harness data={data} mode="yesterday" />))
    expect(container.querySelector('[data-target]')?.getAttribute('data-target')).toBe(yTarget)
    await click(container, `guess-${yTarget}`)
    expect(container.querySelector('[data-status]')?.getAttribute('data-status')).toBe('won')
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
})

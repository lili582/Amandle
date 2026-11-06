import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Artist } from '../artist'
import type { GameStatus, GuessRecord, Match, SaveState, GameData } from './types'
import { TILE_FIELDS } from './types'
import { MAX_GUESSES } from '../config'
import { answerForDay, dayNumberFor, israelDateString, yesterdayIsraelDateString } from './daily'
import { compareArtist } from './compare'
import { enrichArtist } from '../sources'
import {
  loadGame,
  saveGame,
  cleanupOldGames,
  loadStats,
  saveStats,
  statsRecorded,
  markStatsRecorded,
} from '../storage'
import { recordResult } from './stats'

const GAME_STATUSES: readonly string[] = ['playing', 'won', 'lost']

function parseSaved(raw: SaveState | null, date: string): SaveState {
  if (
    raw &&
    raw.date === date &&
    Array.isArray(raw.guesses) &&
    GAME_STATUSES.includes(raw.status) &&
    // Boards saved by an older version used different tiles; start fresh.
    raw.guesses.every(
      (g) =>
        Array.isArray(g.tiles) &&
        g.tiles.length === TILE_FIELDS.length &&
        g.tiles.every((t, i) => t.field === TILE_FIELDS[i]),
    )
  ) {
    return { guesses: raw.guesses, status: raw.status, date }
  }
  return { guesses: [], status: 'playing', date }
}

// Dev preview: ?day=N overrides the current date for testing any day of the
// schedule. Gated behind DEV so a production build ignores the query string.
// Only a present, non-empty digit sequence counts — otherwise fall back to the
// real calendar date (Number(null) is 0, which would pin every dev session to
// the same day-0 artist).
function resolveDayNumber(today: string, isDev: boolean): number {
  if (isDev) {
    try {
      const raw = new URLSearchParams(window.location.search).get('day')
      if (raw !== null && raw.trim() !== '' && /^\d+$/.test(raw.trim())) {
        return Math.floor(Number(raw))
      }
    } catch {
      // ignore malformed / blocked window access
    }
  }
  return dayNumberFor(today)
}

// 'daily' is today's puzzle. 'yesterday' is the retro mode: replay only the
// previous day's artist. It shares yesterday's saved board (so a game already
// played yesterday shows its result) but never touches stats or the streak.
export type GameMode = 'daily' | 'yesterday'

export interface UseGame {
  mode: GameMode
  today: string
  playDate: string
  dayNumber: number
  target: Artist | null
  guesses: GuessRecord[]
  status: GameStatus
  maxGuesses: number
  artistsById: ReadonlyMap<string, Artist>
  guessedIds: ReadonlySet<string>
  shareRows: Match[][]
  notice: string | null
  pending: boolean
  submitGuess: (artist: Artist) => void
  clearNotice: () => void
}

export function useGame(data: GameData, mode: GameMode = 'daily'): UseGame {
  const artistsById = useMemo(() => new Map(data.artists.map((a) => [a.id, a])), [data])
  const [today, setToday] = useState<string>(() => israelDateString(new Date()))
  const isDev = (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true
  const retro = mode === 'yesterday'
  // The date whose board is played and saved: today, or yesterday in retro mode.
  const playDate = retro ? yesterdayIsraelDateString(today) : today
  const dayNumber = useMemo(
    () => resolveDayNumber(today, isDev) - (retro ? 1 : 0),
    [today, isDev, retro],
  )
  const targetId = answerForDay(data.schedule, dayNumber)
  const target = artistsById.get(targetId) ?? null

  const [game, setGame] = useState<SaveState>(() => parseSaved(loadGame(playDate), playDate))
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [, bump] = useState(0)

  // Fetch the answer's MusicBrainz/Deezer details up front, so the first
  // guess only waits for the guessed artist.
  useEffect(() => {
    if (target) void enrichArtist(target).then(() => bump((n) => n + 1))
  }, [target])
  // Retro games never count: treat their stats as already recorded.
  const statsDoneRef = useRef(retro || statsRecorded(playDate))

  // Roll the puzzle over at the Israeli midnight even if the tab stays open,
  // so a window left up overnight switches to the next day's artist.
  useEffect(() => {
    const id = setInterval(() => {
      const t = israelDateString(new Date())
      setToday((prev) => (prev === t ? prev : t))
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  // When the day rolls over (or the mode changes), load that date's saved
  // board and reset the stats guard.
  const prevDayRef = useRef(playDate)
  useEffect(() => {
    if (prevDayRef.current === playDate) return
    prevDayRef.current = playDate
    setGame(parseSaved(loadGame(playDate), playDate))
    setNotice(null)
    statsDoneRef.current = retro || statsRecorded(playDate)
  }, [playDate, retro])

  // Persist every change (skipping the transient old-board frame on rollover,
  // where the saved game already belongs to the new date). Reloading mid-game
  // restores exactly this state.
  useEffect(() => {
    if (game.date === playDate) saveGame(playDate, game)
  }, [playDate, game])

  // Housekeeping: drop games older than a month, once per mount.
  useEffect(() => {
    try {
      cleanupOldGames(30)
    } catch {
      // blocked storage — nothing to clean
    }
  }, [])

  // Record a finished day's result exactly once, even across reloads.
  // Retro (yesterday) games are skipped: statsDoneRef starts true for them.
  useEffect(() => {
    if (retro || game.status === 'playing' || statsDoneRef.current) return
    if (game.date !== playDate) return
    statsDoneRef.current = true
    const stats = recordResult(loadStats(), game.status, game.guesses.length, playDate)
    saveStats(stats)
    markStatsRecorded(playDate)
  }, [retro, game.status, game.guesses.length, game.date, playDate])

const submitGuess = useCallback(
    (artist: Artist) => {
      if (game.status !== 'playing' || !target || pending) return
      if (game.guesses.some((g) => g.artistId === artist.id)) {
        setNotice('alreadyGuessed')
        return
      }
      setNotice(null)
      setPending(true)
      // Enrich both sides from the live APIs before comparing, with a cap so a
      // slow API never blocks the game: after 12s we compare what we have.
      const ready = Promise.all([enrichArtist(artist), enrichArtist(target)])
      const cap = new Promise((r) => setTimeout(r, 12_000))
      void Promise.race([ready, cap]).then(() => {
        setPending(false)
        setGame((prev) => {
          if (prev.status !== 'playing' || prev.date !== playDate) return prev
          if (prev.guesses.some((g) => g.artistId === artist.id)) return prev
          const tiles = compareArtist(artist, target, data.artists.length)
          const won = artist.id === target.id
          const guesses: GuessRecord[] = [...prev.guesses, { artistId: artist.id, tiles }]
          const status: GameStatus = won ? 'won' : guesses.length >= MAX_GUESSES ? 'lost' : 'playing'
          return { guesses, status, date: playDate }
        })
      })
    },
    [game, target, playDate, pending, data.artists.length],
  )

  const clearNotice = useCallback(() => setNotice(null), [])

  const guessedIds = useMemo(() => new Set(game.guesses.map((g) => g.artistId)), [game])
  // Share grid is chronological (first guess first); the screen shows newest on top.
  const shareRows = useMemo(
    () => game.guesses.map((g) => g.tiles.map((t) => t.match)),
    [game],
  )

  return {
    mode,
    today,
    playDate,
    dayNumber,
    target,
    guesses: game.guesses,
    status: game.status,
    maxGuesses: MAX_GUESSES,
    artistsById,
    guessedIds,
    shareRows,
    notice,
    pending,
    submitGuess,
    clearNotice,
  }
}
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Artist } from '../artist'
import type { GameStatus, GuessRecord, Match, SaveState, GameData } from './types'
import { TILE_FIELDS } from './types'
import { MAX_GUESSES } from '../config'
import { dateForDayNumber, dayNumberFor, israelDateString, yesterdayIsraelDateString } from './daily'
import { checkGuess as defaultCheckGuess, type CheckGuess } from './guessApi'
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
    const answerId = typeof raw.answerId === 'string' ? raw.answerId : undefined
    return { guesses: raw.guesses, status: raw.status, date, ...(answerId ? { answerId } : {}) }
  }
  return { guesses: [], status: 'playing', date }
}

// Dev preview: ?day=N overrides the current date for testing any day of the
// schedule. Gated behind DEV so a production build ignores the query string.
// Only a present, non-empty digit sequence counts — otherwise fall back to the
// real calendar date (Number(null) is 0, which would pin every dev session to
// the same day-0 artist).
function devDayOverride(isDev: boolean): number | null {
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
  return null
}

// The answer once the round is over: the one the server revealed, or (for a
// won board saved before 0.11.0) the last guess, which was the right one.
function answerIdOf(game: SaveState): string | undefined {
  if (game.answerId) return game.answerId
  if (game.status === 'won') return game.guesses[game.guesses.length - 1]?.artistId
  return undefined
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

// `check` scores a guess; the default asks the server (POST /api/guess).
// Tests pass their own.
export function useGame(data: GameData, mode: GameMode = 'daily', check: CheckGuess = defaultCheckGuess): UseGame {
  const artistsById = useMemo(() => new Map(data.artists.map((a) => [a.id, a])), [data])
  const [today, setToday] = useState<string>(() => israelDateString(new Date()))
  const isDev = (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true
  const retro = mode === 'yesterday'
  // The date whose board is played and saved: today, or yesterday in retro mode.
  const playDate = retro ? yesterdayIsraelDateString(today) : today
  const devDay = devDayOverride(isDev)
  const dayNumber = (devDay ?? dayNumberFor(today)) - (retro ? 1 : 0)
  // The day the server scores guesses against. Normally the board's date; the
  // dev-only ?day=N preview asks for that day instead.
  const apiDate = devDay != null ? dateForDayNumber(dayNumber) : playDate

  const [game, setGame] = useState<SaveState>(() => parseSaved(loadGame(playDate), playDate))
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [, bump] = useState(0)

  const answerId = answerIdOf(game)
  const target = (answerId && artistsById.get(answerId)) || null

  // Once the answer is known, fetch its picture and top track for the end
  // dialog (MusicBrainz/Deezer).
  useEffect(() => {
    if (target) void enrichArtist(target).then(() => bump((n) => n + 1))
  }, [target])

  // A lost board saved before 0.11.0 has no answer stored: ask the server for
  // it by replaying the board's last guess (it is the last allowed one, so the
  // server reveals the answer).
  const revealAsked = useRef<string | null>(null)
  useEffect(() => {
    if (game.status !== 'lost' || answerId || game.date !== playDate) return
    if (revealAsked.current === playDate || game.guesses.length === 0) return
    revealAsked.current = playDate
    const ids = game.guesses.map((g) => g.artistId)
    check({ date: apiDate, guess: ids[ids.length - 1], previous: ids.slice(0, -1) })
      .then((r) => {
        if (!r.answerId) return
        setGame((prev) => (prev.date === playDate && prev.status === 'lost' ? { ...prev, answerId: r.answerId } : prev))
      })
      .catch(() => {
        // The end dialog just stays closed; the board itself is complete.
      })
  }, [game, answerId, playDate, apiDate, check])
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
      if (game.status !== 'playing' || pending) return
      if (game.guesses.some((g) => g.artistId === artist.id)) {
        setNotice('alreadyGuessed')
        return
      }
      setNotice(null)
      setPending(true)
      // The guessed artist's picture for its row; the tiles come from the server.
      void enrichArtist(artist).then(() => bump((n) => n + 1))
      const previous = game.guesses.map((g) => g.artistId)
      check({ date: apiDate, guess: artist.id, previous })
        .then((r) => {
          setGame((prev) => {
            if (prev.status !== 'playing' || prev.date !== playDate) return prev
            if (prev.guesses.some((g) => g.artistId === artist.id)) return prev
            const guesses: GuessRecord[] = [...prev.guesses, { artistId: artist.id, tiles: r.tiles }]
            const status: GameStatus = r.correct ? 'won' : guesses.length >= MAX_GUESSES ? 'lost' : 'playing'
            const answer = r.correct ? artist.id : r.answerId
            return { guesses, status, date: playDate, ...(answer ? { answerId: answer } : {}) }
          })
        })
        .catch(() => setNotice('guessFailed'))
        .finally(() => setPending(false))
    },
    [game, playDate, apiDate, pending, check],
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
import { useEffect, useMemo, useState } from 'react'
import type { DataSource } from '../data'
import type { GameData } from '../game'
import type { Settings } from '../storage'
import { loadSettings, saveSettings } from '../storage'
import {
  buildSearchIndex,
  useGame,
  type GameMode,
  dayNumberFor,
  israelDateString,
  reportLink,
} from '../game'
import { strings } from '../text'
import { SearchBox } from './components/SearchBox'
import { GuessBoard } from './components/GuessBoard'
import { EndModal } from './components/EndModal'
import { HelpModal } from './components/HelpModal'
import { StatsModal } from './components/StatsModal'
import { SettingsModal } from './components/SettingsModal'
import { Icon } from './components/Icon'
import { LegalFooter } from './components/LegalFooter'

const NOTICE_TEXTS: Record<string, string> = {
  alreadyGuessed: strings.alreadyGuessed,
}

interface GameProps {
  data: GameData
  source: DataSource
}

export function Game({ data, source }: GameProps) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [modal, setModal] = useState<'help' | 'stats' | 'settings' | null>(null)
  const [mode, setMode] = useState<GameMode>('daily')

  const index = useMemo(() => buildSearchIndex(data.artists), [data])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    document.documentElement.dataset.cb = settings.colorblind ? 'true' : 'false'
    saveSettings(settings)
  }, [settings])

  // Retro mode exists only once there is a yesterday (from day 2 of the series).
  const hasYesterday = dayNumberFor(israelDateString(new Date())) >= 1
  const toggleMode = hasYesterday
    ? () => setMode((m) => (m === 'daily' ? 'yesterday' : 'daily'))
    : undefined

  return (
    <main className={mode === 'yesterday' ? 'game retro' : 'game'}>
      <header className="app-header">
        <nav className="app-actions" aria-label={strings.title}>
          {hasYesterday && (
            <button
              type="button"
              className={mode === 'yesterday' ? 'icon-btn active' : 'icon-btn'}
              onClick={toggleMode}
              aria-pressed={mode === 'yesterday'}
              aria-label={strings.btnYesterday}
              title={mode === 'yesterday' ? strings.backToToday : strings.btnYesterday}
            >
              <Icon name="history" />
            </button>
          )}
          <button type="button" className="icon-btn" onClick={() => setModal('help')} aria-label={strings.btnHelp} title={strings.btnHelp}>
            <Icon name="help" />
          </button>
          <button type="button" className="icon-btn" onClick={() => setModal('stats')} aria-label={strings.btnStats} title={strings.btnStats}>
            <Icon name="stats" />
          </button>
          <button type="button" className="icon-btn" onClick={() => setModal('settings')} aria-label={strings.btnSettings} title={strings.btnSettings}>
            <Icon name="settings" />
          </button>
        </nav>
      </header>

      {/* Keyed by mode so switching days remounts a clean board (no stale
          guesses or end dialog from the other day). */}
      <DayBoard key={mode} data={data} source={source} mode={mode} index={index} onSwitchMode={toggleMode} />

      {modal === 'help' && <HelpModal onClose={() => setModal(null)} />}
      {modal === 'stats' && <StatsModal onClose={() => setModal(null)} />}
      {modal === 'settings' && (
        <SettingsModal settings={settings} onChange={setSettings} onClose={() => setModal(null)} />
      )}
    </main>
  )
}

interface DayBoardProps extends GameProps {
  mode: GameMode
  index: ReturnType<typeof buildSearchIndex>
  onSwitchMode?: () => void
}

function DayBoard({ data, source, mode, index, onSwitchMode }: DayBoardProps) {
  const game = useGame(data, mode)
  const retro = mode === 'yesterday'
  const [endOpen, setEndOpen] = useState(false)
  const finished = game.status !== 'playing'

  // The win/lose dialog opens when the round ends and stays open until the
  // player dismisses it (its close button must actually work).
  useEffect(() => {
    if (finished) setEndOpen(true)
  }, [finished])

  return (
      <div className="game-body">
      <div className="logo-block">
        <h1 className="app-title">
          <span className="logo-disc" aria-hidden="true" />
          {strings.title}
        </h1>
        <p className="app-subtitle">
          {strings.gameInfo
            .replace('{max}', String(game.maxGuesses))}
        </p>
      </div>

      {source === 'stale-cache' && <p className="notice info">{strings.staleDataNote}</p>}

      {retro && (
        <div className="notice retro-banner" role="status">
          <span>{strings.retroBanner}</span>
          {onSwitchMode && (
            <button type="button" className="link-btn" onClick={onSwitchMode}>
              {strings.backToToday}
            </button>
          )}
        </div>
      )}

      <p className="counter" aria-live="polite" aria-atomic="true">
        <span className="guess-count">
          {strings.guessCounter
            .replace('{n}', String(Math.min(game.guesses.length + (finished ? 0 : 1), game.maxGuesses)))
            .replace('{max}', String(game.maxGuesses))}
        </span>
      </p>

      <SearchBox
        index={index}
        guessedIds={game.guessedIds}
        disabled={finished || game.pending}
        placeholder={strings.placeholder}
        notFoundText={strings.notFound}
        onPick={game.submitGuess}
      />

      {game.pending && (
        <p className="notice info" role="status">
          {strings.checkingGuess}
        </p>
      )}

      {game.notice && <p className="notice error" role="alert">{NOTICE_TEXTS[game.notice] ?? game.notice}</p>}

      <GuessBoard
        guesses={game.guesses}
        artistsById={game.artistsById}
        animate
        revealAnswer={game.status === 'lost' ? game.target : null}
      />

      {endOpen && game.target && (
        <EndModal
          status={game.status === 'playing' ? 'lost' : game.status}
          artist={game.target}
          dayNumber={game.dayNumber}
          guessesUsed={game.guesses.length}
          maxGuesses={game.maxGuesses}
          rows={game.shareRows}
          retro={retro}
          onSwitchMode={onSwitchMode}
          onClose={() => setEndOpen(false)}
        />
      )}

      <footer className="footer">
        <p>{strings.footerCredits}</p>
        <a href={reportLink(game.dayNumber)}>{strings.reportMistake}</a>
        <LegalFooter />
      </footer>
      </div>
  )
}
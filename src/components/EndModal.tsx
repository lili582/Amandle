import { useEffect, useState } from 'react'
import type { Artist, Match } from '../types'
import { TILE_FIELDS } from '../types'
import { strings } from '../strings.he'
import { israelDateString, israelMidnightEpoch, tomorrowIsraelDateString } from '../lib/daily'
import { buildShareText, shareText } from '../lib/share'
import { reportLink } from '../lib/report'
import { tileValue } from '../lib/formatTile'
import { Modal } from './Modal'

interface EndModalProps {
  status: 'won' | 'lost'
  artist: Artist
  dayNumber: number
  guessesUsed: number
  maxGuesses: number
  rows: Match[][]
  // Retro (yesterday) round: no countdown; offer a way back to today.
  retro?: boolean
  // Switch between today's game and yesterday's (button hidden when absent).
  onSwitchMode?: () => void
  onClose: () => void
}

// Picture comes from Deezer (see lib/enrich.ts).
function RevealCard({ artist, retro }: { artist: Artist; retro: boolean }) {
  return (
    <div className="reveal-card">
      <h3 className="reveal-title">{retro ? strings.revealCardTitleYesterday : strings.revealCardTitle}</h3>
      <div className="reveal-main">
        {artist.imageUrl ? (
          <img
            className="reveal-img"
            src={artist.imageUrl}
            alt={strings.revealPictureAlt.replace('{name}', artist.nameHe)}
            loading="lazy"
          />
        ) : (
          <div className="reveal-img reveal-img-missing" aria-hidden="true">
            {artist.nameHe.charAt(0)}
          </div>
        )}
        <div className="reveal-details">
          <p className="reveal-name">{artist.nameHe}</p>
          {artist.nameEn && <p className="reveal-sub">{artist.nameEn}</p>}
        </div>
      </div>

      {artist.imageUrl && <p className="reveal-credit">{strings.revealCredit}</p>}
    </div>
  )
}

function ArtistDetailTable({ artist }: { artist: Artist }) {
  return (
    <table className="artist-params-table">
      <tbody>
        {TILE_FIELDS.map((f) => (
          <tr key={f}>
            <td className="param-label">{strings.columns[f]}</td>
            <td className="param-value">{tileValue(artist, f)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function useCountdown(): string {
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const today = israelDateString(new Date(nowMs))
  const midnight = israelMidnightEpoch(tomorrowIsraelDateString(today))
  return formatClock(midnight - nowMs)
}

export function EndModal({
  status,
  artist,
  dayNumber,
  guessesUsed,
  maxGuesses,
  rows,
  retro = false,
  onSwitchMode,
  onClose,
}: EndModalProps) {
  const [copied, setCopied] = useState(false)
  const countdown = useCountdown()

  async function onShare() {
    const text = buildShareText({ dayNumber, status, guessesUsed, maxGuesses, rows })
    const ok = await shareText(text)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    }
  }

  const head =
    status === 'won'
      ? strings.win.replace('{name}', artist.nameHe)
      : strings.lose.replace('{name}', artist.nameHe)
  const sub =
    status === 'won'
      ? strings.guessesUsed.replace('{n}', String(guessesUsed))
      : 'X/' + maxGuesses

  return (
    <Modal title={status === 'won' ? strings.winShort : strings.loseShort} onClose={onClose}>
      <RevealCard artist={artist} retro={retro} />
      <ArtistDetailTable artist={artist} />
      <p className="end-headline">{head}</p>
      <p className="end-sub">{sub}</p>
      {!retro && <p className="countdown">{strings.nextIn.replace('{time}', countdown)}</p>}
      <div className="end-actions">
        <button type="button" className="primary-btn" onClick={() => void onShare()}>
          {strings.shareTitle}
        </button>
        {copied && <span className="copy-ok">{strings.copied}</span>}
      </div>
      {onSwitchMode && (
        <div className="end-actions">
          <button type="button" className="secondary-btn" onClick={onSwitchMode}>
            {retro ? strings.backToToday : strings.playYesterday}
          </button>
        </div>
      )}
      <p className="report-link">
        <a href={reportLink(dayNumber)}>{strings.reportMistake}</a>
      </p>
    </Modal>
  )
}
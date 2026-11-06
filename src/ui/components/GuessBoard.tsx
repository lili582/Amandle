import type { Artist } from '../../artist'
import type { Match, TileField, TileResult } from '../../game'
import { TILE_FIELDS, tileValue } from '../../game'
import { strings } from '../../text'

const MATCH_NAME: Record<Match, string> = {
  correct: strings.legendCorrect,
  close: strings.legendClose,
  wrong: strings.legendWrong,
}

// Spotle lays the six tiles out as two rows of three.
const ROWS: readonly (readonly TileField[])[] = [TILE_FIELDS.slice(0, 3), TILE_FIELDS.slice(3)]
// Long values (genre names) get a wider tile, like Spotle's "large" items.
const WIDE_FIELDS: ReadonlySet<string> = new Set(['genre'])

function tileAria(label: string, value: string, tile: TileResult): string {
  const parts = [label, value, MATCH_NAME[tile.match]]
  if (tile.arrow) parts.push(tile.arrow === 'up' ? strings.arrowUp : strings.arrowDown)
  return parts.join(', ')
}

function Arrow({ dir }: { dir: 'up' | 'down' }) {
  return (
    <svg className={`tile-arrow arrow-${dir}`} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 4l7 8h-4.5v8h-5v-8H5z" fill="currentColor" />
    </svg>
  )
}

interface TileProps {
  field: TileField
  tile: TileResult
  value: string
  index: number
  animate: boolean
}

export function Tile({ field, tile, value, index, animate }: TileProps) {
  const style = animate ? { animationDelay: `${index * 120}ms` } : undefined
  return (
    <div
      className={`tile tile-${tile.match}${WIDE_FIELDS.has(field) ? ' tile-wide' : ''}${animate ? ' flip' : ''}`}
      style={style}
      role="img"
      aria-label={tileAria(strings.columns[field], value, tile)}
    >
      <span className="tile-label">{strings.columns[field]}</span>
      <span className="tile-value-row">
        <span className="tile-value">{value}</span>
        {tile.arrow && <Arrow dir={tile.arrow} />}
      </span>
    </div>
  )
}

interface CardProps {
  artist: Artist
  tiles: TileResult[]
  animate: boolean
  fresh: boolean
  answer?: boolean
}

function GuessCard({ artist, tiles, animate, fresh, answer }: CardProps) {
  const byField = new Map(tiles.map((t) => [t.field, t]))
  let n = 0
  return (
    <li className={`guess-card${fresh ? ' fresh' : ''}${answer ? ' guess-answer' : ''}`}>
      <div className="guess-head">
        {artist.imageUrl ? (
          <img className="guess-img" src={artist.imageUrl} alt="" loading="lazy" />
        ) : (
          <span className="guess-img guess-img-missing" aria-hidden="true">
            {artist.nameHe.charAt(0)}
          </span>
        )}
        <div className="guess-names">
          {answer && <span className="answer-badge">{strings.answerBadge}</span>}
          <p className="guess-name">{artist.nameHe}</p>
          {artist.nameEn && artist.nameEn !== artist.nameHe && <p className="guess-sub">{artist.nameEn}</p>}
        </div>
      </div>
      {ROWS.map((row, ri) => (
        <div key={ri} className="tile-row">
          {row.map((f) => {
            const t = byField.get(f)
            if (!t) return null
            const i = n++
            return (
              <Tile
                key={f}
                field={f}
                tile={t}
                value={t.value ?? tileValue(artist, f)}
                index={i}
                animate={animate}
              />
            )
          })}
        </div>
      ))}
    </li>
  )
}

interface GuessBoardProps {
  guesses: { artistId: string; tiles: TileResult[] }[]
  artistsById: ReadonlyMap<string, Artist>
  animate: boolean
  // When the round is lost, the correct artist is shown as the final row.
  revealAnswer?: Artist | null
}

export function GuessBoard({ guesses, artistsById, animate, revealAnswer }: GuessBoardProps) {
  const answerTiles: TileResult[] | null = revealAnswer
    ? TILE_FIELDS.map((f) => ({ field: f, match: 'correct' as const, value: tileValue(revealAnswer, f) }))
    : null
  return (
    <div className="board" aria-label={strings.boardEmpty}>
      {guesses.length === 0 && <p className="board-empty">{strings.boardEmpty}</p>}
      <ol className="guess-list">
        {revealAnswer && answerTiles && (
          <GuessCard key="answer" artist={revealAnswer} tiles={answerTiles} animate={animate} fresh answer />
        )}
        {[...guesses].reverse().map((g, ri) => {
          const artist = artistsById.get(g.artistId)
          if (!artist) return null
          const originalIdx = guesses.length - 1 - ri // stable key in game order
          const isLast = ri === 0 && !revealAnswer // newest guess is at the top
          return (
            <GuessCard
              key={originalIdx}
              artist={artist}
              tiles={g.tiles}
              animate={animate && isLast}
              fresh={isLast}
            />
          )
        })}
      </ol>
    </div>
  )
}

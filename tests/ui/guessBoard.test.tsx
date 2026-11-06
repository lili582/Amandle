import { describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { GuessBoard } from '../../src/ui/components/GuessBoard'
import { compareArtist } from '../../src/game/compare'
import { strings } from '../../src/text/strings.he'
import { makeArtist } from '../fixtures'

const TARGET = makeArtist({ id: 't', nameHe: 'התשובה הנכונה' })
const WRONG = makeArtist({ id: 'w', nameHe: 'ניחוש שגוי' })

function render(revealAnswer: typeof TARGET | null) {
  const container = document.createElement('div')
  const root = createRoot(container)
  act(() =>
    root.render(
      <GuessBoard
        guesses={[{ artistId: WRONG.id, tiles: compareArtist(WRONG, TARGET) }]}
        artistsById={new Map([[WRONG.id, WRONG], [TARGET.id, TARGET]])}
        animate={false}
        revealAnswer={revealAnswer}
      />,
    ),
  )
  return { container, root }
}

describe('GuessBoard', () => {
  it('after a lost round, shows the correct artist as the last (top) row, all green', () => {
    const { container, root } = render(TARGET)
    const cards = container.querySelectorAll('.guess-card')
    expect(cards).toHaveLength(2)
    const answer = cards[0]
    expect(answer.classList.contains('guess-answer')).toBe(true)
    expect(answer.querySelector('.guess-name')?.textContent).toBe(TARGET.nameHe)
    expect(answer.querySelector('.answer-badge')?.textContent).toBe(strings.answerBadge)
    const tiles = answer.querySelectorAll('.tile')
    expect(tiles).toHaveLength(6)
    tiles.forEach((t) => expect(t.classList.contains('tile-correct')).toBe(true))
    act(() => root.unmount())
  })

  it('shows no answer row while playing', () => {
    const { container, root } = render(null)
    expect(container.querySelectorAll('.guess-card')).toHaveLength(1)
    expect(container.querySelector('.guess-answer')).toBeNull()
    act(() => root.unmount())
  })
})

import type { Match } from '../types'
import { strings } from '../strings.he'
import { Modal } from './Modal'

function Chip({ match }: { match: Match }) {
  const cls = match === 'correct' ? 'green' : match === 'close' ? 'yellow' : 'gray'
  return <span className={`legend-chip chip-${cls}`} />
}

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title={strings.helpTitle} onClose={onClose}>
      <p>{strings.helpBody}</p>
      <p className="pick-hint">{strings.pickFromList}</p>
      <ul className="legend-list help-attributes">
        {strings.helpAttributes.map((a) => (
          <li key={a.title}>
            <h3 className="help-attr-title">{a.title}</h3>
            <p className="help-attr-body">{a.body}</p>
            <span className="legend-row">
              <Chip match="wrong" /> {strings.legendWrong}
              {a.close && (
                <>
                  <Chip match="close" /> {a.close}
                </>
              )}
              <Chip match="correct" /> {strings.legendCorrect}
            </span>
          </li>
        ))}
      </ul>
      <p className="tile-field-note">
        <span className="legend-arrow">▲▼</span> {strings.legendArrow}
      </p>
    </Modal>
  )
}

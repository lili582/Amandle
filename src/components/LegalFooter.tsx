import { useEffect, useState } from 'react'
import { LEGAL_IDS, legalLabels, legalStrings, type LegalDocId } from '../legal.he'
import { fillLegal } from '../lib/legal'
import { LegalModal } from './LegalModal'

// Each legal page also has a shareable address: <site>/#privacy, #terms,
// #accessibility opens that page directly.
function docFromHash(): LegalDocId | null {
  if (typeof window === 'undefined') return null
  const id = window.location.hash.replace(/^#/, '')
  return (LEGAL_IDS as string[]).includes(id) ? (id as LegalDocId) : null
}

export function LegalFooter() {
  const [doc, setDoc] = useState<LegalDocId | null>(() => docFromHash())

  useEffect(() => {
    const onHash = () => setDoc(docFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function close() {
    setDoc(null)
    if (docFromHash()) {
      try {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      } catch {
        window.location.hash = ''
      }
    }
  }

  return (
    <>
      <nav className="legal-nav" aria-label={legalStrings.navLabel}>
        {LEGAL_IDS.map((id) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={(e) => {
              e.preventDefault()
              setDoc(id)
            }}
          >
            {legalLabels[id]}
          </a>
        ))}
      </nav>
      <p className="legal-disclaimer">{fillLegal(legalStrings.disclaimer)}</p>
      {doc && <LegalModal doc={doc} onClose={close} />}
    </>
  )
}

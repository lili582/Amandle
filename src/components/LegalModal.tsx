import { useEffect, useRef } from 'react'
import { CONTACT_EMAIL } from '../config'
import { legalDocs, legalStrings, type LegalDocId } from '../legal.he'
import { fillLegal } from '../lib/legal'
import { Modal } from './Modal'

// Renders a paragraph, turning the contact address into a mailto link.
function Text({ text }: { text: string }) {
  const filled = fillLegal(text)
  const parts = filled.split(CONTACT_EMAIL)
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr">
              {CONTACT_EMAIL}
            </a>
          )}
        </span>
      ))}
    </>
  )
}

export function LegalModal({ doc, onClose }: { doc: LegalDocId; onClose: () => void }) {
  const d = legalDocs[doc]
  const ref = useRef<HTMLElement>(null)
  // Focusing the article can scroll the dialog past its title; reset to top.
  // (Runs after Modal's own focus effect, since Modal is our child.)
  useEffect(() => {
    let el: HTMLElement | null = ref.current
    while (el) {
      el.scrollTop = 0
      el = el.parentElement
    }
  }, [doc])
  return (
    <Modal title={d.title} onClose={onClose}>
      {/* Focusable so the dialog opens at the top and keyboard users can scroll it. */}
      <article ref={ref} className="legal-doc" tabIndex={0} aria-label={d.title}>
        {d.sections.map((s) => (
          <section key={s.heading}>
            <h3>{s.heading}</h3>
            {s.paragraphs?.map((p) => (
              <p key={p}>
                <Text text={p} />
              </p>
            ))}
            {s.list && (
              <ul>
                {s.list.map((item) => (
                  <li key={item}>
                    <Text text={item} />
                  </li>
                ))}
              </ul>
            )}
            {s.links && (
              <ul className="legal-links">
                {s.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <p className="legal-updated">{fillLegal(legalStrings.updated)}</p>
      </article>
    </Modal>
  )
}

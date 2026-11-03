import { describe, expect, it, beforeEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { LegalFooter } from '../src/components/LegalFooter'
import { fillLegal } from '../src/lib/legal'
import { legalDocs, LEGAL_IDS } from '../src/legal.he'
import { clearAllLocalData, saveSettings, saveStats, emptyStats } from '../src/lib/storage'
import { deleteAllData } from '../src/lib/deleteData'
import { CONTACT_EMAIL, OWNER_NAME } from '../src/config'

function mount(node: React.ReactNode) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(node))
  return { container, root }
}

describe('legal pages', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    window.history.replaceState(null, '', '/')
  })

  it('every document has content and no unfilled placeholders', () => {
    for (const id of LEGAL_IDS) {
      const text = JSON.stringify(legalDocs[id])
      expect(legalDocs[id].sections.length).toBeGreaterThan(0)
      expect(fillLegal(text)).not.toMatch(/\{(owner|email|updated|game)\}/)
    }
  })

  it('accessibility statement names the contact person and email', () => {
    const text = fillLegal(JSON.stringify(legalDocs.accessibility))
    expect(text).toContain(OWNER_NAME)
    expect(text).toContain(CONTACT_EMAIL)
  })

  it('footer links open each page in a dialog', () => {
    const { container } = mount(<LegalFooter />)
    const links = container.querySelectorAll('.legal-nav a')
    expect(links).toHaveLength(3)
    act(() => (links[2] as HTMLAnchorElement).click())
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog?.getAttribute('aria-label')).toBe('הצהרת נגישות')
    expect(dialog?.querySelector(`a[href="mailto:${CONTACT_EMAIL}"]`)).not.toBeNull()
  })

  it('opens the page named in the URL hash', () => {
    window.history.replaceState(null, '', '/#privacy')
    mount(<LegalFooter />)
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('מדיניות פרטיות')
  })
})

describe('delete my data', () => {
  it('removes only the game keys from localStorage', async () => {
    saveSettings({ theme: 'light', colorblind: true })
    saveStats(emptyStats())
    window.localStorage.setItem('other-site', 'keep')
    const reload = vi.fn()
    await deleteAllData(reload)
    expect(Object.keys(window.localStorage).filter((k) => k.startsWith('amandle:'))).toHaveLength(0)
    expect(window.localStorage.getItem('other-site')).toBe('keep')
    expect(reload).toHaveBeenCalled()
    expect(clearAllLocalData()).toBe(0)
  })
})

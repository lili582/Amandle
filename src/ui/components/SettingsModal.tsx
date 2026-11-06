import { useState } from 'react'
import { strings } from '../../text'
import type { Settings } from '../../storage'
import { deleteAllData } from '../../storage'
import { Modal } from './Modal'

interface SettingsModalProps {
  settings: Settings
  onChange: (next: Settings) => void
  onClose: () => void
}

export function SettingsModal({ settings, onChange, onClose }: SettingsModalProps) {
  const [confirming, setConfirming] = useState(false)

  return (
    <Modal title={strings.settingsTitle} onClose={onClose}>
      <label className="setting-row">
        <span>{strings.colorblind}</span>
        <input
          type="checkbox"
          checked={settings.colorblind}
          onChange={(e) => onChange({ ...settings, colorblind: e.target.checked })}
        />
      </label>
      <fieldset className="theme-picker" aria-label={strings.settingsTitle}>
        <button
          type="button"
          className={`theme-option${settings.theme === 'dark' ? ' active' : ''}`}
          onClick={() => onChange({ ...settings, theme: 'dark' })}
        >
          {strings.themeDark}
        </button>
        <button
          type="button"
          className={`theme-option${settings.theme === 'light' ? ' active' : ''}`}
          onClick={() => onChange({ ...settings, theme: 'light' })}
        >
          {strings.themeLight}
        </button>
      </fieldset>
      <div className="delete-data">
        <p className="delete-data-hint">{strings.deleteDataHint}</p>
        {confirming ? (
          <div className="end-actions" role="group" aria-label={strings.deleteData}>
            <button type="button" className="danger-btn" onClick={() => void deleteAllData()}>
              {strings.deleteDataConfirm}
            </button>
            <button type="button" className="secondary-btn" onClick={() => setConfirming(false)}>
              {strings.deleteDataCancel}
            </button>
          </div>
        ) : (
          <button type="button" className="secondary-btn" onClick={() => setConfirming(true)}>
            {strings.deleteData}
          </button>
        )}
      </div>
    </Modal>
  )
}

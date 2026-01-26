import './SettingsModal.css'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  showHints: boolean
  onToggleHints: () => void
  vsAI: boolean
  onToggleAI: () => void
}

export function SettingsModal({
  isOpen,
  onClose,
  showHints,
  onToggleHints,
  vsAI,
  onToggleAI,
}: SettingsModalProps) {
  if (!isOpen) return null

  return (
    <div className="settings-modal__overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal__header">
          <h2>Settings</h2>
          <button className="settings-modal__close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="settings-modal__content">
          <label className="settings-modal__option">
            <span>Play vs AI</span>
            <button
              className={`settings-modal__toggle ${vsAI ? 'settings-modal__toggle--on' : ''}`}
              onClick={onToggleAI}
            >
              <span className="settings-modal__toggle-knob" />
            </button>
          </label>
          <label className="settings-modal__option">
            <span>Show Hints</span>
            <button
              className={`settings-modal__toggle ${showHints ? 'settings-modal__toggle--on' : ''}`}
              onClick={onToggleHints}
            >
              <span className="settings-modal__toggle-knob" />
            </button>
          </label>
        </div>
      </div>
    </div>
  )
}

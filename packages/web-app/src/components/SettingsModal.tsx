import { BOT_PROFILES } from '@russian-bank/ai-training'
import './SettingsModal.css'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  showHints: boolean
  onToggleHints: () => void
  vsAI: boolean
  onToggleAI: () => void
  selectedBotId: string
  onSelectBot: (botId: string) => void
  onReplayTutorial: () => void
}

export function SettingsModal({
  isOpen,
  onClose,
  showHints,
  onToggleHints,
  vsAI,
  onToggleAI,
  selectedBotId,
  onSelectBot,
  onReplayTutorial,
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
          {vsAI && (
            <label className="settings-modal__option settings-modal__option--column">
              <span>Bot Opponent</span>
              <select
                className="settings-modal__select"
                value={selectedBotId}
                onChange={(e) => onSelectBot(e.target.value)}
              >
                {BOT_PROFILES.map((bot) => (
                  <option key={bot.id} value={bot.id}>
                    {bot.name} ({bot.difficulty})
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="settings-modal__option">
            <span>Show Hints</span>
            <button
              className={`settings-modal__toggle ${showHints ? 'settings-modal__toggle--on' : ''}`}
              onClick={onToggleHints}
            >
              <span className="settings-modal__toggle-knob" />
            </button>
          </label>
          <div className="settings-modal__divider" />
          <button className="settings-modal__tutorial-button" onClick={onReplayTutorial}>
            How to Play
          </button>
        </div>
      </div>
    </div>
  )
}

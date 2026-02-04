import { useState } from 'react'
import { BOT_PROFILES } from '@russian-bank/ai-training'
import './SettingsModal.css'

interface GameData {
  seed: number
  history: string[]
  winner: 'player1' | 'player2' | null
  botId: string
}

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
  gameData?: GameData
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
  gameData,
}: SettingsModalProps) {
  const [copied, setCopied] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  if (!isOpen) return null

  const handleCopyGame = async () => {
    if (!gameData) return

    const gameRecord = {
      seed: gameData.seed,
      botId: gameData.botId,
      winner: gameData.winner,
      history: gameData.history,
      moveCount: gameData.history.length,
      timestamp: Date.now(),
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(gameRecord, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const text = JSON.stringify(gameRecord, null, 2)
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

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

          {/* Game History Section */}
          {gameData && gameData.history.length > 0 && (
            <>
              <div className="settings-modal__divider" />
              <div className="settings-modal__history-section">
                <button
                  className="settings-modal__history-toggle"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  {showHistory ? '▼' : '▶'} Move History ({gameData.history.length})
                </button>
                {showHistory && (
                  <div className="settings-modal__history">
                    {gameData.history.map((move, i) => (
                      <span key={i} className="settings-modal__move">
                        <span className="settings-modal__move-num">{i + 1}.</span>
                        {move}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  className={`settings-modal__copy-button ${copied ? 'settings-modal__copy-button--copied' : ''}`}
                  onClick={handleCopyGame}
                >
                  {copied ? 'Copied!' : 'Copy Game for Training'}
                </button>
                <p className="settings-modal__copy-hint">
                  Add to packages/ai-training/src/training-games.json
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

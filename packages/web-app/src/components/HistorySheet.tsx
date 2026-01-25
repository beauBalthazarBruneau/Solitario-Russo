import { useState } from 'react'
import './HistorySheet.css'

interface HistorySheetProps {
  history: string[]
}

export function HistorySheet({ history }: HistorySheetProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        className="history-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle history"
      >
        {isOpen ? '▼' : '▲'} History ({history.length})
      </button>

      <div className={`history-sheet ${isOpen ? 'history-sheet--open' : ''}`}>
        <div className="history-sheet__content">
          {history.length === 0 ? (
            <div className="history-sheet__empty">No moves yet</div>
          ) : (
            <div className="history-sheet__moves">
              {history.map((move, index) => (
                <span key={index} className="history-sheet__move">
                  <span className="history-sheet__move-num">{index + 1}.</span>
                  {move}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

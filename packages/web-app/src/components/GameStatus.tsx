import type { GameState } from '@russian-bank/game-engine'
import './GameStatus.css'

interface GameStatusProps {
  gameState: GameState
  onNewGame: () => void
  onUndo: () => void
  canUndo: boolean
  onOpenSettings: () => void
  vsAI: boolean
}

export function GameStatus({ gameState, onNewGame, onUndo, canUndo, onOpenSettings, vsAI }: GameStatusProps) {
  const { currentTurn, winner, moveCount, player1, player2 } = gameState

  const p1CardsLeft = player1.reserve.length + player1.hand.length + player1.waste.length
  const p2CardsLeft = player2.reserve.length + player2.hand.length + player2.waste.length

  return (
    <div className="game-status">
      <div className="game-status__info">
        {winner ? (
          <span className="game-status__winner">
            {winner === 'player1' ? 'You Win!' : vsAI ? 'AI Wins!' : 'Opponent Wins!'}
          </span>
        ) : (
          <span className="game-status__turn">
            {currentTurn === 'player1' ? 'Your Turn' : vsAI ? "AI's Turn" : "Opponent's Turn"}
          </span>
        )}
        <span className="game-status__moves">Moves: {moveCount}</span>
      </div>
      <div className="game-status__scores">
        <span className="game-status__score game-status__score--p1">
          You: {p1CardsLeft}
        </span>
        <span className="game-status__score game-status__score--p2">
          {vsAI ? 'AI' : 'Opp'}: {p2CardsLeft}
        </span>
      </div>
      <div className="game-status__actions">
        <button className="game-status__button" onClick={onNewGame}>
          New Game
        </button>
        <button
          className="game-status__button game-status__button--undo"
          onClick={onUndo}
          disabled={!canUndo}
        >
          Undo
        </button>
        <button
          className="game-status__button game-status__button--settings"
          onClick={onOpenSettings}
          aria-label="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

import type { GameState } from '@russian-bank/game-engine'
import './GameStatus.css'

interface GameStatusProps {
  gameState: GameState
  onNewGame: () => void
  onUndo: () => void
  canUndo: boolean
  showHints: boolean
  onToggleHints: () => void
}

export function GameStatus({ gameState, onNewGame, onUndo, canUndo, showHints, onToggleHints }: GameStatusProps) {
  const { currentTurn, winner, moveCount, player1, player2 } = gameState

  const p1CardsLeft = player1.reserve.length + player1.hand.length + player1.waste.length
  const p2CardsLeft = player2.reserve.length + player2.hand.length + player2.waste.length

  return (
    <div className="game-status">
      <div className="game-status__info">
        {winner ? (
          <span className="game-status__winner">
            {winner === 'player1' ? 'You Win!' : 'Opponent Wins!'}
          </span>
        ) : (
          <span className="game-status__turn">
            {currentTurn === 'player1' ? 'Your Turn' : "Opponent's Turn"}
          </span>
        )}
        <span className="game-status__moves">Moves: {moveCount}</span>
      </div>
      <div className="game-status__scores">
        <span className="game-status__score game-status__score--p1">
          You: {p1CardsLeft}
        </span>
        <span className="game-status__score game-status__score--p2">
          Opp: {p2CardsLeft}
        </span>
      </div>
      <button className="game-status__button" onClick={onNewGame}>
        New Game
      </button>
      <button
        className={`game-status__button game-status__button--hints ${showHints ? 'game-status__button--active' : ''}`}
        onClick={onToggleHints}
      >
        Hints
      </button>
      <button
        className="game-status__button game-status__button--undo"
        onClick={onUndo}
        disabled={!canUndo}
      >
        Undo
      </button>
    </div>
  )
}

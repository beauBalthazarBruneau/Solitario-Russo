import type { GameState, PileLocation } from '@russian-bank/game-engine'
import { Pile } from './Pile'
import './GameBoard.css'

interface GameBoardProps {
  gameState: GameState
  onPileClick: (location: PileLocation) => void
  isSelected: (location: PileLocation) => boolean
  isValidTarget: (location: PileLocation) => boolean
}

export function GameBoard({ gameState, onPileClick, isSelected, isValidTarget }: GameBoardProps) {
  const { player1, player2, foundations, currentTurn } = gameState

  return (
    <div className="game-board">
      {/* Player 2 Area (top - opponent) */}
      <div className={`player-area player-area--top ${currentTurn === 'player2' ? 'player-area--active' : ''}`}>
        <div className="player-area__side">
          <Pile
            cards={player2.reserve}
            location={{ type: 'reserve', owner: 'player2' }}
            label="Reserve"
            showCount
            onClick={onPileClick}
            isSelected={isSelected}
            isValidTarget={isValidTarget}
          />
          <Pile
            cards={player2.waste}
            location={{ type: 'waste', owner: 'player2' }}
            label="Waste"
            showCount
            onClick={onPileClick}
            isSelected={isSelected}
            isValidTarget={isValidTarget}
          />
        </div>
        <div className="player-area__tableau">
          {player2.tableau.map((pile, index) => (
            <Pile
              key={index}
              cards={pile}
              location={{ type: 'tableau', owner: 'player2', index }}
              spread
              onClick={onPileClick}
              isSelected={isSelected}
              isValidTarget={isValidTarget}
            />
          ))}
        </div>
        <div className="player-area__side">
          <Pile
            cards={player2.hand}
            location={{ type: 'hand', owner: 'player2' }}
            label="Hand"
            showCount
            faceDown
            onClick={onPileClick}
            isSelected={isSelected}
            isValidTarget={isValidTarget}
          />
        </div>
      </div>

      {/* Foundations (center) */}
      <div className="foundations">
        <div className="foundations__row">
          {foundations.slice(0, 4).map((pile, index) => (
            <Pile
              key={index}
              cards={pile}
              location={{ type: 'foundation', index }}
              onClick={onPileClick}
              isSelected={isSelected}
              isValidTarget={isValidTarget}
            />
          ))}
        </div>
        <div className="foundations__row">
          {foundations.slice(4, 8).map((pile, index) => (
            <Pile
              key={index + 4}
              cards={pile}
              location={{ type: 'foundation', index: index + 4 }}
              onClick={onPileClick}
              isSelected={isSelected}
              isValidTarget={isValidTarget}
            />
          ))}
        </div>
      </div>

      {/* Player 1 Area (bottom - you) */}
      <div className={`player-area player-area--bottom ${currentTurn === 'player1' ? 'player-area--active' : ''}`}>
        <div className="player-area__side">
          <Pile
            cards={player1.hand}
            location={{ type: 'hand', owner: 'player1' }}
            label="Hand"
            showCount
            faceDown
            onClick={onPileClick}
            isSelected={isSelected}
            isValidTarget={isValidTarget}
          />
        </div>
        <div className="player-area__tableau">
          {player1.tableau.map((pile, index) => (
            <Pile
              key={index}
              cards={pile}
              location={{ type: 'tableau', owner: 'player1', index }}
              spread
              onClick={onPileClick}
              isSelected={isSelected}
              isValidTarget={isValidTarget}
            />
          ))}
        </div>
        <div className="player-area__side">
          <Pile
            cards={player1.reserve}
            location={{ type: 'reserve', owner: 'player1' }}
            label="Reserve"
            showCount
            onClick={onPileClick}
            isSelected={isSelected}
            isValidTarget={isValidTarget}
          />
          <Pile
            cards={player1.waste}
            location={{ type: 'waste', owner: 'player1' }}
            label="Waste"
            showCount
            onClick={onPileClick}
            isSelected={isSelected}
            isValidTarget={isValidTarget}
          />
        </div>
      </div>
    </div>
  )
}

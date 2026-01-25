import type { GameState, PileLocation, Suit } from '@russian-bank/game-engine'
import { Pile } from './Pile'
import { TableauPile } from './TableauPile'
import { FoundationPile } from './FoundationPile'
import './GameBoard.css'

// Foundation suits by row: hearts, diamonds, clubs, spades
const FOUNDATION_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']

interface GameBoardProps {
  gameState: GameState
  onPileClick: (location: PileLocation) => void
  isSelected: (location: PileLocation) => boolean
  isValidTarget: (location: PileLocation) => boolean
  canDrag: (location: PileLocation) => boolean
  onDragStart: (location: PileLocation) => void
  onDragEnd: () => void
  onDrop: (location: PileLocation) => void
  hasMovesFrom: (location: PileLocation) => boolean
}

export function GameBoard({
  gameState,
  onPileClick,
  isSelected,
  isValidTarget,
  canDrag,
  onDragStart,
  onDragEnd,
  onDrop,
  hasMovesFrom,
}: GameBoardProps) {
  const { player1, player2, foundations, currentTurn } = gameState

  const pileProps = {
    onClick: onPileClick,
    isSelected,
    isValidTarget,
    onDragStart,
    onDragEnd,
    onDrop,
    hasMovesFrom,
  }

  return (
    <div className="game-board">
      {/* Player 2 Area (top - opponent) */}
      <div className={`player-area player-area--top ${currentTurn === 'player2' ? 'player-area--active' : ''}`}>
        <Pile
          cards={player2.hand}
          location={{ type: 'hand', owner: 'player2' }}
          label="Hand"
          showCount
          faceDown
          canDrag={false}
          {...pileProps}
        />
        <Pile
          cards={player2.waste}
          location={{ type: 'waste', owner: 'player2' }}
          label="Waste"
          showCount
          canDrag={canDrag({ type: 'waste', owner: 'player2' })}
          {...pileProps}
        />
        <Pile
          cards={player2.reserve}
          location={{ type: 'reserve', owner: 'player2' }}
          label="Reserve"
          showCount
          canDrag={canDrag({ type: 'reserve', owner: 'player2' })}
          {...pileProps}
        />
      </div>

      {/* Middle Area: Grid of Tableaus and Foundations */}
      <div className="middle-area">
        {[0, 1, 2, 3].map((rowIndex) => (
          <div key={rowIndex} className="middle-row">
            {/* Player 2 Tableau - fans left (away from center) */}
            <TableauPile
              cards={player2.tableau[rowIndex] ?? []}
              location={{ type: 'tableau', owner: 'player2', index: rowIndex }}
              direction="left"
              canDrag={canDrag({ type: 'tableau', owner: 'player2', index: rowIndex })}
              {...pileProps}
            />
            {/* Foundation column 1 */}
            <FoundationPile
              cards={foundations[rowIndex] ?? []}
              location={{ type: 'foundation', index: rowIndex }}
              suit={FOUNDATION_SUITS[rowIndex] ?? 'hearts'}
              onClick={onPileClick}
              isSelected={isSelected}
              isValidTarget={isValidTarget}
              onDrop={onDrop}
            />
            {/* Foundation column 2 */}
            <FoundationPile
              cards={foundations[rowIndex + 4] ?? []}
              location={{ type: 'foundation', index: rowIndex + 4 }}
              suit={FOUNDATION_SUITS[rowIndex] ?? 'hearts'}
              onClick={onPileClick}
              isSelected={isSelected}
              isValidTarget={isValidTarget}
              onDrop={onDrop}
            />
            {/* Player 1 Tableau - fans right (away from center) */}
            <TableauPile
              cards={player1.tableau[rowIndex] ?? []}
              location={{ type: 'tableau', owner: 'player1', index: rowIndex }}
              direction="right"
              canDrag={canDrag({ type: 'tableau', owner: 'player1', index: rowIndex })}
              {...pileProps}
            />
          </div>
        ))}
      </div>

      {/* Player 1 Area (bottom - you) */}
      <div className={`player-area player-area--bottom ${currentTurn === 'player1' ? 'player-area--active' : ''}`}>
        <Pile
          cards={player1.reserve}
          location={{ type: 'reserve', owner: 'player1' }}
          label="Reserve"
          showCount
          canDrag={canDrag({ type: 'reserve', owner: 'player1' })}
          {...pileProps}
        />
        <Pile
          cards={player1.waste}
          location={{ type: 'waste', owner: 'player1' }}
          label="Waste"
          showCount
          canDrag={canDrag({ type: 'waste', owner: 'player1' })}
          {...pileProps}
        />
        <Pile
          cards={player1.hand}
          location={{ type: 'hand', owner: 'player1' }}
          label="Hand"
          showCount
          faceDown
          canDrag={false}
          {...pileProps}
        />
      </div>
    </div>
  )
}

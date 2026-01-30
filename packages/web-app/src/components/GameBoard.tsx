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
  hasMovesFrom: (location: PileLocation) => boolean
  player1Name: string
  player2Name: string
}

export function GameBoard({
  gameState,
  onPileClick,
  isSelected,
  isValidTarget,
  hasMovesFrom,
  player1Name,
  player2Name,
}: GameBoardProps) {
  const { player1, player2, foundations, currentTurn } = gameState

  const p1CardsLeft = player1.reserve.length + player1.hand.length + player1.waste.length + (player1.drawnCard ? 1 : 0)
  const p2CardsLeft = player2.reserve.length + player2.hand.length + player2.waste.length + (player2.drawnCard ? 1 : 0)

  const pileProps = {
    onClick: onPileClick,
    isSelected,
    isValidTarget,
    hasMovesFrom,
  }

  return (
    <div className="game-board">
      {/* Player 2 Area (top - opponent) */}
      <div className={`player-area player-area--top ${currentTurn === 'player2' ? 'player-area--active' : ''}`}>
        <div className="player-area__info">
          <span className="player-area__name">{player2Name}</span>
          <span className="player-area__cards">{p2CardsLeft} cards</span>
        </div>
        <Pile
          cards={player2.drawnCard ? [player2.drawnCard] : []}
          location={{ type: 'drawn', owner: 'player2' }}
          label="Drawn"
          {...pileProps}
        />
        <Pile
          cards={player2.hand}
          location={{ type: 'hand', owner: 'player2' }}
          label="Hand"
          showCount
          faceDown
          {...pileProps}
        />
        <Pile
          cards={player2.waste}
          location={{ type: 'waste', owner: 'player2' }}
          label="Waste"
          showCount
          {...pileProps}
        />
        <Pile
          cards={player2.reserve}
          location={{ type: 'reserve', owner: 'player2' }}
          label="Reserve"
          showCount
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
            />
            {/* Foundation column 2 */}
            <FoundationPile
              cards={foundations[rowIndex + 4] ?? []}
              location={{ type: 'foundation', index: rowIndex + 4 }}
              suit={FOUNDATION_SUITS[rowIndex] ?? 'hearts'}
              onClick={onPileClick}
              isSelected={isSelected}
              isValidTarget={isValidTarget}
            />
            {/* Player 1 Tableau - fans right (away from center) */}
            <TableauPile
              cards={player1.tableau[rowIndex] ?? []}
              location={{ type: 'tableau', owner: 'player1', index: rowIndex }}
              direction="right"
              {...pileProps}
            />
          </div>
        ))}
      </div>

      {/* Player 1 Area (bottom - you) */}
      <div className={`player-area player-area--bottom ${currentTurn === 'player1' ? 'player-area--active' : ''}`}>
        <div className="player-area__info">
          <span className="player-area__name">{player1Name}</span>
          <span className="player-area__cards">{p1CardsLeft} cards</span>
        </div>
        <Pile
          cards={player1.reserve}
          location={{ type: 'reserve', owner: 'player1' }}
          label="Reserve"
          showCount
          {...pileProps}
        />
        <Pile
          cards={player1.waste}
          location={{ type: 'waste', owner: 'player1' }}
          label="Waste"
          showCount
          {...pileProps}
        />
        <Pile
          cards={player1.hand}
          location={{ type: 'hand', owner: 'player1' }}
          label="Hand"
          showCount
          faceDown
          {...pileProps}
        />
        <Pile
          cards={player1.drawnCard ? [player1.drawnCard] : []}
          location={{ type: 'drawn', owner: 'player1' }}
          label="Drawn"
          {...pileProps}
        />
      </div>
    </div>
  )
}

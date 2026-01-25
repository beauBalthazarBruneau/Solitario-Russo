import { useState, useCallback } from 'react'
import {
  initializeGame,
  applyMove,
  drawFromHand,
  getValidMoves,
  type GameState,
  type Move,
  type PileLocation,
} from '@russian-bank/game-engine'
import { GameBoard } from './components/GameBoard'
import { GameStatus } from './components/GameStatus'
import './App.css'

function App() {
  const [gameState, setGameState] = useState<GameState>(() => initializeGame())
  const [selectedPile, setSelectedPile] = useState<PileLocation | null>(null)
  const [validMoves, setValidMoves] = useState<Move[]>([])

  const handleNewGame = useCallback(() => {
    setGameState(initializeGame())
    setSelectedPile(null)
    setValidMoves([])
  }, [])

  const handlePileClick = useCallback(
    (location: PileLocation) => {
      if (gameState.winner) return

      // If clicking on hand, draw a card
      if (location.type === 'hand' && location.owner === gameState.currentTurn) {
        const result = drawFromHand(gameState)
        if (result.valid && result.newState) {
          setGameState(result.newState)
          setSelectedPile(null)
          setValidMoves([])
        }
        return
      }

      // If no pile is selected, try to select this one as source
      if (!selectedPile) {
        // Can only select own piles as source (except foundations)
        if (location.type === 'foundation') return
        if (location.owner && location.owner !== gameState.currentTurn) return

        const moves = getValidMoves(gameState)
        const movesFromPile = moves.filter(
          (m) =>
            m.from.type === location.type &&
            m.from.owner === location.owner &&
            m.from.index === location.index
        )

        if (movesFromPile.length > 0) {
          setSelectedPile(location)
          setValidMoves(movesFromPile)
        }
        return
      }

      // A pile is already selected, try to make a move to this location
      const move = validMoves.find(
        (m) =>
          m.to.type === location.type &&
          m.to.owner === location.owner &&
          m.to.index === location.index
      )

      if (move) {
        const result = applyMove(gameState, move)
        if (result.valid && result.newState) {
          setGameState(result.newState)
        }
      }

      // Clear selection
      setSelectedPile(null)
      setValidMoves([])
    },
    [gameState, selectedPile, validMoves]
  )

  const isValidTarget = useCallback(
    (location: PileLocation) => {
      return validMoves.some(
        (m) =>
          m.to.type === location.type &&
          m.to.owner === location.owner &&
          m.to.index === location.index
      )
    },
    [validMoves]
  )

  const isSelected = useCallback(
    (location: PileLocation) => {
      return (
        selectedPile !== null &&
        selectedPile.type === location.type &&
        selectedPile.owner === location.owner &&
        selectedPile.index === location.index
      )
    },
    [selectedPile]
  )

  return (
    <div className="app">
      <GameStatus
        gameState={gameState}
        onNewGame={handleNewGame}
      />
      <GameBoard
        gameState={gameState}
        onPileClick={handlePileClick}
        isSelected={isSelected}
        isValidTarget={isValidTarget}
      />
    </div>
  )
}

export default App

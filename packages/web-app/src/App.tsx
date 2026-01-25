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
import { HistorySheet } from './components/HistorySheet'
import './App.css'

function App() {
  const [gameState, setGameState] = useState<GameState>(() => initializeGame())
  const [stateHistory, setStateHistory] = useState<GameState[]>([])
  const [selectedPile, setSelectedPile] = useState<PileLocation | null>(null)
  const [validMoves, setValidMoves] = useState<Move[]>([])

  const handleNewGame = useCallback(() => {
    setGameState(initializeGame())
    setStateHistory([])
    setSelectedPile(null)
    setValidMoves([])
  }, [])

  const handleUndo = useCallback(() => {
    if (stateHistory.length === 0) return
    const previousState = stateHistory[stateHistory.length - 1]
    if (previousState) {
      setStateHistory((prev) => prev.slice(0, -1))
      setGameState(previousState)
      setSelectedPile(null)
      setValidMoves([])
    }
  }, [stateHistory])

  const selectPile = useCallback(
    (location: PileLocation) => {
      // Can't select foundations as source
      if (location.type === 'foundation') return
      // Can only select own reserve/waste, but can select ANY tableau
      if (location.type !== 'tableau' && location.owner !== gameState.currentTurn) return

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
    },
    [gameState]
  )

  const tryMove = useCallback(
    (toLocation: PileLocation) => {
      const move = validMoves.find(
        (m) =>
          m.to.type === toLocation.type &&
          m.to.owner === toLocation.owner &&
          m.to.index === toLocation.index
      )

      if (move) {
        const result = applyMove(gameState, move)
        if (result.valid && result.newState) {
          setStateHistory((prev) => [...prev, gameState])
          setGameState(result.newState)
        }
      }

      setSelectedPile(null)
      setValidMoves([])
    },
    [gameState, validMoves]
  )

  const handlePileClick = useCallback(
    (location: PileLocation) => {
      if (gameState.winner) return

      // If clicking on hand, draw a card
      if (location.type === 'hand' && location.owner === gameState.currentTurn) {
        const result = drawFromHand(gameState)
        if (result.valid && result.newState) {
          setStateHistory((prev) => [...prev, gameState])
          setGameState(result.newState)
          setSelectedPile(null)
          setValidMoves([])
        }
        return
      }

      // If no pile is selected, try to select this one as source
      if (!selectedPile) {
        selectPile(location)
        return
      }

      // A pile is already selected, try to make a move to this location
      tryMove(location)
    },
    [gameState, selectedPile, selectPile, tryMove]
  )

  const handleDragStart = useCallback(
    (location: PileLocation) => {
      if (gameState.winner) return
      selectPile(location)
    },
    [gameState.winner, selectPile]
  )

  const handleDragEnd = useCallback(() => {
    setSelectedPile(null)
    setValidMoves([])
  }, [])

  const handleDrop = useCallback(
    (location: PileLocation) => {
      if (!selectedPile) return
      tryMove(location)
    },
    [selectedPile, tryMove]
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

  const canDrag = useCallback(
    (location: PileLocation) => {
      if (gameState.winner) return false
      if (location.type === 'foundation') return false
      if (location.type === 'hand') return false
      // Can only drag from own reserve/waste, but can drag from ANY tableau
      if (location.type !== 'tableau' && location.owner !== gameState.currentTurn) return false
      return true
    },
    [gameState.winner, gameState.currentTurn]
  )

  return (
    <div className="app">
      <GameStatus
        gameState={gameState}
        onNewGame={handleNewGame}
        onUndo={handleUndo}
        canUndo={stateHistory.length > 0}
      />
      <GameBoard
        gameState={gameState}
        onPileClick={handlePileClick}
        isSelected={isSelected}
        isValidTarget={isValidTarget}
        canDrag={canDrag}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDrop={handleDrop}
      />
      <HistorySheet history={gameState.history} />
    </div>
  )
}

export default App

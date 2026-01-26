import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import {
  initializeGame,
  applyMove,
  drawFromHand,
  getValidMoves,
  getHintMoves,
  type GameState,
  type Move,
  type PileLocation,
  type Card,
} from '@russian-bank/game-engine'
import { computeAITurn } from '@russian-bank/ai-training'
import { GameBoard } from './components/GameBoard'
import { GameStatus } from './components/GameStatus'
import { HistorySheet } from './components/HistorySheet'
import { AnimatingCard } from './components/AnimatingCard'
import './App.css'

interface AnimationState {
  card: Card
  from: { x: number; y: number; width: number; height: number }
  to: { x: number; y: number; width: number; height: number }
  pendingState: GameState
  pendingHistory: GameState[]
}

function getPileDataId(location: PileLocation): string {
  if (location.type === 'foundation') {
    return `pile-foundation-${location.index}`
  }
  if (location.index !== undefined) {
    return `pile-${location.type}-${location.owner}-${location.index}`
  }
  return `pile-${location.type}-${location.owner}`
}

function getElementPosition(dataId: string): { x: number; y: number; width: number; height: number } | null {
  const element = document.querySelector(`[data-pile-id="${dataId}"]`)
  if (!element) return null
  const rect = element.getBoundingClientRect()
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
}

function App() {
  const [gameState, setGameState] = useState<GameState>(() => initializeGame())
  const [stateHistory, setStateHistory] = useState<GameState[]>([])
  const [selectedPile, setSelectedPile] = useState<PileLocation | null>(null)
  const [validMoves, setValidMoves] = useState<Move[]>([])
  const [animation, setAnimation] = useState<AnimationState | null>(null)
  const [showHints, setShowHints] = useState(false)
  const [vsAI, setVsAI] = useState(true)
  const aiSpeed = 400 // ms between AI moves
  const isAnimating = useRef(false)

  // Get source locations that have worthwhile moves (for hints)
  // Only shows high-value moves: foundation, attacks, and tableau moves that expose useful cards
  const sourcesWithMoves = useMemo(() => {
    if (!showHints || gameState.winner || animation) return []
    const moves = getHintMoves(gameState)
    const sources = new Map<string, { location: PileLocation; moveCount: number }>()

    for (const move of moves) {
      const key = getPileDataId(move.from)
      const existing = sources.get(key)
      if (existing) {
        existing.moveCount++
      } else {
        sources.set(key, { location: move.from, moveCount: 1 })
      }
    }

    return Array.from(sources.values())
  }, [showHints, gameState, animation])

  const hasMovesFrom = useCallback(
    (location: PileLocation) => {
      if (!showHints) return false
      const key = getPileDataId(location)
      return sourcesWithMoves.some(s => getPileDataId(s.location) === key)
    },
    [showHints, sourcesWithMoves]
  )

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
      if (isAnimating.current) return

      const move = validMoves.find(
        (m) =>
          m.to.type === toLocation.type &&
          m.to.owner === toLocation.owner &&
          m.to.index === toLocation.index
      )

      if (move) {
        const result = applyMove(gameState, move)
        if (result.valid && result.newState) {
          // Get positions for animation
          const fromPos = getElementPosition(getPileDataId(move.from))
          const toPos = getElementPosition(getPileDataId(move.to))

          if (fromPos && toPos) {
            // Start animation
            isAnimating.current = true
            setAnimation({
              card: move.card,
              from: fromPos,
              to: toPos,
              pendingState: result.newState,
              pendingHistory: [...stateHistory, gameState],
            })
          } else {
            // No animation, just apply immediately
            setStateHistory((prev) => [...prev, gameState])
            setGameState(result.newState)
          }
        }
      }

      setSelectedPile(null)
      setValidMoves([])
    },
    [gameState, validMoves, stateHistory]
  )

  const handleAnimationComplete = useCallback(() => {
    if (animation) {
      setGameState(animation.pendingState)
      setStateHistory(animation.pendingHistory)
      setAnimation(null)
      isAnimating.current = false
    }
  }, [animation])

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

  // AI turn handling - compute all moves upfront, then play them back
  const aiMovesRef = useRef<{ state: GameState }[]>([])
  const aiMoveIndexRef = useRef(0)

  // Compute AI moves when it becomes AI's turn
  useEffect(() => {
    if (!vsAI || gameState.currentTurn !== 'player2' || gameState.winner || animation) {
      return
    }

    // Only compute if we don't have moves queued
    if (aiMovesRef.current.length === 0) {
      const moves = computeAITurn(gameState)
      aiMovesRef.current = moves
      aiMoveIndexRef.current = 0
    }
  }, [vsAI, gameState, animation])

  // Play back AI moves one at a time
  useEffect(() => {
    if (aiMovesRef.current.length === 0 || aiMoveIndexRef.current >= aiMovesRef.current.length) {
      return
    }

    const timeoutId = setTimeout(() => {
      const step = aiMovesRef.current[aiMoveIndexRef.current]
      if (step) {
        setStateHistory(prev => [...prev, gameState])
        setGameState(step.state)
        aiMoveIndexRef.current++

        // Clear queue when done
        if (aiMoveIndexRef.current >= aiMovesRef.current.length) {
          aiMovesRef.current = []
          aiMoveIndexRef.current = 0
        }
      }
    }, aiSpeed)

    return () => clearTimeout(timeoutId)
  }, [gameState, aiSpeed])

  return (
    <div className="app">
      <GameStatus
        gameState={gameState}
        onNewGame={handleNewGame}
        onUndo={handleUndo}
        canUndo={stateHistory.length > 0 && !animation}
        showHints={showHints}
        onToggleHints={() => setShowHints((h) => !h)}
        vsAI={vsAI}
        onToggleAI={() => setVsAI((v) => !v)}
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
        hasMovesFrom={hasMovesFrom}
      />
      <HistorySheet history={gameState.history} />
      {animation && (
        <AnimatingCard
          card={animation.card}
          from={animation.from}
          to={animation.to}
          onComplete={handleAnimationComplete}
        />
      )}
    </div>
  )
}

export default App

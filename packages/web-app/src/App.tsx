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
import { computeAITurn, BOT_PROFILES, DEFAULT_BOT_PROFILE, type AITurnStep } from '@russian-bank/ai-training'
import { GameBoard } from './components/GameBoard'
import { GameStatus } from './components/GameStatus'
import { HistorySheet } from './components/HistorySheet'
import { AnimatingCard } from './components/AnimatingCard'
import { SettingsModal } from './components/SettingsModal'
import { EvaluationBar } from './components/EvaluationBar'
import './App.css'

interface GameTranscript {
  seed: number
  botId: string
  winner: 'player1' | 'player2'
  history: string[]
  moveCount: number
  p1CardsLeft: number
  p2CardsLeft: number
  timestamp: number
}

interface AnimationState {
  card: Card
  from: { x: number; y: number; width: number; height: number }
  to: { x: number; y: number; width: number; height: number }
  pendingState: GameState
  pendingHistory: GameState[]
  isAIMove?: boolean
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
  const [showHints, setShowHints] = useState(true)
  const [vsAI, setVsAI] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedBotId, setSelectedBotId] = useState(DEFAULT_BOT_PROFILE.id)

  const selectedBot = useMemo(
    () => BOT_PROFILES.find((b) => b.id === selectedBotId) ?? DEFAULT_BOT_PROFILE,
    [selectedBotId]
  )
  const aiSpeed = 300 // ms between AI moves
  const isAnimating = useRef(false)

  // AI turn handling - compute all moves upfront, then play them back with animations
  const aiMovesRef = useRef<AITurnStep[]>([])
  const aiMoveIndexRef = useRef(0)
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playNextAIMoveRef = useRef<() => void>(() => {})

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
      // Hide hints when a card is selected (showing valid targets instead)
      if (selectedPile) return false
      const key = getPileDataId(location)
      return sourcesWithMoves.some(s => getPileDataId(s.location) === key)
    },
    [showHints, sourcesWithMoves, selectedPile]
  )

  const handleNewGame = useCallback(() => {
    // Clear any pending AI moves
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current)
      aiTimeoutRef.current = null
    }
    aiMovesRef.current = []
    aiMoveIndexRef.current = 0

    setGameState(initializeGame())
    setStateHistory([])
    setSelectedPile(null)
    setValidMoves([])
    setAnimation(null)
    isAnimating.current = false
  }, [])

  const handleUndo = useCallback(() => {
    if (stateHistory.length === 0) return
    const previousState = stateHistory[stateHistory.length - 1]
    if (previousState) {
      // Clear any pending AI moves when undoing
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current)
        aiTimeoutRef.current = null
      }
      aiMovesRef.current = []
      aiMoveIndexRef.current = 0

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
      // Can only select own reserve/waste/drawn, but can select ANY tableau
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

  // Play next AI move with animation
  const playNextAIMove = useCallback(() => {
    if (aiMoveIndexRef.current >= aiMovesRef.current.length) {
      // Done with AI moves
      aiMovesRef.current = []
      aiMoveIndexRef.current = 0
      return
    }

    const step = aiMovesRef.current[aiMoveIndexRef.current]
    if (!step) return

    const { decision } = step

    // If it's a move (not a draw), animate it
    if (decision.type === 'move' && decision.move) {
      const move = decision.move
      const fromPos = getElementPosition(getPileDataId(move.from))
      const toPos = getElementPosition(getPileDataId(move.to))

      if (fromPos && toPos) {
        isAnimating.current = true
        setAnimation({
          card: move.card,
          from: fromPos,
          to: toPos,
          pendingState: step.state,
          pendingHistory: [...stateHistory, gameState],
          isAIMove: true,
        })
        aiMoveIndexRef.current++
        return
      }
    }

    // For draws or if we can't get positions, just apply the state
    setStateHistory(prev => [...prev, gameState])
    setGameState(step.state)
    aiMoveIndexRef.current++

    // Schedule next move
    if (aiMoveIndexRef.current < aiMovesRef.current.length) {
      aiTimeoutRef.current = setTimeout(() => playNextAIMoveRef.current(), aiSpeed)
    } else {
      aiMovesRef.current = []
      aiMoveIndexRef.current = 0
    }
  }, [gameState, stateHistory, aiSpeed])

  const handleAnimationComplete = useCallback(() => {
    if (animation) {
      setGameState(animation.pendingState)
      setStateHistory(animation.pendingHistory)
      const wasAIMove = animation.isAIMove
      setAnimation(null)
      isAnimating.current = false

      // If this was an AI move, schedule the next one
      if (wasAIMove && aiMoveIndexRef.current < aiMovesRef.current.length) {
        aiTimeoutRef.current = setTimeout(() => playNextAIMoveRef.current(), aiSpeed)
      } else if (wasAIMove) {
        // AI turn complete
        aiMovesRef.current = []
        aiMoveIndexRef.current = 0
      }
    }
  }, [animation, aiSpeed])

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

  // Keep playNextAIMove ref updated
  playNextAIMoveRef.current = playNextAIMove

  // Compute AI moves when it becomes AI's turn
  useEffect(() => {
    if (!vsAI || gameState.currentTurn !== 'player2' || gameState.winner || animation || isAnimating.current) {
      return
    }

    // Compute moves if we don't have any queued
    if (aiMovesRef.current.length === 0) {
      const moves = computeAITurn(gameState, selectedBot.weights, selectedBot.config)
      if (moves.length > 0) {
        aiMovesRef.current = moves
        aiMoveIndexRef.current = 0
      }
    }

    // Schedule next move if we have moves and no timeout pending
    if (aiMovesRef.current.length > 0 && !aiTimeoutRef.current) {
      aiTimeoutRef.current = setTimeout(() => {
        aiTimeoutRef.current = null
        playNextAIMoveRef.current()
      }, aiSpeed)
    }
  }, [vsAI, gameState, animation, aiSpeed, selectedBot])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current)
        aiTimeoutRef.current = null
      }
    }
  }, [])

  // Log completed AI games to localStorage
  useEffect(() => {
    if (!vsAI || !gameState.winner) return

    const p1 = gameState.player1
    const p2 = gameState.player2
    const transcript: GameTranscript = {
      seed: gameState.seed,
      botId: selectedBotId,
      winner: gameState.winner,
      history: gameState.history,
      moveCount: gameState.moveCount,
      p1CardsLeft: p1.reserve.length + p1.hand.length + p1.waste.length + (p1.drawnCard ? 1 : 0),
      p2CardsLeft: p2.reserve.length + p2.hand.length + p2.waste.length + (p2.drawnCard ? 1 : 0),
      timestamp: Date.now(),
    }

    try {
      const raw = localStorage.getItem('gameTranscripts')
      const transcripts: GameTranscript[] = raw ? JSON.parse(raw) : []
      transcripts.push(transcript)
      localStorage.setItem('gameTranscripts', JSON.stringify(transcripts.slice(-1000)))
    } catch {
      // Ignore storage errors (quota exceeded, etc.)
    }
  }, [gameState.winner, vsAI, selectedBotId, gameState])

  const p1 = gameState.player1
  const p2 = gameState.player2
  const p1CardsLeft = p1.reserve.length + p1.hand.length + p1.waste.length + (p1.drawnCard ? 1 : 0)
  const p2CardsLeft = p2.reserve.length + p2.hand.length + p2.waste.length + (p2.drawnCard ? 1 : 0)

  return (
    <div className="app">
      <GameStatus
        gameState={gameState}
        onNewGame={handleNewGame}
        onUndo={handleUndo}
        canUndo={stateHistory.length > 0 && !animation}
        onOpenSettings={() => setSettingsOpen(true)}
        vsAI={vsAI}
        botName={vsAI ? selectedBot.name : undefined}
      />
      <div className="app__main">
        <EvaluationBar player1Cards={p1CardsLeft} player2Cards={p2CardsLeft} />
        <GameBoard
          gameState={gameState}
          onPileClick={handlePileClick}
          isSelected={isSelected}
          isValidTarget={isValidTarget}
          hasMovesFrom={hasMovesFrom}
          player1Name="You"
          player2Name={vsAI ? selectedBot.name : 'Player 2'}
        />
      </div>
      <HistorySheet history={gameState.history} />
      {animation && (
        <AnimatingCard
          card={animation.card}
          from={animation.from}
          to={animation.to}
          onComplete={handleAnimationComplete}
        />
      )}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        showHints={showHints}
        onToggleHints={() => setShowHints((h) => !h)}
        vsAI={vsAI}
        onToggleAI={() => setVsAI((v) => !v)}
        selectedBotId={selectedBotId}
        onSelectBot={setSelectedBotId}
      />
    </div>
  )
}

export default App

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { BOT_PROFILES, DEFAULT_BOT_PROFILE, type AITurnStep } from '@russian-bank/ai-training'
import { useNeuralBot } from './hooks/useNeuralBot'
import { GameBoard } from './components/GameBoard'
import { GameStatus } from './components/GameStatus'
import { AnimatingCard } from './components/AnimatingCard'
import { SettingsModal } from './components/SettingsModal'
import { EvaluationBar } from './components/EvaluationBar'
import { TutorialPrompt } from './components/TutorialPrompt'
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
  const navigate = useNavigate()
  const [gameState, setGameState] = useState<GameState>(() => initializeGame())
  const [stateHistory, setStateHistory] = useState<GameState[]>([])
  const [selectedPile, setSelectedPile] = useState<PileLocation | null>(null)
  const [validMoves, setValidMoves] = useState<Move[]>([])
  const [animation, setAnimation] = useState<AnimationState | null>(null)
  const [showHints, setShowHints] = useState(true)
  const [vsAI, setVsAI] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedBotId, setSelectedBotId] = useState(DEFAULT_BOT_PROFILE.id)
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(true)

  const selectedBot = useMemo(
    () => BOT_PROFILES.find((b) => b.id === selectedBotId) ?? DEFAULT_BOT_PROFILE,
    [selectedBotId]
  )

  // Neural bot hook for handling model loading
  const neuralBot = useNeuralBot(selectedBot)

  const aiSpeed = 300 // ms between AI moves
  const isAnimating = useRef(false)

  // AI turn handling - compute all moves upfront, then play them back with animations
  const aiMovesRef = useRef<AITurnStep[]>([])
  const aiMoveIndexRef = useRef(0)
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playNextAIMoveRef = useRef<() => void>(() => {})
  const lastSeenTurn = useRef<'player1' | 'player2' | null>(null)

  // Get source locations that have worthwhile moves (for hints)
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
      if (selectedPile) return false
      const key = getPileDataId(location)
      return sourcesWithMoves.some(s => getPileDataId(s.location) === key)
    },
    [showHints, sourcesWithMoves, selectedPile]
  )

  const handleNewGame = useCallback(() => {
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
      if (location.type === 'foundation') return
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
          const fromPos = getElementPosition(getPileDataId(move.from))
          const toPos = getElementPosition(getPileDataId(move.to))

          if (fromPos && toPos) {
            isAnimating.current = true
            setAnimation({
              card: move.card,
              from: fromPos,
              to: toPos,
              pendingState: result.newState,
              pendingHistory: [...stateHistory, gameState],
            })
          } else {
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

  const playNextAIMove = useCallback(() => {
    if (aiMoveIndexRef.current >= aiMovesRef.current.length) {
      aiMovesRef.current = []
      aiMoveIndexRef.current = 0
      return
    }

    const step = aiMovesRef.current[aiMoveIndexRef.current]
    if (!step) return

    const { decision } = step

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

    setStateHistory(prev => [...prev, gameState])
    setGameState(step.state)
    aiMoveIndexRef.current++

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

      if (wasAIMove && aiMoveIndexRef.current < aiMovesRef.current.length) {
        aiTimeoutRef.current = setTimeout(() => playNextAIMoveRef.current(), aiSpeed)
      } else if (wasAIMove) {
        aiMovesRef.current = []
        aiMoveIndexRef.current = 0
      }
    }
  }, [animation, aiSpeed])

  const handlePileClick = useCallback(
    (location: PileLocation) => {
      if (gameState.winner) return

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

      if (!selectedPile) {
        selectPile(location)
        return
      }

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

  playNextAIMoveRef.current = playNextAIMove

  // Track turn changes to clear stale AI moves
  useEffect(() => {
    if (lastSeenTurn.current !== null && lastSeenTurn.current !== gameState.currentTurn) {
      // Turn changed - clear any pending AI moves
      if (aiMovesRef.current.length > 0) {
        aiMovesRef.current = []
        aiMoveIndexRef.current = 0
      }
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current)
        aiTimeoutRef.current = null
      }
    }
    lastSeenTurn.current = gameState.currentTurn
  }, [gameState.currentTurn])

  // AI turn handling
  useEffect(() => {
    if (!vsAI || gameState.currentTurn !== 'player2' || gameState.winner || animation || isAnimating.current) {
      return
    }

    // Don't start AI turn while neural model is loading
    if (selectedBot.type === 'neural' && neuralBot.isLoading) {
      return
    }

    if (aiMovesRef.current.length === 0) {
      // Use neural bot's computeTurn if available, otherwise fall back to heuristic
      const moves = neuralBot.computeTurn(gameState) as AITurnStep[]
      if (moves.length > 0) {
        aiMovesRef.current = moves
        aiMoveIndexRef.current = 0
      }
    }

    if (aiMovesRef.current.length > 0 && !aiTimeoutRef.current) {
      aiTimeoutRef.current = setTimeout(() => {
        aiTimeoutRef.current = null
        playNextAIMoveRef.current()
      }, aiSpeed)
    }
  }, [vsAI, gameState, animation, aiSpeed, selectedBot, neuralBot])

  // Cleanup
  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current)
        aiTimeoutRef.current = null
      }
    }
  }, [])

  // Log completed games
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
      // Ignore
    }
  }, [gameState.winner, vsAI, selectedBotId, gameState])

  // Tutorial navigation handlers
  const handleStartTutorial = useCallback(() => {
    setShowTutorialPrompt(false)
    navigate('/tutorial')
  }, [navigate])

  const handleSkipTutorial = useCallback(() => {
    setShowTutorialPrompt(false)
  }, [])

  const handleReplayTutorial = useCallback(() => {
    setSettingsOpen(false)
    navigate('/tutorial')
  }, [navigate])

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
      {/* Neural bot loading indicator */}
      {vsAI && selectedBot.type === 'neural' && neuralBot.isLoading && (
        <div className="neural-loading">Loading AI model...</div>
      )}
      {vsAI && selectedBot.type === 'neural' && neuralBot.usingFallback && !neuralBot.isLoading && (
        <div className="neural-fallback">Using fallback AI (model not loaded)</div>
      )}
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
        onReplayTutorial={handleReplayTutorial}
        gameData={{
          seed: gameState.seed,
          history: gameState.history,
          winner: gameState.winner,
          botId: selectedBotId,
        }}
      />

      {/* First visit tutorial prompt */}
      {showTutorialPrompt && (
        <TutorialPrompt
          onStart={handleStartTutorial}
          onSkip={handleSkipTutorial}
        />
      )}
    </div>
  )
}

export default App

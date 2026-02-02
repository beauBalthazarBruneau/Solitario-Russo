import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  applyMove,
  drawFromHand,
  getValidMoves,
  type GameState,
  type Move,
  type PileLocation,
  type Card,
} from '@russian-bank/game-engine'
import { GameBoard } from '../components/GameBoard'
import { AnimatingCard } from '../components/AnimatingCard'
import { createTutorialGameState } from '../tutorial/tutorialGameState'
import { TUTORIAL_STEPS, TOTAL_STEPS } from '../tutorial/tutorialSteps'
import './TutorialPage.css'

interface AnimationState {
  card: Card
  from: { x: number; y: number; width: number; height: number }
  to: { x: number; y: number; width: number; height: number }
  pendingState: GameState
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
  const element = document.querySelector(`[data-pile-id="${dataId}"], [data-tutorial-id="${dataId}"]`)
  if (!element) return null
  const rect = element.getBoundingClientRect()
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
}

export function TutorialPage() {
  const navigate = useNavigate()
  const [gameState, setGameState] = useState<GameState>(() => createTutorialGameState())
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPile, setSelectedPile] = useState<PileLocation | null>(null)
  const [validMoves, setValidMoves] = useState<Move[]>([])
  const [animation, setAnimation] = useState<AnimationState | null>(null)
  const [interactiveCompleted, setInteractiveCompleted] = useState(false)
  const isAnimating = useRef(false)

  const step = TUTORIAL_STEPS[currentStep]

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip()
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (step?.type === 'info' || interactiveCompleted) {
          handleNext()
        }
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentStep, step, interactiveCompleted])

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(prev => prev + 1)
      setInteractiveCompleted(false)
      setSelectedPile(null)
      setValidMoves([])
    } else {
      navigate('/')
    }
  }, [currentStep, navigate])

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
      setInteractiveCompleted(false)
      setSelectedPile(null)
      setValidMoves([])
      setGameState(createTutorialGameState())
    }
  }, [currentStep])

  const handleSkip = useCallback(() => {
    navigate('/')
  }, [navigate])

  const handleAnimationComplete = useCallback(() => {
    if (animation) {
      setGameState(animation.pendingState)
      setAnimation(null)
      isAnimating.current = false
      setInteractiveCompleted(true)
    }
  }, [animation])

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
            })
          } else {
            setGameState(result.newState)
            setInteractiveCompleted(true)
          }
        }
      }

      setSelectedPile(null)
      setValidMoves([])
    },
    [gameState, validMoves]
  )

  const handlePileClick = useCallback(
    (location: PileLocation) => {
      // Handle drawing from hand
      if (location.type === 'hand' && location.owner === gameState.currentTurn) {
        const result = drawFromHand(gameState)
        if (result.valid && result.newState) {
          setGameState(result.newState)
          setSelectedPile(null)
          setValidMoves([])
        }
        return
      }

      if (step?.type === 'interactive') {
        if (step.requiredAction?.type === 'click-pile' && !selectedPile) {
          selectPile(location)
          const moves = getValidMoves(gameState)
          const movesFromPile = moves.filter(
            (m) =>
              m.from.type === location.type &&
              m.from.owner === location.owner &&
              m.from.index === location.index
          )
          if (movesFromPile.length > 0) {
            setInteractiveCompleted(true)
          }
          return
        }
        if (step.requiredAction?.type === 'make-move' && selectedPile) {
          tryMove(location)
          return
        }
      }

      if (!selectedPile) {
        selectPile(location)
      } else {
        tryMove(location)
      }
    },
    [step, selectedPile, gameState, selectPile, tryMove]
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

  const hasMovesFrom = useCallback(() => false, [])

  if (!step) return null

  const canProceed = step.type === 'info' || interactiveCompleted
  const isLastStep = currentStep === TOTAL_STEPS - 1
  const isFirstStep = currentStep === 0

  const formatContent = (content: string) => {
    const parts = content.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  return (
    <div className="tutorial-page">
      {/* Game board area */}
      <div className="tutorial-page__board">
        <GameBoard
          gameState={gameState}
          onPileClick={handlePileClick}
          isSelected={isSelected}
          isValidTarget={isValidTarget}
          hasMovesFrom={hasMovesFrom}
          player1Name="You"
          player2Name="Opponent"
        />
      </div>

      {/* Tutorial panel at bottom */}
      <div className="tutorial-page__panel">
        <div className="tutorial-page__progress">
          <div className="tutorial-page__progress-bar">
            <div
              className="tutorial-page__progress-fill"
              style={{ width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
          <span className="tutorial-page__step-count">{currentStep + 1}/{TOTAL_STEPS}</span>
        </div>

        <div className="tutorial-page__content">
          <h2 className="tutorial-page__title">{step.title}</h2>
          <div className="tutorial-page__text">
            {step.content.split('\n').map((line, i) => (
              <p key={i}>{formatContent(line)}</p>
            ))}
          </div>
        </div>

        {step.type === 'interactive' && !interactiveCompleted && (
          <div className="tutorial-page__action-hint">
            {step.id === 'click-to-move-intro' ? 'Tap the highlighted Reserve pile' : 'Tap a highlighted destination'}
          </div>
        )}

        <div className="tutorial-page__nav">
          <button
            className="tutorial-page__button tutorial-page__button--skip"
            onClick={handleSkip}
          >
            Skip
          </button>
          <div className="tutorial-page__nav-main">
            {!isFirstStep && (
              <button
                className="tutorial-page__button tutorial-page__button--back"
                onClick={handlePrev}
              >
                Back
              </button>
            )}
            <button
              className="tutorial-page__button tutorial-page__button--next"
              onClick={isLastStep ? handleSkip : handleNext}
              disabled={!canProceed}
            >
              {isLastStep ? 'Start Playing' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      {/* Highlight overlays */}
      {step.highlight && step.highlight.map((id) => (
        <TutorialHighlight key={id} targetId={id} />
      ))}

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

function TutorialHighlight({ targetId }: { targetId: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const updateRect = () => {
      const element = document.querySelector(`[data-pile-id="${targetId}"], [data-tutorial-id="${targetId}"]`)
      if (element) {
        setRect(element.getBoundingClientRect())
      } else {
        setRect(null)
      }
    }

    updateRect()
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect)
    const interval = setInterval(updateRect, 500)

    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect)
      clearInterval(interval)
    }
  }, [targetId])

  if (!rect) return null

  return (
    <div
      className="tutorial-highlight"
      style={{
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
      }}
    />
  )
}

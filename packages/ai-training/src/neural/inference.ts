/**
 * Neural network inference for move evaluation.
 * Uses the trained value network to predict win probability for move selection.
 */

import * as tf from '@tensorflow/tfjs'
import type { GameState, Move, Player } from '@russian-bank/game-engine'
import { getValidMoves, applyMove, drawFromHand, getPlayerState } from '@russian-bank/game-engine'
import { encodeGameState, STATE_ENCODING_SIZE } from './state-encoder.js'

/**
 * Evaluates a game state using the neural network.
 * Returns the predicted win probability for the specified player.
 *
 * @param model - The loaded TensorFlow.js model
 * @param state - The game state to evaluate
 * @param forPlayer - The player's perspective
 * @returns Win probability in [0, 1]
 */
export function evaluateState(
  model: tf.LayersModel,
  state: GameState,
  forPlayer: Player
): number {
  const encoded = encodeGameState(state, forPlayer)
  const input = tf.tensor2d([Array.from(encoded)], [1, STATE_ENCODING_SIZE])

  const prediction = model.predict(input) as tf.Tensor
  const value = prediction.dataSync()[0] ?? 0.5

  // Cleanup
  input.dispose()
  prediction.dispose()

  return value
}

/**
 * Batch evaluation for multiple states (more efficient).
 *
 * @param model - The loaded TensorFlow.js model
 * @param states - Array of game states to evaluate
 * @param forPlayer - The player's perspective
 * @returns Array of win probabilities
 */
export function evaluateStatesBatch(
  model: tf.LayersModel,
  states: GameState[],
  forPlayer: Player
): number[] {
  if (states.length === 0) return []

  const encodedStates = states.map(s => Array.from(encodeGameState(s, forPlayer)))
  const input = tf.tensor2d(encodedStates, [states.length, STATE_ENCODING_SIZE])

  const prediction = model.predict(input) as tf.Tensor
  const values = Array.from(prediction.dataSync()) as number[]

  // Cleanup
  input.dispose()
  prediction.dispose()

  return values
}

/**
 * Scored move with neural network evaluation
 */
export interface NeuralScoredMove {
  move: Move
  resultingState: GameState
  winProbability: number
}

/**
 * Evaluates all valid moves using the neural network.
 * Returns moves sorted by win probability (best first).
 *
 * @param model - The loaded TensorFlow.js model
 * @param state - Current game state
 * @returns Array of moves with their win probabilities, sorted best first
 */
export function evaluateMoves(
  model: tf.LayersModel,
  state: GameState
): NeuralScoredMove[] {
  const currentPlayer = state.currentTurn
  const moves = getValidMoves(state)

  if (moves.length === 0) {
    return []
  }

  // Apply each move and collect resulting states
  const moveResults: { move: Move; state: GameState }[] = []

  for (const move of moves) {
    const result = applyMove(state, move)
    if (result.valid && result.newState) {
      moveResults.push({ move, state: result.newState })
    }
  }

  // Batch evaluate all resulting states
  const states = moveResults.map(r => r.state)
  const winProbs = evaluateStatesBatch(model, states, currentPlayer)

  // Combine and sort
  const scoredMoves: NeuralScoredMove[] = moveResults.map((r, i) => ({
    move: r.move,
    resultingState: r.state,
    winProbability: winProbs[i] ?? 0.5,
  }))

  // Sort by win probability (highest first)
  scoredMoves.sort((a, b) => b.winProbability - a.winProbability)

  return scoredMoves
}

/**
 * Decision result from neural network bot
 */
export interface NeuralDecision {
  type: 'move' | 'draw'
  move?: Move
  winProbability: number
  reasoning: string
}

/**
 * Gets the best decision using neural network evaluation.
 *
 * @param model - The loaded TensorFlow.js model
 * @param state - Current game state
 * @returns The best decision (move or draw)
 */
export function getNeuralDecision(
  model: tf.LayersModel,
  state: GameState
): NeuralDecision {
  // If game is over, no decision needed
  if (state.winner || state.turnPhase === 'ended') {
    return { type: 'draw', winProbability: 0, reasoning: 'game-over' }
  }

  const currentPlayer = state.currentTurn
  const scoredMoves = evaluateMoves(model, state)

  if (scoredMoves.length === 0) {
    // No moves available, must draw
    return { type: 'draw', winProbability: 0.5, reasoning: 'no-moves-available' }
  }

  // Pick the move with highest win probability
  const best = scoredMoves[0]!
  return {
    type: 'move',
    move: best.move,
    winProbability: best.winProbability,
    reasoning: `best move (win prob: ${(best.winProbability * 100).toFixed(1)}%)`,
  }
}

/**
 * Neural network turn step
 */
export interface NeuralTurnStep {
  state: GameState
  decision: NeuralDecision
}

/**
 * Computes all moves for a neural network AI turn.
 * Similar to computeAITurn but uses neural network evaluation.
 *
 * @param model - The loaded TensorFlow.js model
 * @param initialState - The game state at the start of the turn
 * @returns Array of steps with states and decisions
 */
export function computeNeuralTurn(
  model: tf.LayersModel,
  initialState: GameState
): NeuralTurnStep[] {
  const steps: NeuralTurnStep[] = []
  let state = initialState
  const aiPlayer = initialState.currentTurn

  const MAX_MOVES_PER_TURN = 100
  let moveCount = 0

  // Track visited states to avoid cycles
  const visitedStates = new Set<string>()
  visitedStates.add(hashState(state))

  while (moveCount < MAX_MOVES_PER_TURN) {
    // Check if it's still our turn
    if (state.currentTurn !== aiPlayer) {
      break
    }

    // Check if game ended
    if (state.winner || state.turnPhase === 'ended') {
      break
    }

    const decision = getNeuralDecision(model, state)

    if (decision.type === 'move' && decision.move) {
      const result = applyMove(state, decision.move)
      if (result.valid && result.newState) {
        // Check for cycles
        const stateHash = hashState(result.newState)
        if (visitedStates.has(stateHash)) {
          // Cycle detected, force draw
          const drawResult = drawFromHand(state)
          if (drawResult.valid && drawResult.newState) {
            state = drawResult.newState
            steps.push({
              state,
              decision: { type: 'draw', winProbability: 0.5, reasoning: 'cycle-avoidance' },
            })
            if (drawResult.turnEnded) {
              break
            }
            // Reset visited states after drawing
            visitedStates.clear()
            visitedStates.add(hashState(state))
          } else {
            break
          }
        } else {
          state = result.newState
          visitedStates.add(stateHash)
          moveCount++
          steps.push({ state, decision })
        }
      } else {
        // Move failed, draw instead
        const drawResult = drawFromHand(state)
        if (drawResult.valid && drawResult.newState) {
          state = drawResult.newState
          steps.push({
            state,
            decision: { type: 'draw', winProbability: 0.5, reasoning: 'move-failed-fallback' },
          })
          if (drawResult.turnEnded) {
            break
          }
          visitedStates.clear()
          visitedStates.add(hashState(state))
        } else {
          break
        }
      }
    } else {
      // Draw from hand
      const drawResult = drawFromHand(state)
      if (drawResult.valid && drawResult.newState) {
        state = drawResult.newState
        steps.push({ state, decision })
        if (drawResult.turnEnded) {
          break
        }
        // Reset visited states after drawing (new card changes situation)
        visitedStates.clear()
        visitedStates.add(hashState(state))
      } else {
        // Can't draw - turn must end
        break
      }
    }
  }

  return steps
}

/**
 * Simple state hash for cycle detection
 */
function hashState(state: GameState): string {
  const parts: string[] = []

  for (const player of ['player1', 'player2'] as const) {
    const ps = getPlayerState(state, player)
    parts.push(ps.reserve.map(c => `${c.suit}${c.rank}${c.deck}`).join(','))
    parts.push(ps.waste.map(c => `${c.suit}${c.rank}${c.deck}`).join(','))
    for (const pile of ps.tableau) {
      parts.push(pile.map(c => `${c.suit}${c.rank}${c.deck}`).join(','))
    }
    if (ps.drawnCard) {
      parts.push(`dc:${ps.drawnCard.suit}${ps.drawnCard.rank}${ps.drawnCard.deck}`)
    }
  }

  for (const pile of state.foundations) {
    parts.push(pile.map(c => `${c.suit}${c.rank}${c.deck}`).join(','))
  }

  return parts.join('|')
}

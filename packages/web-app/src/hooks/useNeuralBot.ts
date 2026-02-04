/**
 * React hook for loading and using the neural network bot.
 * Handles async model loading with fallback to heuristic bot.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import * as tf from '@tensorflow/tfjs'
import type { GameState } from '@russian-bank/game-engine'
import type { Move } from '@russian-bank/game-engine'
import {
  computeNeuralTurn,
  computeAITurn,
  evaluateMoves,
  type BotProfile,
  type AITurnStep,
  type NeuralTurnStep,
} from '@russian-bank/ai-training'

export interface NeuralBotState {
  /** Whether the model is currently loading */
  isLoading: boolean
  /** Whether the model loaded successfully */
  isReady: boolean
  /** Error message if loading failed */
  error: string | null
  /** Whether we're using the fallback heuristic bot */
  usingFallback: boolean
}

export interface UseNeuralBotReturn extends NeuralBotState {
  /** Compute AI turn using neural network (or fallback) */
  computeTurn: (state: GameState) => AITurnStep[] | NeuralTurnStep[]
  /** Get the best move for the current player according to neural network */
  getBestMove: (state: GameState) => Move | null
  /** Retry loading the model */
  retryLoad: () => void
}

/**
 * Hook for managing neural network bot in the browser.
 *
 * @param botProfile - The bot profile to use
 * @returns Neural bot state and functions
 */
export function useNeuralBot(botProfile: BotProfile): UseNeuralBotReturn {
  const [state, setState] = useState<NeuralBotState>({
    isLoading: false,
    isReady: false,
    error: null,
    usingFallback: true,
  })

  const modelRef = useRef<tf.LayersModel | null>(null)
  const loadAttemptRef = useRef(0)

  // Load model when bot profile changes to neural type
  const loadModel = useCallback(async () => {
    if (botProfile.type !== 'neural' || !botProfile.modelPath) {
      setState({
        isLoading: false,
        isReady: false,
        error: null,
        usingFallback: true,
      })
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Dispose previous model if exists
      if (modelRef.current) {
        modelRef.current.dispose()
        modelRef.current = null
      }

      // Load the model
      const model = await tf.loadLayersModel(botProfile.modelPath)
      modelRef.current = model

      // Warm up the model with a dummy prediction
      const dummyInput = tf.zeros([1, 128]) // STATE_ENCODING_SIZE
      const warmup = model.predict(dummyInput) as tf.Tensor
      warmup.dispose()
      dummyInput.dispose()

      setState({
        isLoading: false,
        isReady: true,
        error: null,
        usingFallback: false,
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load model'
      console.warn('Failed to load neural network model:', errorMessage)
      console.log('Falling back to heuristic bot')

      setState({
        isLoading: false,
        isReady: false,
        error: errorMessage,
        usingFallback: true,
      })
    }
  }, [botProfile.type, botProfile.modelPath])

  // Load model on mount and when profile changes
  useEffect(() => {
    // Skip if already loading or loaded
    if (state.isLoading || (modelRef.current && !state.usingFallback)) {
      return
    }

    loadAttemptRef.current++
    loadModel()

    // Cleanup on unmount
    return () => {
      if (modelRef.current) {
        modelRef.current.dispose()
        modelRef.current = null
      }
    }
  }, [loadModel, state.isLoading, state.usingFallback])

  // Compute turn function
  const computeTurn = useCallback(
    (gameState: GameState): AITurnStep[] | NeuralTurnStep[] => {
      // Use neural network if available
      if (modelRef.current && !state.usingFallback) {
        try {
          return computeNeuralTurn(modelRef.current, gameState)
        } catch (err) {
          console.warn('Neural network inference failed, using fallback:', err)
          // Fall through to heuristic
        }
      }

      // Fallback to heuristic bot
      return computeAITurn(gameState, botProfile.weights, botProfile.config)
    },
    [state.usingFallback, botProfile.weights, botProfile.config]
  )

  // Get best move for hints
  const getBestMove = useCallback(
    (gameState: GameState): Move | null => {
      // Use neural network if available
      if (modelRef.current && !state.usingFallback) {
        try {
          const scoredMoves = evaluateMoves(modelRef.current, gameState)
          if (scoredMoves.length > 0) {
            return scoredMoves[0]!.move
          }
        } catch (err) {
          console.warn('Neural network evaluation failed:', err)
        }
      }

      // Fallback: compute a turn and return the first move
      const steps = computeAITurn(gameState, botProfile.weights, botProfile.config)
      for (const step of steps) {
        if (step.decision.type === 'move' && step.decision.move) {
          return step.decision.move
        }
      }

      return null
    },
    [state.usingFallback, botProfile.weights, botProfile.config]
  )

  // Retry loading
  const retryLoad = useCallback(() => {
    loadModel()
  }, [loadModel])

  return {
    ...state,
    computeTurn,
    getBestMove,
    retryLoad,
  }
}

/**
 * Check if neural network is available (TensorFlow.js loaded)
 */
export function isNeuralAvailable(): boolean {
  try {
    return typeof tf !== 'undefined' && tf.ready !== undefined
  } catch {
    return false
  }
}

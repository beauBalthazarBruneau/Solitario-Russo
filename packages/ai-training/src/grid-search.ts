import { initializeGame, type GameState } from '@russian-bank/game-engine'
import { computeAITurn, DEFAULT_WEIGHTS, DEFAULT_AI_CONFIG, type ScoreWeights, type AIConfig } from './heuristic-ai.js'

export interface GridSearchConfig {
  /** Number of games to play per weight combination */
  gamesPerConfig: number
  /** Which weights to vary and what values to try */
  weightVariations: Partial<Record<keyof ScoreWeights, number[]>>
  /** Maximum turns per game before declaring a draw */
  maxTurnsPerGame?: number
  /** Log progress to console */
  verbose?: boolean
}

export interface GameResult {
  winner: 'player1' | 'player2' | 'draw'
  totalMoves: number
  seed: number
}

export interface WeightConfigResult {
  weights: ScoreWeights
  wins: number
  losses: number
  draws: number
  winRate: number
  games: GameResult[]
}

export interface GridSearchResult {
  configs: WeightConfigResult[]
  bestConfig: WeightConfigResult
  baselineConfig: WeightConfigResult
  totalGamesPlayed: number
}

/** Count total cards in foundations */
function getFoundationCount(state: GameState): number {
  return state.foundations.reduce((sum, pile) => sum + pile.length, 0)
}

/**
 * Plays a single game between two AIs with different weights.
 * Player 1 uses testWeights, Player 2 uses baselineWeights.
 * Implements stagnation detection: if no foundation progress in N moves,
 * exploration rate increases to try different strategies.
 */
function playHeadlessGame(
  testWeights: ScoreWeights,
  baselineWeights: ScoreWeights,
  seed?: number,
  maxTurns: number = 1000
): GameResult {
  let state = initializeGame(seed)
  let turnCount = 0

  // Stagnation detection
  let lastFoundationCount = 0
  let movesSinceProgress = 0
  const STAGNATION_THRESHOLD = 50 // moves without foundation progress before increasing exploration

  // Track recent moves across turns for pattern detection
  const recentMoves: string[] = []

  while (!state.winner && state.turnPhase !== 'ended' && turnCount < maxTurns) {
    // Pick weights based on whose turn it is
    const weights = state.currentTurn === 'player1' ? testWeights : baselineWeights

    // Calculate dynamic exploration rate based on stagnation
    const stagnationLevel = Math.min(movesSinceProgress / STAGNATION_THRESHOLD, 1)
    const dynamicConfig: AIConfig = {
      ...DEFAULT_AI_CONFIG,
      // Exploration rate increases from base (5%) up to 50% when fully stagnant
      explorationRate: DEFAULT_AI_CONFIG.explorationRate + (0.45 * stagnationLevel),
      // Shuffle penalty also increases when stagnant
      shufflePenalty: DEFAULT_AI_CONFIG.shufflePenalty * (1 + stagnationLevel * 2),
    }

    // Compute and apply AI turn
    const steps = computeAITurn(state, weights, dynamicConfig, recentMoves)
    const lastStep = steps[steps.length - 1]

    if (lastStep) {
      state = lastStep.state

      // Track moves for pattern detection
      for (const step of steps) {
        if (step.decision.move) {
          const move = step.decision.move
          const pattern = `${move.from.type}:${move.from.owner ?? ''}:${move.from.index ?? ''}->${move.to.type}:${move.to.owner ?? ''}:${move.to.index ?? ''}`
          recentMoves.push(pattern)
          if (recentMoves.length > 20) recentMoves.shift()
        }
      }
    } else {
      // No moves made - shouldn't happen but handle gracefully
      break
    }

    // Check for foundation progress
    const currentFoundationCount = getFoundationCount(state)
    if (currentFoundationCount > lastFoundationCount) {
      // Progress! Reset stagnation counter
      movesSinceProgress = 0
      lastFoundationCount = currentFoundationCount
    } else {
      movesSinceProgress += steps.length
    }

    turnCount++
  }

  return {
    winner: state.winner ?? 'draw',
    totalMoves: state.moveCount,
    seed: state.seed,
  }
}

/**
 * Generates all combinations of weight variations.
 */
function generateWeightCombinations(
  baseWeights: ScoreWeights,
  variations: Partial<Record<keyof ScoreWeights, number[]>>
): ScoreWeights[] {
  const keys = Object.keys(variations) as (keyof ScoreWeights)[]

  if (keys.length === 0) {
    return [baseWeights]
  }

  const combinations: ScoreWeights[] = []

  function generate(index: number, current: ScoreWeights): void {
    if (index >= keys.length) {
      combinations.push({ ...current })
      return
    }

    const key = keys[index]!
    const values = variations[key]!

    for (const value of values) {
      current[key] = value
      generate(index + 1, current)
    }
  }

  generate(0, { ...baseWeights })
  return combinations
}

/**
 * Runs a grid search to find optimal weight configurations.
 * Tests each weight combination against the baseline (DEFAULT_WEIGHTS).
 */
export function runGridSearch(config: GridSearchConfig): GridSearchResult {
  const {
    gamesPerConfig,
    weightVariations,
    maxTurnsPerGame = 1000,
    verbose = false,
  } = config

  const weightCombinations = generateWeightCombinations(DEFAULT_WEIGHTS, weightVariations)
  const results: WeightConfigResult[] = []

  // Generate fixed seeds for fair comparison across configs
  const seeds = Array.from({ length: gamesPerConfig }, (_, i) =>
    Math.floor(Math.random() * 2147483647)
  )

  if (verbose) {
    console.log(`Testing ${weightCombinations.length} weight configurations`)
    console.log(`Playing ${gamesPerConfig} games per configuration`)
    console.log(`Total games: ${weightCombinations.length * gamesPerConfig}`)
    console.log('')
  }

  for (let configIndex = 0; configIndex < weightCombinations.length; configIndex++) {
    const testWeights = weightCombinations[configIndex]!
    const games: GameResult[] = []
    let wins = 0
    let losses = 0
    let draws = 0

    for (let gameIndex = 0; gameIndex < gamesPerConfig; gameIndex++) {
      const result = playHeadlessGame(
        testWeights,
        DEFAULT_WEIGHTS,
        seeds[gameIndex],
        maxTurnsPerGame
      )

      games.push(result)

      if (result.winner === 'player1') {
        wins++
      } else if (result.winner === 'player2') {
        losses++
      } else {
        draws++
      }
    }

    const configResult: WeightConfigResult = {
      weights: testWeights,
      wins,
      losses,
      draws,
      winRate: wins / gamesPerConfig,
      games,
    }

    results.push(configResult)

    if (verbose) {
      const changedWeights = Object.entries(testWeights)
        .filter(([key, value]) => value !== DEFAULT_WEIGHTS[key as keyof ScoreWeights])
        .map(([key, value]) => `${key}=${value}`)
        .join(', ') || 'baseline'

      console.log(
        `Config ${configIndex + 1}/${weightCombinations.length}: ` +
        `${changedWeights} -> ` +
        `${wins}W/${losses}L/${draws}D (${(configResult.winRate * 100).toFixed(1)}%)`
      )
    }
  }

  // Find best configuration
  const sortedResults = [...results].sort((a, b) => b.winRate - a.winRate)
  const bestConfig = sortedResults[0]!

  // Find baseline (DEFAULT_WEIGHTS) result
  const baselineConfig = results.find(r =>
    Object.keys(r.weights).every(
      key => r.weights[key as keyof ScoreWeights] === DEFAULT_WEIGHTS[key as keyof ScoreWeights]
    )
  ) ?? results[0]!

  if (verbose) {
    console.log('')
    console.log('=== Results ===')
    console.log(`Best config win rate: ${(bestConfig.winRate * 100).toFixed(1)}%`)
    console.log('Best weights:', bestConfig.weights)
  }

  return {
    configs: results,
    bestConfig,
    baselineConfig,
    totalGamesPlayed: weightCombinations.length * gamesPerConfig,
  }
}

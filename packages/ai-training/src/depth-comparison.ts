import { initializeGame, type GameState } from '@russian-bank/game-engine'
import { computeAITurn, DEFAULT_WEIGHTS, DEFAULT_AI_CONFIG, type ScoreWeights, type AIConfig } from './heuristic-ai.js'

export interface DepthComparisonConfig {
  /** Lookahead depth for player 1 */
  player1Depth: number
  /** Lookahead depth for player 2 */
  player2Depth: number
  /** Branch factor for both players (lower = faster but less thorough) */
  branchFactor: number
  /** Number of games to play */
  gamesCount: number
  /** Maximum turns per game */
  maxTurnsPerGame?: number
  /** Log progress */
  verbose?: boolean
}

export interface DepthComparisonResult {
  player1Config: { depth: number; branchFactor: number }
  player2Config: { depth: number; branchFactor: number }
  player1Wins: number
  player2Wins: number
  draws: number
  player1WinRate: number
  player2WinRate: number
  averageGameLength: number
  gamesPlayed: number
}

function getFoundationCount(state: GameState): number {
  return state.foundations.reduce((sum, pile) => sum + pile.length, 0)
}

function playDepthComparisonGame(
  player1Config: AIConfig,
  player2Config: AIConfig,
  weights: ScoreWeights,
  seed?: number,
  maxTurns: number = 1000
): { winner: 'player1' | 'player2' | 'draw'; moves: number } {
  let state = initializeGame(seed)
  let turnCount = 0

  let lastFoundationCount = 0
  let movesSinceProgress = 0
  const STAGNATION_THRESHOLD = 50
  const recentMoves: string[] = []

  while (!state.winner && state.turnPhase !== 'ended' && turnCount < maxTurns) {
    // Pick config based on whose turn it is
    const config = state.currentTurn === 'player1' ? player1Config : player2Config

    // Calculate dynamic exploration based on stagnation
    const stagnationLevel = Math.min(movesSinceProgress / STAGNATION_THRESHOLD, 1)
    const dynamicConfig: AIConfig = {
      ...config,
      explorationRate: config.explorationRate + (0.45 * stagnationLevel),
      shufflePenalty: config.shufflePenalty * (1 + stagnationLevel * 2),
    }

    const steps = computeAITurn(state, weights, dynamicConfig, recentMoves)
    const lastStep = steps[steps.length - 1]

    if (lastStep) {
      state = lastStep.state

      for (const step of steps) {
        if (step.decision.move) {
          const move = step.decision.move
          const pattern = `${move.from.type}:${move.from.owner ?? ''}:${move.from.index ?? ''}->${move.to.type}:${move.to.owner ?? ''}:${move.to.index ?? ''}`
          recentMoves.push(pattern)
          if (recentMoves.length > 20) recentMoves.shift()
        }
      }
    } else {
      break
    }

    const currentFoundationCount = getFoundationCount(state)
    if (currentFoundationCount > lastFoundationCount) {
      movesSinceProgress = 0
      lastFoundationCount = currentFoundationCount
    } else {
      movesSinceProgress += steps.length
    }

    turnCount++
  }

  return {
    winner: state.winner ?? 'draw',
    moves: state.moveCount,
  }
}

export function runDepthComparison(config: DepthComparisonConfig): DepthComparisonResult {
  const {
    player1Depth,
    player2Depth,
    branchFactor,
    gamesCount,
    maxTurnsPerGame = 1000,
    verbose = false,
  } = config

  const player1Config: AIConfig = {
    ...DEFAULT_AI_CONFIG,
    lookAheadDepth: player1Depth,
    lookAheadBranchFactor: branchFactor,
  }

  const player2Config: AIConfig = {
    ...DEFAULT_AI_CONFIG,
    lookAheadDepth: player2Depth,
    lookAheadBranchFactor: branchFactor,
  }

  let player1Wins = 0
  let player2Wins = 0
  let draws = 0
  let totalMoves = 0

  const seeds = Array.from({ length: gamesCount }, (_, i) =>
    Math.floor(Math.random() * 2147483647)
  )

  if (verbose) {
    console.log(`Depth Comparison: ${player1Depth} vs ${player2Depth} (branch factor: ${branchFactor})`)
    console.log(`Playing ${gamesCount} games...`)
    console.log('')
  }

  for (let i = 0; i < gamesCount; i++) {
    const startTime = Date.now()
    const result = playDepthComparisonGame(
      player1Config,
      player2Config,
      DEFAULT_WEIGHTS,
      seeds[i],
      maxTurnsPerGame
    )
    const elapsed = Date.now() - startTime

    totalMoves += result.moves

    if (result.winner === 'player1') {
      player1Wins++
    } else if (result.winner === 'player2') {
      player2Wins++
    } else {
      draws++
    }

    if (verbose) {
      console.log(
        `Game ${i + 1}/${gamesCount}: ` +
        `Winner: ${result.winner} | ` +
        `Moves: ${result.moves} | ` +
        `Time: ${(elapsed / 1000).toFixed(1)}s`
      )
    }
  }

  const player1WinRate = player1Wins / gamesCount
  const player2WinRate = player2Wins / gamesCount

  if (verbose) {
    console.log('')
    console.log('=== Results ===')
    console.log(`Depth ${player1Depth}: ${player1Wins} wins (${(player1WinRate * 100).toFixed(1)}%)`)
    console.log(`Depth ${player2Depth}: ${player2Wins} wins (${(player2WinRate * 100).toFixed(1)}%)`)
    console.log(`Draws: ${draws}`)
    console.log(`Avg game length: ${Math.round(totalMoves / gamesCount)} moves`)
  }

  return {
    player1Config: { depth: player1Depth, branchFactor },
    player2Config: { depth: player2Depth, branchFactor },
    player1Wins,
    player2Wins,
    draws,
    player1WinRate,
    player2WinRate,
    averageGameLength: totalMoves / gamesCount,
    gamesPlayed: gamesCount,
  }
}

// CLI runner (Node.js only)
if (typeof process !== 'undefined' && process.argv && import.meta.url === `file://${process.argv[1]}`) {
  const depth1 = parseInt(process.argv[2] ?? '5', 10)
  const depth2 = parseInt(process.argv[3] ?? '10', 10)
  const branchFactor = parseInt(process.argv[4] ?? '2', 10)
  const games = parseInt(process.argv[5] ?? '20', 10)

  console.log('Starting depth comparison experiment...')
  console.log('')

  runDepthComparison({
    player1Depth: depth1,
    player2Depth: depth2,
    branchFactor,
    gamesCount: games,
    verbose: true,
  })
}

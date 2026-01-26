#!/usr/bin/env node

import { initializeGame, type GameState } from '@russian-bank/game-engine'
import { computeAITurn, DEFAULT_WEIGHTS, DEFAULT_AI_CONFIG, type AIConfig } from '../index.js'

function getCardCounts(state: GameState) {
  const p1 = state.player1
  const p2 = state.player2
  return {
    p1: {
      reserve: p1.reserve.length,
      waste: p1.waste.length,
      hand: p1.hand.length,
      tableau: p1.tableau.reduce((sum, pile) => sum + pile.length, 0),
      total: p1.reserve.length + p1.waste.length + p1.hand.length + p1.tableau.reduce((sum, pile) => sum + pile.length, 0),
    },
    p2: {
      reserve: p2.reserve.length,
      waste: p2.waste.length,
      hand: p2.hand.length,
      tableau: p2.tableau.reduce((sum, pile) => sum + pile.length, 0),
      total: p2.reserve.length + p2.waste.length + p2.hand.length + p2.tableau.reduce((sum, pile) => sum + pile.length, 0),
    },
    foundations: state.foundations.reduce((sum, pile) => sum + pile.length, 0),
  }
}

// Play a game and track what happens
const seed = parseInt(process.argv[2] ?? '') || Math.floor(Math.random() * 2147483647)
const maxTurns = 1000
const STAGNATION_THRESHOLD = 50

console.log(`Replaying game with seed: ${seed}`)
console.log('Using stagnation detection + exploration')
console.log('')

let state = initializeGame(seed)
let turnCount = 0
let lastFoundationCount = 0
let movesSinceProgress = 0
const recentMoves: string[] = []

const initialCounts = getCardCounts(state)
console.log(`Initial state:`)
console.log(`  P1: ${initialCounts.p1.total} cards (reserve: ${initialCounts.p1.reserve}, hand: ${initialCounts.p1.hand}, waste: ${initialCounts.p1.waste})`)
console.log(`  P2: ${initialCounts.p2.total} cards (reserve: ${initialCounts.p2.reserve}, hand: ${initialCounts.p2.hand}, waste: ${initialCounts.p2.waste})`)
console.log(`  Foundations: ${initialCounts.foundations}`)
console.log('')

while (!state.winner && state.turnPhase !== 'ended' && turnCount < maxTurns) {
  const beforeTurn = state.currentTurn

  // Calculate dynamic exploration rate based on stagnation
  const stagnationLevel = Math.min(movesSinceProgress / STAGNATION_THRESHOLD, 1)
  const dynamicConfig: AIConfig = {
    ...DEFAULT_AI_CONFIG,
    explorationRate: DEFAULT_AI_CONFIG.explorationRate + (0.45 * stagnationLevel),
    shufflePenalty: DEFAULT_AI_CONFIG.shufflePenalty * (1 + stagnationLevel * 2),
  }

  const steps = computeAITurn(state, DEFAULT_WEIGHTS, dynamicConfig, recentMoves)
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
    console.log(`Turn ${turnCount}: No moves made, breaking`)
    break
  }

  // Check for foundation progress
  const currentFoundationCount = getCardCounts(state).foundations
  if (currentFoundationCount > lastFoundationCount) {
    movesSinceProgress = 0
    lastFoundationCount = currentFoundationCount
  } else {
    movesSinceProgress += steps.length
  }

  turnCount++

  // Log every 100 turns, and last 10 turns
  if (turnCount % 100 === 0 || (state.moveCount > 950 && state.moveCount <= 1000)) {
    const counts = getCardCounts(state)
    const exploreRate = (dynamicConfig.explorationRate * 100).toFixed(0)
    console.log(`Turn ${turnCount}: ${beforeTurn} played ${steps.length} moves (explore: ${exploreRate}%, stagnant: ${movesSinceProgress})`)
    console.log(`  P1: ${counts.p1.total} cards (r:${counts.p1.reserve} h:${counts.p1.hand} w:${counts.p1.waste} t:${counts.p1.tableau})`)
    console.log(`  P2: ${counts.p2.total} cards (r:${counts.p2.reserve} h:${counts.p2.hand} w:${counts.p2.waste} t:${counts.p2.tableau})`)
    console.log(`  Foundations: ${counts.foundations} | Total moves: ${state.moveCount}`)

    // Show what moves were made in this turn
    if (state.moveCount > 950) {
      const moveDescs = steps.map(s => s.decision.reasoning).slice(0, 5)
      console.log(`  Moves: ${moveDescs.join(' -> ')}${steps.length > 5 ? '...' : ''}`)
    }
  }
}

console.log('')
console.log('=== Game Over ===')
console.log(`Winner: ${state.winner ?? 'NONE (draw)'}`)
console.log(`Turn phase: ${state.turnPhase}`)
console.log(`Total turns: ${turnCount}`)
console.log(`Total moves: ${state.moveCount}`)

const finalCounts = getCardCounts(state)
console.log('')
console.log('Final card counts:')
console.log(`  P1: ${finalCounts.p1.total} cards (r:${finalCounts.p1.reserve} h:${finalCounts.p1.hand} w:${finalCounts.p1.waste} t:${finalCounts.p1.tableau})`)
console.log(`  P2: ${finalCounts.p2.total} cards (r:${finalCounts.p2.reserve} h:${finalCounts.p2.hand} w:${finalCounts.p2.waste} t:${finalCounts.p2.tableau})`)
console.log(`  Foundations: ${finalCounts.foundations}`)

// Check if it hit move limit
if (state.moveCount >= 1000) {
  console.log('')
  console.log('>>> Game ended due to MAX_MOVES limit (1000)')
}

# Russian Bank Monorepo - Claude Code Plan

## Project Overview

**Game Rules:** See [rules.md](./rules.md) for complete game rules and clarifications.

Monorepo with three packages:
- **game-engine**: Core game logic (shared)
- **ai-training**: Self-play and evolution (runs on Mac Mini)
- **web-app**: Mobile game UI

Training goal: Run 100k+ self-play games over the weekend, evolving AI weights.

**Repository:** https://github.com/beauBalthazarBruneau/Solitario-Russo

---

## Status Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Monorepo Setup | ✅ Complete | Using npm workspaces (not pnpm) |
| Phase 2: Game Engine | ✅ Complete | Full rules, notation, seed support |
| Phase 3: Web App | ✅ Complete | Drag/drop, animations, undo, history |
| Phase 4: AI Training | ⏳ Pending | Next up |

---

## Completed Features

### Game Engine
- ✅ Core types (Card, GameState, Move, PileLocation)
- ✅ Deck creation and seeded shuffle (for reproducible games)
- ✅ Game initialization with seed storage
- ✅ Suit-specific foundations (hearts, diamonds, clubs, spades by row)
- ✅ Unified tableau rules (down, alternating colors)
- ✅ Attack moves on opponent's waste/reserve (same suit ±1)
- ✅ Draw mechanic with drawnCard tracking
- ✅ Move notation system (RBN - Russian Bank Notation)
- ✅ Move history tracking
- ✅ Win condition detection
- ✅ Full test suite

### Web App
- ✅ React + Vite setup
- ✅ Card rendering with cardsJS SVGs
- ✅ Foundation piles with suit icons
- ✅ Horizontal tableau fanning (away from center)
- ✅ Click-to-select and click-to-move
- ✅ Drag and drop support
- ✅ Card movement animations (glide effect)
- ✅ Valid move highlighting
- ✅ Undo functionality with state history
- ✅ Move history bottom sheet
- ✅ Game status display (turn, scores, move count)
- ✅ New Game button

---

## Phase 1: Monorepo Setup ✅

### Task 1.1: Initialize Monorepo Structure ✅

```
Created monorepo using npm workspaces:

/russian-bank
  /packages
    /game-engine
    /ai-training
    /web-app (placeholder for now)
  pnpm-workspace.yaml
  package.json (root)
  tsconfig.base.json
  .gitignore

Root package.json scripts:
- "train": runs training in ai-training package
- "test": runs tests across all packages
- "build": builds all packages

Use TypeScript with project references for fast builds.
pnpm for package management (fast, good monorepo support).
```

### Task 1.2: Shared TypeScript Config ✅

```
Created /tsconfig.base.json with strict settings:
- strict: true
- noUncheckedIndexedAccess: true
- ES2022 target
- Node16 module resolution

Each package extends this base config.
```

---

## Phase 2: Game Engine Package ✅

### Task 2.1: Package Setup ✅

```
Create /packages/game-engine:
  /src
    types.ts
    constants.ts
    deck.ts
    engine.ts
    validation.ts
    index.ts (exports)
  /tests
    engine.test.ts
    validation.test.ts
  package.json (name: @russian-bank/game-engine)
  tsconfig.json

Dependencies: none (pure TypeScript)
Dev dependencies: vitest, typescript
```

### Task 2.2: Core Types ✅

```
Created /packages/game-engine/src/types.ts:

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

interface Card {
  suit: Suit
  rank: Rank
  deck: 'player1' | 'player2'  // Which deck it belongs to
}

type PileType = 'reserve' | 'waste' | 'tableau' | 'foundation' | 'hand'

interface PileLocation {
  type: PileType
  owner?: 'player1' | 'player2'  // undefined for foundations
  index?: number  // For tableau (0-3) and foundation (0-7)
}

interface GameState {
  player1: PlayerState
  player2: PlayerState
  foundations: Card[][]  // 8 piles
  currentTurn: 'player1' | 'player2'
  turnPhase: 'playing' | 'must-draw' | 'ended'
  moveCount: number
  winner: 'player1' | 'player2' | null
}

interface PlayerState {
  reserve: Card[]      // Face-down pile, top card face-up
  waste: Card[]        // Played from hand
  tableau: Card[][]    // 4 piles
  hand: Card[]         // Draw pile
}

interface Move {
  from: PileLocation
  to: PileLocation
  card: Card
}

interface MoveResult {
  valid: boolean
  reason?: string
  newState?: GameState
  turnEnded?: boolean
}
```

### Task 2.3: Deck and Shuffle ✅

```
Created /packages/game-engine/src/deck.ts:

- createDeck(owner: 'player1' | 'player2'): Card[]
  Returns 52 cards for one player

- shuffle<T>(array: T[], rng?: () => number): T[]
  Fisher-Yates shuffle
  Accept optional RNG for reproducible games (seeded random)

- createSeededRng(seed: number): () => number
  For reproducible self-play games
```

### Task 2.4: Game Initialization ✅

```
Created /packages/game-engine/src/engine.ts:

- initializeGame(seed?: number): GameState
  1. Create and shuffle both decks
  2. Deal 12 cards to each reserve (top card conceptually face-up)
  3. Deal 1 card to each of 4 tableau piles per player
  4. Remaining cards go to hand
  5. Randomly pick starting player (or player1)
  
- cloneState(state: GameState): GameState
  Deep clone for immutability
```

### Task 2.5: Move Validation ✅

```
Created /packages/game-engine/src/validation.ts:

- getValidMoves(state: GameState): Move[]
  Returns all legal moves for current player
  
- isValidMove(state: GameState, move: Move): MoveResult
  Validates a specific move

Rules to implement:
1. Foundation plays: Ace starts pile, build up by suit (A-2-3...K)
2. Own tableau: Build down, alternating colors
3. Opponent tableau: Build up OR down, same suit only
4. Can play from: reserve (top), waste (top), tableau (any face-up), hand
5. MANDATORY: Must play to foundation if possible
6. Turn ends when: draw from hand to waste, or no valid moves

Helper functions:
- canPlayOnFoundation(card: Card, pile: Card[]): boolean
- canPlayOnOwnTableau(card: Card, pile: Card[]): boolean
- canPlayOnOpponentTableau(card: Card, pile: Card[]): boolean
- getMandatoryMoves(state: GameState): Move[]  // Foundation plays
- getTopCard(pile: Card[]): Card | undefined
```

### Task 2.6: Move Execution ✅

```
Added to /packages/game-engine/src/engine.ts:

- applyMove(state: GameState, move: Move): GameState
  1. Validate move
  2. Clone state
  3. Remove card from source pile
  4. Add card to destination pile
  5. Check if turn ends (drew from hand)
  6. Check win condition
  7. Return new state

- checkWinCondition(state: GameState): 'player1' | 'player2' | null
  Win = reserve empty AND hand empty AND waste empty
  
- switchTurn(state: GameState): GameState
  Flip currentTurn, reset turnPhase
```

### Task 2.7: Game Engine Tests ✅

```
Created /packages/game-engine/tests/engine.test.ts:

Test cases:
- Initial state is valid (correct card counts everywhere)
- Seeded games are reproducible
- Foundation play validation (correct suit/rank)
- Tableau play validation (colors, directions)
- Mandatory moves are detected
- Turn ends on hand draw
- Win condition detected correctly
- Cannot make moves out of turn
- Full game simulation doesn't crash

Create /packages/game-engine/tests/validation.test.ts:
- Edge cases: empty piles, blocked states
- All pile-to-pile combinations
```

---

## Phase 3: AI Training Package ⏳ (Next Up)

### Task 3.1: Package Setup

```
Create /packages/ai-training:
  /src
    /ai
      heuristic.ts      # Rule-based AI
      weights.ts        # Weight configuration
      types.ts          # AI-specific types
    /evolution
      genetic.ts        # Genetic algorithm
      tournament.ts     # Round-robin tournaments
      population.ts     # Population management
    /training
      self-play.ts      # Game runner
      stats.ts          # Statistics collection
      checkpointing.ts  # Save/load progress
    /scripts
      train.ts          # Main training entry point
      benchmark.ts      # Test AI strength
    index.ts
  /data                  # Output directory
    /checkpoints
    /results
  package.json
  tsconfig.json

Dependencies: 
- @russian-bank/game-engine (workspace:*)
- commander (CLI)
- pino (fast logging)
Dev: vitest, typescript, tsx
```

### Task 3.2: AI Types and Weights

```
Create /packages/ai-training/src/ai/types.ts:

interface AIWeights {
  // Foundation plays (mandatory, but prioritize which)
  foundationFromReserve: number
  foundationFromWaste: number
  foundationFromTableau: number
  
  // Reserve plays (key to winning)
  reserveToTableau: number
  reserveToOpponentTableau: number
  
  // Tableau management
  exposeTableauCard: number      // Move to reveal face-down
  emptyTableauPile: number       // Value of empty pile
  buildTableauSequence: number   // Longer sequences
  
  // Opponent harassment
  blockOpponentTableau: number   // Play on their piles
  
  // Waste/Hand
  wasteToTableau: number
  drawFromHand: number           // Usually last resort
  
  // Strategic
  preserveOptions: number        // Keep flexibility
  riskTolerance: number          // Affects uncertain moves
}

Create /packages/ai-training/src/ai/weights.ts:

- DEFAULT_WEIGHTS: AIWeights (hand-tuned starting point)
- randomWeights(variance: number): AIWeights
- mutateWeights(weights: AIWeights, rate: number): AIWeights
- crossoverWeights(a: AIWeights, b: AIWeights): AIWeights
- normalizeWeights(weights: AIWeights): AIWeights
```

### Task 3.3: Heuristic AI

```
Create /packages/ai-training/src/ai/heuristic.ts:

class HeuristicAI {
  constructor(private weights: AIWeights) {}
  
  selectMove(state: GameState, validMoves: Move[]): Move {
    // Score each move
    const scored = validMoves.map(move => ({
      move,
      score: this.scoreMove(state, move)
    }))
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score)
    
    // Return best (or random among ties)
    return scored[0].move
  }
  
  private scoreMove(state: GameState, move: Move): number {
    let score = 0
    
    // Apply weights based on move characteristics
    if (move.to.type === 'foundation') {
      if (move.from.type === 'reserve') score += this.weights.foundationFromReserve
      // ... etc
    }
    
    // Simulate move and evaluate resulting state
    const newState = applyMove(state, move)
    score += this.evaluateState(newState)
    
    return score
  }
  
  private evaluateState(state: GameState): number {
    // Evaluate position quality
    // - Cards remaining in reserve (fewer = better)
    // - Foundation progress
    // - Tableau flexibility
    // - Opponent's position (relatively)
  }
}
```

### Task 3.4: Self-Play Runner

```
Create /packages/ai-training/src/training/self-play.ts:

interface GameResult {
  winner: 'player1' | 'player2' | 'draw'
  moves: number
  player1CardsRemaining: number
  player2CardsRemaining: number
  seed: number
  durationMs: number
}

function playSingleGame(
  ai1: HeuristicAI,
  ai2: HeuristicAI,
  seed: number,
  maxMoves: number = 1000  // Prevent infinite games
): GameResult {
  let state = initializeGame(seed)
  let moves = 0
  
  while (!state.winner && moves < maxMoves) {
    const currentAI = state.currentTurn === 'player1' ? ai1 : ai2
    const validMoves = getValidMoves(state)
    
    if (validMoves.length === 0) {
      state = switchTurn(state)
      continue
    }
    
    const move = currentAI.selectMove(state, validMoves)
    state = applyMove(state, move)
    moves++
  }
  
  return {
    winner: state.winner ?? 'draw',
    moves,
    // ... stats
  }
}

function runSelfPlayBatch(
  ai1: HeuristicAI,
  ai2: HeuristicAI,
  numGames: number,
  startSeed: number = 0
): GameResult[] {
  const results: GameResult[] = []
  for (let i = 0; i < numGames; i++) {
    results.push(playSingleGame(ai1, ai2, startSeed + i))
  }
  return results
}
```

### Task 3.5: Tournament System

```
Create /packages/ai-training/src/evolution/tournament.ts:

interface Competitor {
  id: string
  weights: AIWeights
  elo: number  // Track rating
}

interface TournamentResult {
  rankings: Array<{ id: string; wins: number; losses: number; elo: number }>
  totalGames: number
  durationMs: number
}

function runTournament(
  competitors: Competitor[],
  gamesPerPair: number = 10
): TournamentResult {
  // Round-robin: each pair plays N games
  // Half with player1/player2 swapped (fairness)
  // Update ELO ratings
  // Return rankings
}

function calculateElo(
  winnerElo: number,
  loserElo: number,
  k: number = 32
): [newWinnerElo: number, newLoserElo: number] {
  // Standard ELO calculation
}
```

### Task 3.6: Genetic Algorithm

```
Create /packages/ai-training/src/evolution/genetic.ts:

interface EvolutionConfig {
  populationSize: number        // e.g., 50
  eliteCount: number            // Keep top N unchanged
  mutationRate: number          // e.g., 0.1
  mutationStrength: number      // How much to mutate
  crossoverRate: number         // e.g., 0.7
  gamesPerEvaluation: number    // Games per tournament
}

interface Generation {
  number: number
  population: Competitor[]
  bestWeights: AIWeights
  bestElo: number
  avgElo: number
  timestamp: Date
}

function evolveGeneration(
  currentGen: Generation,
  config: EvolutionConfig
): Generation {
  // 1. Run tournament to rank current population
  const results = runTournament(currentGen.population, config.gamesPerEvaluation)
  
  // 2. Select parents (tournament selection or roulette)
  const parents = selectParents(results.rankings, config)
  
  // 3. Create next generation
  const nextPop: Competitor[] = []
  
  // 3a. Keep elites
  for (let i = 0; i < config.eliteCount; i++) {
    nextPop.push(results.rankings[i])
  }
  
  // 3b. Crossover and mutate to fill rest
  while (nextPop.length < config.populationSize) {
    const [p1, p2] = pickTwoParents(parents)
    let childWeights = crossoverWeights(p1.weights, p2.weights)
    
    if (Math.random() < config.mutationRate) {
      childWeights = mutateWeights(childWeights, config.mutationStrength)
    }
    
    nextPop.push({
      id: generateId(),
      weights: childWeights,
      elo: 1200  // Reset for new individual
    })
  }
  
  return {
    number: currentGen.number + 1,
    population: nextPop,
    bestWeights: results.rankings[0].weights,
    bestElo: results.rankings[0].elo,
    avgElo: average(results.rankings.map(r => r.elo)),
    timestamp: new Date()
  }
}
```

### Task 3.7: Checkpointing

```
Create /packages/ai-training/src/training/checkpointing.ts:

interface TrainingState {
  config: EvolutionConfig
  currentGeneration: Generation
  history: Array<{
    generation: number
    bestElo: number
    avgElo: number
    timestamp: Date
  }>
  totalGamesPlayed: number
  startedAt: Date
}

function saveCheckpoint(
  state: TrainingState,
  path: string = './data/checkpoints'
): void {
  const filename = `checkpoint-gen-${state.currentGeneration.number}.json`
  // Write JSON
  // Also save "latest.json" symlink/copy for easy resume
}

function loadLatestCheckpoint(
  path: string = './data/checkpoints'
): TrainingState | null {
  // Load latest.json if exists
}

function exportBestWeights(
  state: TrainingState,
  path: string = './data/results'
): void {
  // Export best weights in format web app can consume
  const output = {
    version: '1.0.0',
    generationsTrained: state.currentGeneration.number,
    gamesPlayed: state.totalGamesPlayed,
    weights: state.currentGeneration.bestWeights,
    exportedAt: new Date().toISOString()
  }
  // Write to ai-weights.json
}
```

### Task 3.8: Statistics and Logging

```
Create /packages/ai-training/src/training/stats.ts:

interface TrainingStats {
  gamesPerSecond: number
  currentGeneration: number
  bestElo: number
  eloImprovement: number  // vs generation 1
  estimatedTimeRemaining: string
  topWeights: AIWeights
}

function calculateStats(state: TrainingState): TrainingStats

function logProgress(stats: TrainingStats): void {
  // Pretty console output
  // Generation 47/100 | Best ELO: 1847 (+312) | 423 games/sec | ETA: 2h 14m
}

Create /packages/ai-training/src/training/reporter.ts:

function generateReport(state: TrainingState): string {
  // Markdown report of training run
  // - Config used
  // - ELO progression chart (ASCII)
  // - Best weights
  // - Notable findings
}
```

### Task 3.9: Main Training Script

```
Create /packages/ai-training/src/scripts/train.ts:

#!/usr/bin/env tsx

import { Command } from 'commander'

const program = new Command()

program
  .name('train')
  .description('Train Russian Bank AI via self-play evolution')
  .option('-g, --generations <n>', 'Number of generations', '100')
  .option('-p, --population <n>', 'Population size', '50')
  .option('-G, --games <n>', 'Games per tournament pair', '20')
  .option('--resume', 'Resume from latest checkpoint')
  .option('--seed <n>', 'Random seed for reproducibility')
  .action(async (options) => {
    const config: EvolutionConfig = {
      populationSize: parseInt(options.population),
      eliteCount: 5,
      mutationRate: 0.15,
      mutationStrength: 0.2,
      crossoverRate: 0.7,
      gamesPerEvaluation: parseInt(options.games)
    }
    
    let state: TrainingState
    
    if (options.resume) {
      state = loadLatestCheckpoint() ?? initializeTraining(config)
    } else {
      state = initializeTraining(config)
    }
    
    const targetGenerations = parseInt(options.generations)
    
    console.log(`Starting training: ${targetGenerations} generations`)
    console.log(`Population: ${config.populationSize}, Games/pair: ${config.gamesPerEvaluation}`)
    
    while (state.currentGeneration.number < targetGenerations) {
      state.currentGeneration = evolveGeneration(state.currentGeneration, config)
      state.totalGamesPlayed += countGamesInGeneration(config)
      
      logProgress(calculateStats(state))
      
      // Checkpoint every 10 generations
      if (state.currentGeneration.number % 10 === 0) {
        saveCheckpoint(state)
        exportBestWeights(state)
      }
    }
    
    // Final export
    saveCheckpoint(state)
    exportBestWeights(state)
    console.log(generateReport(state))
  })

program.parse()
```

### Task 3.10: Benchmark Script

```
Create /packages/ai-training/src/scripts/benchmark.ts:

#!/usr/bin/env tsx

// Compare trained AI against baseline
// Usage: pnpm benchmark --trained ./data/results/ai-weights.json

import { Command } from 'commander'

program
  .option('-t, --trained <path>', 'Path to trained weights')
  .option('-n, --games <n>', 'Number of games', '1000')
  .action(async (options) => {
    const trainedWeights = loadWeights(options.trained)
    const baselineWeights = DEFAULT_WEIGHTS
    
    const trainedAI = new HeuristicAI(trainedWeights)
    const baselineAI = new HeuristicAI(baselineWeights)
    
    const results = runSelfPlayBatch(trainedAI, baselineAI, parseInt(options.games))
    
    const trainedWins = results.filter(r => r.winner === 'player1').length
    const baselineWins = results.filter(r => r.winner === 'player2').length
    
    console.log(`Trained AI: ${trainedWins} wins (${(trainedWins/results.length*100).toFixed(1)}%)`)
    console.log(`Baseline AI: ${baselineWins} wins (${(baselineWins/results.length*100).toFixed(1)}%)`)
  })
```

---

## Phase 4: Performance Optimization

### Task 4.1: Parallel Game Execution

```
Update /packages/ai-training/src/training/self-play.ts:

Add worker thread support for parallel game execution:

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads'
import os from 'os'

const NUM_WORKERS = os.cpus().length  // Use all cores on Mac Mini

function runSelfPlayBatchParallel(
  ai1Weights: AIWeights,
  ai2Weights: AIWeights,
  numGames: number
): Promise<GameResult[]> {
  const gamesPerWorker = Math.ceil(numGames / NUM_WORKERS)
  
  const workers = Array.from({ length: NUM_WORKERS }, (_, i) => {
    return new Promise<GameResult[]>((resolve) => {
      const worker = new Worker(__filename, {
        workerData: {
          ai1Weights,
          ai2Weights,
          numGames: gamesPerWorker,
          startSeed: i * gamesPerWorker
        }
      })
      worker.on('message', resolve)
    })
  })
  
  const results = await Promise.all(workers)
  return results.flat()
}

// Worker thread code
if (!isMainThread) {
  const { ai1Weights, ai2Weights, numGames, startSeed } = workerData
  const ai1 = new HeuristicAI(ai1Weights)
  const ai2 = new HeuristicAI(ai2Weights)
  const results = runSelfPlayBatch(ai1, ai2, numGames, startSeed)
  parentPort?.postMessage(results)
}
```

### Task 4.2: Optimized Game State

```
Review game-engine for performance:

- Use typed arrays where beneficial
- Minimize object allocations in hot paths
- Consider bitboard representation for cards if needed
- Profile with clinic.js or 0x

Target: 1000+ games/second on Mac Mini
```

---

## Phase 5: Running the Training

### Task 5.1: Package Scripts

```
Update /packages/ai-training/package.json:

{
  "scripts": {
    "train": "tsx src/scripts/train.ts",
    "train:weekend": "tsx src/scripts/train.ts -g 500 -p 100 -G 50",
    "benchmark": "tsx src/scripts/benchmark.ts",
    "test": "vitest"
  }
}

Update root /package.json:

{
  "scripts": {
    "train": "pnpm --filter @russian-bank/ai-training train",
    "train:weekend": "pnpm --filter @russian-bank/ai-training train:weekend",
    "test": "pnpm -r test"
  }
}
```

### Task 5.2: Weekend Run Script

```
Create /scripts/weekend-train.sh:

#!/bin/bash

# Run overnight training on Mac Mini
# Usage: nohup ./scripts/weekend-train.sh &

cd "$(dirname "$0")/.."

echo "Starting weekend training run at $(date)"
echo "Logging to ./training.log"

# Run with high settings
pnpm train:weekend 2>&1 | tee training.log

echo "Training complete at $(date)"

# Send notification (optional, if you have terminal-notifier)
# terminal-notifier -title "Training Complete" -message "Russian Bank AI training finished"
```

---

## Expected Output

After the weekend, you'll have:

```
/packages/ai-training/data/
  /checkpoints/
    checkpoint-gen-10.json
    checkpoint-gen-20.json
    ...
    checkpoint-gen-500.json
    latest.json
  /results/
    ai-weights.json          ← Import this into web app
    training-report.md       ← Summary of run
```

**ai-weights.json:**
```json
{
  "version": "1.0.0",
  "generationsTrained": 500,
  "gamesPlayed": 1250000,
  "elo": 1847,
  "weights": {
    "foundationFromReserve": 89.3,
    "reserveToTableau": 67.2,
    ...
  },
  "exportedAt": "2025-01-26T09:00:00Z"
}
```

---

## Estimated Training Numbers

On Mac Mini (M1/M2, 8 cores):

| Config | Games/Gen | Total Games | Est. Time |
|--------|-----------|-------------|-----------|
| Default (50 pop, 20 games/pair) | ~24,500 | 2.4M @ 100 gen | ~3-4 hours |
| Weekend (100 pop, 50 games/pair) | ~247,500 | 12.4M @ 50 gen | ~12-15 hours |
| Aggressive (100 pop, 50 games/pair) | ~247,500 | 124M @ 500 gen | ~5 days |

Start with the weekend config—should complete in under a day and give you a solid AI.

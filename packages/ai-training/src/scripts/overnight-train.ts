#!/usr/bin/env node

/**
 * Overnight AI Training Script
 *
 * Runs evolutionary training that automatically improves the AI weights
 * through multiple generations. Designed to run overnight and produce
 * significantly improved weights by morning.
 *
 * Features:
 * - Genetic/evolutionary algorithm for weight optimization
 * - Automatic checkpoint saving every N generations
 * - Resume from checkpoints if interrupted
 * - Detailed progress logging
 * - Final report generation
 */

import { Command } from 'commander'
import { initializeGame, type GameState } from '@russian-bank/game-engine'
import { computeAITurn, DEFAULT_WEIGHTS, DEFAULT_AI_CONFIG, type ScoreWeights, type AIConfig } from '../index.js'
import * as fs from 'fs'
import * as path from 'path'

// ============================================================================
// Types
// ============================================================================

interface Individual {
  weights: ScoreWeights
  fitness: number
  wins: number
  losses: number
  draws: number
  gamesPlayed: number
}

interface Generation {
  number: number
  population: Individual[]
  bestFitness: number
  avgFitness: number
  timestamp: number
}

interface Checkpoint {
  version: number
  config: TrainingConfig
  currentGeneration: number
  bestIndividual: Individual
  allTimeBest: Individual
  population: Individual[]
  generationHistory: GenerationSummary[]
  startTime: number
  totalGamesPlayed: number
}

interface GenerationSummary {
  number: number
  bestFitness: number
  avgFitness: number
  bestWeightsSnapshot: Partial<ScoreWeights>
}

interface TrainingConfig {
  populationSize: number
  gamesPerEvaluation: number
  generations: number
  mutationRate: number
  mutationStrength: number
  eliteCount: number
  tournamentSize: number
  checkpointInterval: number
  maxTurnsPerGame: number
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  populationSize: 20,
  gamesPerEvaluation: 50,
  generations: 100,
  mutationRate: 0.3,
  mutationStrength: 0.25,
  eliteCount: 2,
  tournamentSize: 3,
  checkpointInterval: 5,
  maxTurnsPerGame: 1000,
}

// Weight bounds to prevent extreme values
const WEIGHT_BOUNDS: Record<keyof ScoreWeights, { min: number; max: number }> = {
  TO_FOUNDATION: { min: 10, max: 200 },
  ATTACK_RESERVE: { min: 0, max: 150 },
  ATTACK_WASTE: { min: 0, max: 100 },
  FROM_RESERVE: { min: 10, max: 150 },
  FROM_WASTE: { min: 5, max: 100 },
  FROM_TABLEAU: { min: 0, max: 50 },
  TO_OWN_TABLEAU: { min: 0, max: 50 },
  TO_OPPONENT_TABLEAU: { min: 0, max: 50 },
  EMPTIES_RESERVE: { min: 50, max: 500 },
  CREATES_EMPTY_TABLEAU: { min: -100, max: 0 },
  PLAYS_ACE: { min: 0, max: 50 },
  PLAYS_TWO: { min: 0, max: 50 },
  POINTLESS_TABLEAU_SHUFFLE: { min: -500, max: 0 },
  TABLEAU_MOVE_NO_BENEFIT: { min: -200, max: 0 },
  CREATES_USEFUL_EMPTY: { min: 0, max: 100 },
}

// ============================================================================
// Utility Functions
// ============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function getCheckpointPath(outputDir: string): string {
  return path.join(outputDir, 'checkpoint.json')
}

function getReportPath(outputDir: string): string {
  return path.join(outputDir, 'training-report.md')
}

function getBestWeightsPath(outputDir: string): string {
  return path.join(outputDir, 'best-weights.json')
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString().replace('T', ' ').slice(0, 19)
}

// ============================================================================
// Genetic Algorithm Functions
// ============================================================================

/**
 * Creates a random individual with weights near the defaults
 */
function createRandomIndividual(baseWeights: ScoreWeights): Individual {
  const weights = { ...baseWeights }

  for (const key of Object.keys(weights) as (keyof ScoreWeights)[]) {
    const bounds = WEIGHT_BOUNDS[key]
    // Random variation of ±30% from base
    const variation = 0.7 + Math.random() * 0.6
    weights[key] = clamp(
      Math.round(baseWeights[key] * variation),
      bounds.min,
      bounds.max
    )
  }

  return {
    weights,
    fitness: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    gamesPlayed: 0,
  }
}

/**
 * Creates initial population
 */
function initializePopulation(size: number, baseWeights: ScoreWeights): Individual[] {
  const population: Individual[] = []

  // Always include the baseline as first individual
  population.push({
    weights: { ...baseWeights },
    fitness: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    gamesPlayed: 0,
  })

  // Fill rest with random variations
  for (let i = 1; i < size; i++) {
    population.push(createRandomIndividual(baseWeights))
  }

  return population
}

/**
 * Mutates weights with given rate and strength
 */
function mutate(weights: ScoreWeights, rate: number, strength: number): ScoreWeights {
  const mutated = { ...weights }

  for (const key of Object.keys(mutated) as (keyof ScoreWeights)[]) {
    if (Math.random() < rate) {
      const bounds = WEIGHT_BOUNDS[key]
      const range = bounds.max - bounds.min
      const delta = (Math.random() * 2 - 1) * range * strength
      mutated[key] = clamp(
        Math.round(mutated[key] + delta),
        bounds.min,
        bounds.max
      )
    }
  }

  return mutated
}

/**
 * Crossover two parents to create a child
 */
function crossover(parent1: ScoreWeights, parent2: ScoreWeights): ScoreWeights {
  const child: ScoreWeights = { ...parent1 }

  for (const key of Object.keys(child) as (keyof ScoreWeights)[]) {
    // 50% chance to take from each parent, or average
    const rand = Math.random()
    if (rand < 0.4) {
      child[key] = parent1[key]
    } else if (rand < 0.8) {
      child[key] = parent2[key]
    } else {
      // Blend
      child[key] = Math.round((parent1[key] + parent2[key]) / 2)
    }
  }

  return child
}

/**
 * Tournament selection - pick best from random subset
 */
function tournamentSelect(population: Individual[], tournamentSize: number): Individual {
  let best: Individual | null = null

  for (let i = 0; i < tournamentSize; i++) {
    const candidate = population[Math.floor(Math.random() * population.length)]!
    if (!best || candidate.fitness > best.fitness) {
      best = candidate
    }
  }

  return best!
}

// ============================================================================
// Game Simulation
// ============================================================================

function getFoundationCount(state: GameState): number {
  return state.foundations.reduce((sum, pile) => sum + pile.length, 0)
}

/**
 * Plays a single game between two weight configurations
 */
function playGame(
  weights1: ScoreWeights,
  weights2: ScoreWeights,
  seed: number,
  maxTurns: number
): { winner: 'player1' | 'player2' | 'draw'; moves: number } {
  let state = initializeGame(seed)
  let turnCount = 0

  let lastFoundationCount = 0
  let movesSinceProgress = 0
  const STAGNATION_THRESHOLD = 50
  const recentMoves: string[] = []

  while (!state.winner && state.turnPhase !== 'ended' && turnCount < maxTurns) {
    const weights = state.currentTurn === 'player1' ? weights1 : weights2

    const stagnationLevel = Math.min(movesSinceProgress / STAGNATION_THRESHOLD, 1)
    const dynamicConfig: AIConfig = {
      ...DEFAULT_AI_CONFIG,
      explorationRate: DEFAULT_AI_CONFIG.explorationRate + (0.45 * stagnationLevel),
      shufflePenalty: DEFAULT_AI_CONFIG.shufflePenalty * (1 + stagnationLevel * 2),
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

/**
 * Evaluates an individual by playing games against the baseline
 */
function evaluateIndividual(
  individual: Individual,
  baseline: ScoreWeights,
  gamesCount: number,
  maxTurns: number,
  seeds: number[]
): void {
  individual.wins = 0
  individual.losses = 0
  individual.draws = 0
  individual.gamesPlayed = gamesCount

  for (let i = 0; i < gamesCount; i++) {
    // Play as both player1 and player2 for fairness
    const seed = seeds[i % seeds.length]!

    // Game 1: Individual as player1
    const result1 = playGame(individual.weights, baseline, seed, maxTurns)
    if (result1.winner === 'player1') individual.wins++
    else if (result1.winner === 'player2') individual.losses++
    else individual.draws++

    // Game 2: Individual as player2 (with different seed)
    const result2 = playGame(baseline, individual.weights, seed + 1000000, maxTurns)
    if (result2.winner === 'player2') individual.wins++
    else if (result2.winner === 'player1') individual.losses++
    else individual.draws++
  }

  // Fitness is win rate
  const totalGames = individual.wins + individual.losses + individual.draws
  individual.fitness = totalGames > 0 ? individual.wins / totalGames : 0
}

// ============================================================================
// Checkpoint Management
// ============================================================================

function saveCheckpoint(checkpoint: Checkpoint, outputDir: string): void {
  const checkpointPath = getCheckpointPath(outputDir)
  fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2))
}

function loadCheckpoint(outputDir: string): Checkpoint | null {
  const checkpointPath = getCheckpointPath(outputDir)
  if (fs.existsSync(checkpointPath)) {
    const data = fs.readFileSync(checkpointPath, 'utf-8')
    return JSON.parse(data) as Checkpoint
  }
  return null
}

function saveBestWeights(weights: ScoreWeights, fitness: number, outputDir: string): void {
  const weightsPath = getBestWeightsPath(outputDir)
  const data = {
    timestamp: new Date().toISOString(),
    fitness: fitness,
    winRate: `${(fitness * 100).toFixed(1)}%`,
    weights: weights,
  }
  fs.writeFileSync(weightsPath, JSON.stringify(data, null, 2))
}

// ============================================================================
// Report Generation
// ============================================================================

function generateReport(checkpoint: Checkpoint, outputDir: string): void {
  const reportPath = getReportPath(outputDir)
  const duration = Date.now() - checkpoint.startTime

  const lines: string[] = [
    '# Overnight AI Training Report',
    '',
    `**Generated:** ${formatTimestamp(Date.now())}`,
    `**Training Duration:** ${formatDuration(duration)}`,
    `**Total Games Played:** ${checkpoint.totalGamesPlayed.toLocaleString()}`,
    `**Generations Completed:** ${checkpoint.currentGeneration}`,
    '',
    '## Best Configuration',
    '',
    `**Win Rate:** ${(checkpoint.allTimeBest.fitness * 100).toFixed(1)}%`,
    `**Record:** ${checkpoint.allTimeBest.wins}W / ${checkpoint.allTimeBest.losses}L / ${checkpoint.allTimeBest.draws}D`,
    '',
    '### Optimized Weights',
    '',
    '```typescript',
    'const OVERNIGHT_OPTIMIZED_WEIGHTS: ScoreWeights = {',
  ]

  for (const [key, value] of Object.entries(checkpoint.allTimeBest.weights)) {
    const defaultValue = DEFAULT_WEIGHTS[key as keyof ScoreWeights]
    const diff = value !== defaultValue ? ` // was ${defaultValue}` : ''
    lines.push(`  ${key}: ${value},${diff}`)
  }

  lines.push('}')
  lines.push('```')
  lines.push('')
  lines.push('## Training Progress')
  lines.push('')
  lines.push('| Generation | Best Win Rate | Avg Win Rate | Notable Changes |')
  lines.push('|------------|---------------|--------------|-----------------|')

  for (const gen of checkpoint.generationHistory) {
    const changes = Object.entries(gen.bestWeightsSnapshot)
      .filter(([k, v]) => v !== DEFAULT_WEIGHTS[k as keyof ScoreWeights])
      .slice(0, 3)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ') || 'baseline'

    lines.push(
      `| ${gen.number} | ${(gen.bestFitness * 100).toFixed(1)}% | ${(gen.avgFitness * 100).toFixed(1)}% | ${changes} |`
    )
  }

  lines.push('')
  lines.push('## Weight Evolution')
  lines.push('')
  lines.push('Key weight changes from baseline:')
  lines.push('')

  const bestWeights = checkpoint.allTimeBest.weights
  const significantChanges: string[] = []

  for (const key of Object.keys(DEFAULT_WEIGHTS) as (keyof ScoreWeights)[]) {
    const original = DEFAULT_WEIGHTS[key]
    const optimized = bestWeights[key]
    const percentChange = ((optimized - original) / Math.abs(original || 1)) * 100

    if (Math.abs(percentChange) >= 10) {
      const direction = percentChange > 0 ? 'increased' : 'decreased'
      significantChanges.push(
        `- **${key}**: ${original} -> ${optimized} (${direction} ${Math.abs(percentChange).toFixed(0)}%)`
      )
    }
  }

  if (significantChanges.length > 0) {
    lines.push(...significantChanges)
  } else {
    lines.push('- No significant changes (all within 10% of baseline)')
  }

  lines.push('')
  lines.push('## Configuration Used')
  lines.push('')
  lines.push('```json')
  lines.push(JSON.stringify(checkpoint.config, null, 2))
  lines.push('```')
  lines.push('')

  fs.writeFileSync(reportPath, lines.join('\n'))
}

// ============================================================================
// Main Training Loop
// ============================================================================

async function runOvernightTraining(config: TrainingConfig, outputDir: string, verbose: boolean): Promise<void> {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Try to resume from checkpoint
  let checkpoint = loadCheckpoint(outputDir)
  let population: Individual[]
  let startGeneration: number
  let allTimeBest: Individual
  let generationHistory: GenerationSummary[]
  let startTime: number
  let totalGamesPlayed: number

  if (checkpoint && checkpoint.version === 1) {
    console.log(`Resuming from checkpoint at generation ${checkpoint.currentGeneration}`)
    population = checkpoint.population
    startGeneration = checkpoint.currentGeneration + 1
    allTimeBest = checkpoint.allTimeBest
    generationHistory = checkpoint.generationHistory
    startTime = checkpoint.startTime
    totalGamesPlayed = checkpoint.totalGamesPlayed
  } else {
    console.log('Starting fresh training run')
    population = initializePopulation(config.populationSize, DEFAULT_WEIGHTS)
    startGeneration = 1
    allTimeBest = { ...population[0]!, fitness: 0 }
    generationHistory = []
    startTime = Date.now()
    totalGamesPlayed = 0
  }

  // Pre-generate seeds for fair comparison
  const evaluationSeeds = Array.from(
    { length: config.gamesPerEvaluation },
    () => Math.floor(Math.random() * 2147483647)
  )

  console.log('')
  console.log('='.repeat(60))
  console.log('OVERNIGHT AI TRAINING')
  console.log('='.repeat(60))
  console.log('')
  console.log(`Population Size: ${config.populationSize}`)
  console.log(`Games per Evaluation: ${config.gamesPerEvaluation * 2} (${config.gamesPerEvaluation} as each side)`)
  console.log(`Generations: ${config.generations}`)
  console.log(`Mutation Rate: ${(config.mutationRate * 100).toFixed(0)}%`)
  console.log(`Output Directory: ${outputDir}`)
  console.log('')
  console.log('Press Ctrl+C to stop after current generation completes')
  console.log('')

  // Handle graceful shutdown - finish current generation before stopping
  let shouldStop = false
  let isEvaluating = false
  process.on('SIGINT', () => {
    if (shouldStop) {
      // Second Ctrl+C - force exit
      console.log('\nForce stopping...')
      process.exit(1)
    }
    shouldStop = true
    if (isEvaluating) {
      console.log('\n\n>>> Stopping after current generation completes... (press Ctrl+C again to force quit)')
    } else {
      console.log('\n>>> Stopping...')
    }
  })

  for (let gen = startGeneration; gen <= config.generations; gen++) {
    const genStart = Date.now()

    if (verbose) {
      console.log(`\n--- Generation ${gen}/${config.generations} ---`)
    }

    // Evaluate all individuals
    isEvaluating = true
    for (let i = 0; i < population.length; i++) {
      const individual = population[i]!
      evaluateIndividual(
        individual,
        DEFAULT_WEIGHTS,
        config.gamesPerEvaluation,
        config.maxTurnsPerGame,
        evaluationSeeds
      )
      totalGamesPlayed += config.gamesPerEvaluation * 2

      if (verbose) {
        const stopIndicator = shouldStop ? ' [STOPPING AFTER THIS GEN]' : ''
        process.stdout.write(`  Evaluating ${i + 1}/${population.length}: ${(individual.fitness * 100).toFixed(1)}% win rate${stopIndicator}\r`)
      }
    }
    isEvaluating = false

    // Sort by fitness
    population.sort((a, b) => b.fitness - a.fitness)

    const bestThisGen = population[0]!
    const avgFitness = population.reduce((sum, ind) => sum + ind.fitness, 0) / population.length

    // Update all-time best
    if (bestThisGen.fitness > allTimeBest.fitness) {
      allTimeBest = {
        ...bestThisGen,
        weights: { ...bestThisGen.weights },
      }
      saveBestWeights(allTimeBest.weights, allTimeBest.fitness, outputDir)
      if (verbose) {
        console.log(`\n  NEW BEST: ${(allTimeBest.fitness * 100).toFixed(1)}% win rate!`)
      }
    }

    // Record generation summary
    const changedWeights: Partial<ScoreWeights> = {}
    for (const key of Object.keys(bestThisGen.weights) as (keyof ScoreWeights)[]) {
      if (bestThisGen.weights[key] !== DEFAULT_WEIGHTS[key]) {
        changedWeights[key] = bestThisGen.weights[key]
      }
    }

    generationHistory.push({
      number: gen,
      bestFitness: bestThisGen.fitness,
      avgFitness,
      bestWeightsSnapshot: changedWeights,
    })

    const genDuration = Date.now() - genStart
    const eta = (config.generations - gen) * genDuration

    console.log(
      `Gen ${gen}: Best=${(bestThisGen.fitness * 100).toFixed(1)}%, ` +
      `Avg=${(avgFitness * 100).toFixed(1)}%, ` +
      `AllTime=${(allTimeBest.fitness * 100).toFixed(1)}%, ` +
      `Time=${formatDuration(genDuration)}, ` +
      `ETA=${formatDuration(eta)}`
    )

    // Save checkpoint periodically or when stopping
    if (gen % config.checkpointInterval === 0 || gen === config.generations || shouldStop) {
      const currentCheckpoint: Checkpoint = {
        version: 1,
        config,
        currentGeneration: gen,
        bestIndividual: bestThisGen,
        allTimeBest,
        population,
        generationHistory,
        startTime,
        totalGamesPlayed,
      }
      saveCheckpoint(currentCheckpoint, outputDir)

      if (verbose) {
        console.log(`  Checkpoint saved`)
      }
    }

    // Stop if requested (after completing the generation)
    if (shouldStop) {
      console.log(`\nStopping after generation ${gen} (user requested)`)
      break
    }

    // Create next generation (unless this is the last)
    if (gen < config.generations) {
      const nextPopulation: Individual[] = []

      // Elitism: keep top performers
      for (let i = 0; i < config.eliteCount && i < population.length; i++) {
        nextPopulation.push({
          ...population[i]!,
          weights: { ...population[i]!.weights },
          fitness: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          gamesPlayed: 0,
        })
      }

      // Fill rest with offspring
      while (nextPopulation.length < config.populationSize) {
        const parent1 = tournamentSelect(population, config.tournamentSize)
        const parent2 = tournamentSelect(population, config.tournamentSize)

        let childWeights = crossover(parent1.weights, parent2.weights)
        childWeights = mutate(childWeights, config.mutationRate, config.mutationStrength)

        nextPopulation.push({
          weights: childWeights,
          fitness: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          gamesPlayed: 0,
        })
      }

      population = nextPopulation
    }
  }

  // Final checkpoint
  const lastCompletedGen = generationHistory.length > 0
    ? generationHistory[generationHistory.length - 1]!.number
    : 0
  const finalCheckpoint: Checkpoint = {
    version: 1,
    config,
    currentGeneration: lastCompletedGen,
    bestIndividual: population[0]!,
    allTimeBest,
    population,
    generationHistory,
    startTime,
    totalGamesPlayed,
  }
  saveCheckpoint(finalCheckpoint, outputDir)

  // Generate report
  generateReport(finalCheckpoint, outputDir)

  console.log('')
  console.log('='.repeat(60))
  console.log('TRAINING COMPLETE')
  console.log('='.repeat(60))
  console.log('')
  console.log(`Total Duration: ${formatDuration(Date.now() - startTime)}`)
  console.log(`Total Games: ${totalGamesPlayed.toLocaleString()}`)
  console.log(`Best Win Rate: ${(allTimeBest.fitness * 100).toFixed(1)}%`)
  console.log('')
  console.log(`Results saved to: ${outputDir}`)
  console.log(`  - ${getBestWeightsPath(outputDir)}`)
  console.log(`  - ${getReportPath(outputDir)}`)
  console.log(`  - ${getCheckpointPath(outputDir)}`)
  console.log('')
  console.log('To use the optimized weights, copy them from best-weights.json')
  console.log('or see the training-report.md for the TypeScript code.')
}

// ============================================================================
// CLI
// ============================================================================

const program = new Command()

program
  .name('overnight-train')
  .description('Run overnight evolutionary AI training')
  .option('-g, --generations <number>', 'Number of generations', '100')
  .option('-p, --population <number>', 'Population size', '20')
  .option('-e, --evaluations <number>', 'Games per evaluation (doubled for fairness)', '50')
  .option('-m, --mutation <number>', 'Mutation rate (0-1)', '0.3')
  .option('-s, --strength <number>', 'Mutation strength (0-1)', '0.25')
  .option('-c, --checkpoint <number>', 'Checkpoint interval (generations)', '5')
  .option('-o, --output <dir>', 'Output directory', './training-output')
  .option('-v, --verbose', 'Verbose output', false)
  .option('--quick', 'Quick test run (10 gens, 10 pop, 10 games)', false)
  .option('--overnight', 'Full overnight run (200 gens, 30 pop, 100 games)', false)
  .action((options) => {
    let config = { ...DEFAULT_TRAINING_CONFIG }

    if (options.quick) {
      config = {
        ...config,
        generations: 10,
        populationSize: 10,
        gamesPerEvaluation: 10,
        checkpointInterval: 2,
      }
      console.log('Using QUICK test configuration')
    } else if (options.overnight) {
      config = {
        ...config,
        generations: 200,
        populationSize: 30,
        gamesPerEvaluation: 100,
        checkpointInterval: 10,
      }
      console.log('Using OVERNIGHT configuration (this will take several hours)')
    } else {
      config.generations = parseInt(options.generations, 10)
      config.populationSize = parseInt(options.population, 10)
      config.gamesPerEvaluation = parseInt(options.evaluations, 10)
      config.mutationRate = parseFloat(options.mutation)
      config.mutationStrength = parseFloat(options.strength)
      config.checkpointInterval = parseInt(options.checkpoint, 10)
    }

    const outputDir = path.resolve(options.output)

    runOvernightTraining(config, outputDir, options.verbose).catch(err => {
      console.error('Training failed:', err)
      process.exit(1)
    })
  })

program.parse()

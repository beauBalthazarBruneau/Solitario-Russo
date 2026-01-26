#!/usr/bin/env node

import { Command } from 'commander'
import { runGridSearch, DEFAULT_WEIGHTS, type ScoreWeights } from '../index.js'

const program = new Command()

program
  .name('train')
  .description('Train AI weights using grid search')
  .option('-g, --games <number>', 'Games per configuration', '100')
  .option('-v, --verbose', 'Show detailed progress', false)
  .option('--vary <weights>', 'Weights to vary (comma-separated)', 'TO_FOUNDATION,ATTACK_RESERVE,EMPTIES_RESERVE')
  .option('--range <range>', 'Range around default value to test (e.g., "0.5,1,1.5" as multipliers)', '0.5,1,1.5,2')
  .action((options) => {
    const gamesPerConfig = parseInt(options.games, 10)
    const verbose = options.verbose
    const weightsToVary = options.vary.split(',').map((w: string) => w.trim()) as (keyof ScoreWeights)[]
    const rangeMultipliers = options.range.split(',').map((r: string) => parseFloat(r.trim()))

    console.log('=== Solitario Russo AI Training ===')
    console.log('')
    console.log('Configuration:')
    console.log(`  Games per config: ${gamesPerConfig}`)
    console.log(`  Weights to vary: ${weightsToVary.join(', ')}`)
    console.log(`  Range multipliers: ${rangeMultipliers.join(', ')}`)
    console.log('')

    // Build weight variations
    const weightVariations: Partial<Record<keyof ScoreWeights, number[]>> = {}

    for (const weight of weightsToVary) {
      if (!(weight in DEFAULT_WEIGHTS)) {
        console.error(`Unknown weight: ${weight}`)
        console.log('Available weights:', Object.keys(DEFAULT_WEIGHTS).join(', '))
        process.exit(1)
      }

      const defaultValue = DEFAULT_WEIGHTS[weight]
      weightVariations[weight] = rangeMultipliers.map((m: number) => Math.round(defaultValue * m))
    }

    console.log('Weight variations:')
    for (const [key, values] of Object.entries(weightVariations)) {
      console.log(`  ${key}: ${values?.join(', ')} (default: ${DEFAULT_WEIGHTS[key as keyof ScoreWeights]})`)
    }
    console.log('')

    const startTime = Date.now()

    const result = runGridSearch({
      gamesPerConfig,
      weightVariations,
      verbose,
    })

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log('')
    console.log('=== Training Complete ===')
    console.log(`Total games played: ${result.totalGamesPlayed}`)
    console.log(`Time elapsed: ${elapsed}s`)
    console.log('')
    console.log('=== Top 5 Configurations ===')

    const sortedConfigs = [...result.configs].sort((a, b) => b.winRate - a.winRate)

    for (let i = 0; i < Math.min(5, sortedConfigs.length); i++) {
      const config = sortedConfigs[i]!
      const changedWeights = Object.entries(config.weights)
        .filter(([key, value]) => value !== DEFAULT_WEIGHTS[key as keyof ScoreWeights])
        .map(([key, value]) => `${key}=${value}`)
        .join(', ') || 'baseline'

      console.log(`${i + 1}. ${(config.winRate * 100).toFixed(1)}% win rate - ${changedWeights}`)
      console.log(`   Wins: ${config.wins}, Losses: ${config.losses}, Draws: ${config.draws}`)
    }

    console.log('')
    console.log('=== Best Configuration ===')
    console.log('Weights:')
    for (const [key, value] of Object.entries(result.bestConfig.weights)) {
      const defaultValue = DEFAULT_WEIGHTS[key as keyof ScoreWeights]
      const diff = value !== defaultValue ? ` (default: ${defaultValue})` : ''
      console.log(`  ${key}: ${value}${diff}`)
    }

    console.log('')
    console.log('Copy this to use the optimized weights:')
    console.log('')
    console.log('const OPTIMIZED_WEIGHTS: ScoreWeights = {')
    for (const [key, value] of Object.entries(result.bestConfig.weights)) {
      console.log(`  ${key}: ${value},`)
    }
    console.log('}')
  })

program.parse()

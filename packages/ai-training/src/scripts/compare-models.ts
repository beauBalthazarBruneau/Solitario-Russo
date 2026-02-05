#!/usr/bin/env node

/**
 * Script to compare two neural network models by having them play against each other.
 * Run with: npx tsx src/scripts/compare-models.ts
 */

import { Command } from 'commander'
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-node'
import * as path from 'path'
import { initializeGame } from '@russian-bank/game-engine'
import { computeNeuralTurn } from '../neural/inference.js'

const program = new Command()

program
  .name('compare-models')
  .description('Compare two neural network models by playing them against each other')
  .option('-n, --num-games <number>', 'Number of games to play', '100')
  .option('--model1 <path>', 'Path to first model (old)', '../web-app/public/models/value-network')
  .option('--model2 <path>', 'Path to second model (new)', './models/value-network')
  .option('-v, --verbose', 'Show game-by-game results', false)
  .action(async (options) => {
    const numGames = parseInt(options.numGames, 10)
    const model1Path = path.resolve(options.model1)
    const model2Path = path.resolve(options.model2)
    const verbose = options.verbose

    console.log('=== Neural Network Model Comparison ===')
    console.log('')
    console.log('Configuration:')
    console.log(`  Number of games: ${numGames}`)
    console.log(`  Model 1 (Old): ${model1Path}`)
    console.log(`  Model 2 (New): ${model2Path}`)
    console.log('')

    // Load both models
    console.log('Loading models...')
    const model1 = await tf.loadLayersModel(`file://${model1Path}/model.json`)
    console.log('  Model 1 (Old) loaded')
    const model2 = await tf.loadLayersModel(`file://${model2Path}/model.json`)
    console.log('  Model 2 (New) loaded')
    console.log('')

    // Track results
    let model1WinsAsP1 = 0
    let model2WinsAsP1 = 0
    let model1WinsAsP2 = 0
    let model2WinsAsP2 = 0

    const startTime = Date.now()

    console.log('Playing games...')
    console.log('')

    for (let i = 0; i < numGames; i++) {
      // Alternate who plays as player1
      const newModelIsPlayer1 = i % 2 === 0

      const result = playGame(
        newModelIsPlayer1 ? model2 : model1,
        newModelIsPlayer1 ? model1 : model2
      )

      if (result.winner === 'player1') {
        if (newModelIsPlayer1) {
          model2WinsAsP1++
        } else {
          model1WinsAsP1++
        }
      } else if (result.winner === 'player2') {
        if (newModelIsPlayer1) {
          model1WinsAsP2++
        } else {
          model2WinsAsP2++
        }
      }

      if (verbose) {
        const newModelWon = (newModelIsPlayer1 && result.winner === 'player1') ||
          (!newModelIsPlayer1 && result.winner === 'player2')
        console.log(`  Game ${i + 1}: ${newModelWon ? 'NEW wins' : 'OLD wins'} (${result.turns} turns)`)
      }

      // Progress update
      if ((i + 1) % 10 === 0 || i === numGames - 1) {
        const elapsed = (Date.now() - startTime) / 1000
        const rate = (i + 1) / elapsed
        process.stdout.write(`\r  Progress: ${i + 1}/${numGames} games | Rate: ${rate.toFixed(1)} games/s  `)
      }
    }

    console.log('')
    console.log('')

    // Calculate totals
    const model1TotalWins = model1WinsAsP1 + model1WinsAsP2
    const model2TotalWins = model2WinsAsP1 + model2WinsAsP2
    const totalGames = numGames

    const elapsed = (Date.now() - startTime) / 1000

    console.log('=== Results ===')
    console.log('')
    console.log('Overall:')
    console.log(`  Old Model: ${model1TotalWins} wins (${((model1TotalWins / totalGames) * 100).toFixed(1)}%)`)
    console.log(`  New Model: ${model2TotalWins} wins (${((model2TotalWins / totalGames) * 100).toFixed(1)}%)`)
    console.log('')
    console.log('By position:')
    console.log(`  Old Model as Player 1: ${model1WinsAsP1} wins / ${numGames / 2} games`)
    console.log(`  Old Model as Player 2: ${model1WinsAsP2} wins / ${numGames / 2} games`)
    console.log(`  New Model as Player 1: ${model2WinsAsP1} wins / ${numGames / 2} games`)
    console.log(`  New Model as Player 2: ${model2WinsAsP2} wins / ${numGames / 2} games`)
    console.log('')
    console.log(`Time elapsed: ${elapsed.toFixed(1)}s`)
    console.log('')

    if (model2TotalWins > model1TotalWins) {
      const improvement = ((model2TotalWins - model1TotalWins) / model1TotalWins * 100).toFixed(1)
      console.log(`✓ New model is BETTER (+${improvement}% more wins)`)
    } else if (model1TotalWins > model2TotalWins) {
      const decline = ((model1TotalWins - model2TotalWins) / model2TotalWins * 100).toFixed(1)
      console.log(`✗ New model is WORSE (-${decline}% fewer wins)`)
    } else {
      console.log('= Models are EQUAL')
    }
  })

interface GameResult {
  winner: 'player1' | 'player2' | null
  turns: number
}

function playGame(player1Model: tf.LayersModel, player2Model: tf.LayersModel): GameResult {
  let state = initializeGame()
  let turns = 0
  const MAX_TURNS = 500

  while (!state.winner && turns < MAX_TURNS) {
    const model = state.currentTurn === 'player1' ? player1Model : player2Model
    const steps = computeNeuralTurn(model, state)

    if (steps.length > 0) {
      state = steps[steps.length - 1]!.state
    } else {
      // No moves possible, game should end
      break
    }

    turns++
  }

  return {
    winner: state.winner,
    turns,
  }
}

program.parse()

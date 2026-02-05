#!/usr/bin/env node

/**
 * Script to generate training data via neural network self-play.
 * Uses a trained model to play against itself, generating higher-quality training data.
 * Run with: npx tsx src/scripts/generate-data-neural.ts
 */

import { Command } from 'commander'
import * as fs from 'fs'
import * as path from 'path'
import * as tf from '@tensorflow/tfjs-node'
import { initializeGame, type GameState, type Player } from '@russian-bank/game-engine'
import { computeNeuralTurn } from '../neural/inference.js'
import { encodeGameState, STATE_ENCODING_SIZE } from '../neural/state-encoder.js'
import {
  shuffleExamples,
  serializeExamplesBinary,
  type TrainingExample,
} from '../neural/training-data.js'

const program = new Command()

program
  .name('generate-data-neural')
  .description('Generate training data via neural network self-play')
  .option('-n, --num-games <number>', 'Number of games to play', '100')
  .option('-m, --model <path>', 'Path to neural network model', 'models/edith')
  .option('-o, --output <path>', 'Output file path', 'training-data-neural.bin')
  .option('-v, --verbose', 'Show detailed progress', false)
  .action(async (options) => {
    const numGames = parseInt(options.numGames, 10)
    const modelPath = path.resolve(options.model)
    const outputPath = path.resolve(options.output)
    const verbose = options.verbose

    console.log('=== Neural Network Self-Play Training Data Generation ===')
    console.log('')
    console.log('Configuration:')
    console.log(`  Number of games: ${numGames}`)
    console.log(`  Model: ${modelPath}`)
    console.log(`  Output file: ${outputPath}`)
    console.log('')

    // Load the model
    console.log('Loading model...')
    const model = await tf.loadLayersModel(`file://${modelPath}/model.json`)
    console.log('  Model loaded')
    console.log('')

    const startTime = Date.now()
    let lastProgressTime = startTime
    const allExamples: TrainingExample[] = []

    console.log('Playing self-play games...')

    for (let gameNum = 0; gameNum < numGames; gameNum++) {
      const { examples, winner } = playNeuralSelfPlayGame(model)
      allExamples.push(...examples)

      // Progress update
      const now = Date.now()
      if (now - lastProgressTime >= 2000 || gameNum === numGames - 1) {
        const elapsed = (now - startTime) / 1000
        const rate = (gameNum + 1) / elapsed
        const remaining = numGames - gameNum - 1
        const eta = remaining / rate

        process.stdout.write(
          `\r  Games: ${gameNum + 1}/${numGames} (${(((gameNum + 1) / numGames) * 100).toFixed(1)}%)` +
            ` | Rate: ${rate.toFixed(1)} games/s` +
            ` | ETA: ${formatTime(eta)}  `
        )
        lastProgressTime = now
      }

      if (verbose && (gameNum + 1) % 10 === 0) {
        console.log(`  Game ${gameNum + 1}: ${winner ?? 'draw'} won, ${examples.length} states`)
      }
    }

    console.log('')
    console.log('')

    // Shuffle examples
    console.log('Shuffling examples...')
    shuffleExamples(allExamples)

    // Serialize and save
    console.log('Serializing data (binary format)...')
    console.log('Saving to disk...')
    const binaryData = serializeExamplesBinary(allExamples)
    fs.writeFileSync(outputPath, binaryData)

    const elapsed = (Date.now() - startTime) / 1000
    const fileSize = fs.statSync(outputPath).size

    // Count win/loss distribution
    const wins = allExamples.filter(e => e.label === 1).length
    const losses = allExamples.filter(e => e.label === 0).length

    console.log('')
    console.log('=== Generation Complete ===')
    console.log(`  Total examples: ${allExamples.length}`)
    console.log(`  Win labels: ${wins} (${((wins / allExamples.length) * 100).toFixed(1)}%)`)
    console.log(`  Loss labels: ${losses} (${((losses / allExamples.length) * 100).toFixed(1)}%)`)
    console.log(`  File size: ${formatBytes(fileSize)}`)
    console.log(`  Time elapsed: ${elapsed.toFixed(1)}s`)
    console.log('')
    console.log(`Data saved to: ${outputPath}`)
  })

interface GameRecord {
  examples: TrainingExample[]
  winner: Player | null
}

/**
 * Plays a single game using neural network self-play.
 * Records all intermediate states for training data.
 */
function playNeuralSelfPlayGame(model: tf.LayersModel): GameRecord {
  let state = initializeGame()
  const stateRecords: { state: GameState; player: Player }[] = []

  // Record initial state from both perspectives
  stateRecords.push({ state, player: 'player1' })
  stateRecords.push({ state, player: 'player2' })

  const MAX_TURNS = 1000

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    if (state.winner || state.turnPhase === 'ended') {
      break
    }

    const currentPlayer = state.currentTurn

    // Play neural network turn
    const steps = computeNeuralTurn(model, state)

    if (steps.length === 0) {
      break
    }

    // Record states from current player's perspective
    for (const step of steps) {
      stateRecords.push({ state: step.state, player: currentPlayer })
    }

    // Get final state
    const lastStep = steps[steps.length - 1]
    if (lastStep) {
      state = lastStep.state
    }
  }

  const winner = state.winner

  // Convert to training examples with labels
  const examples: TrainingExample[] = stateRecords.map(record => {
    const features = encodeGameState(record.state, record.player)
    let label: number

    if (winner === null) {
      // Draw - use 0.5 as label
      label = 0.5
    } else if (winner === record.player) {
      label = 1
    } else {
      label = 0
    }

    return {
      features,
      player: record.player,
      label,
    }
  })

  return { examples, winner }
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.ceil(seconds % 60)
  return `${mins}m ${secs}s`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

program.parse()

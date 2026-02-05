#!/usr/bin/env node

/**
 * Script to generate training data for the neural network via self-play.
 * Run with: npx tsx src/scripts/generate-data.ts
 */

import { Command } from 'commander'
import * as fs from 'fs'
import * as path from 'path'
import { DEFAULT_WEIGHTS, DEFAULT_AI_CONFIG } from '../heuristic-ai.js'
import {
  generateTrainingData,
  shuffleExamples,
  serializeExamples,
  serializeExamplesBinary,
  deserializeExamplesBinary,
  type TrainingExample,
} from '../neural/training-data.js'

const program = new Command()

program
  .name('generate-data')
  .description('Generate neural network training data via self-play')
  .option('-n, --num-games <number>', 'Number of games to play', '1000')
  .option('-o, --output <path>', 'Output file path', 'training-data.json')
  .option('-v, --verbose', 'Show detailed progress', false)
  .option('--append', 'Append to existing data file', false)
  .action(async (options) => {
    const numGames = parseInt(options.numGames, 10)
    const outputPath = path.resolve(options.output)
    const verbose = options.verbose
    const append = options.append

    console.log('=== Neural Network Training Data Generation ===')
    console.log('')
    console.log('Configuration:')
    console.log(`  Number of games: ${numGames}`)
    console.log(`  Output file: ${outputPath}`)
    console.log(`  Append mode: ${append}`)
    console.log('')

    const startTime = Date.now()
    let lastProgressTime = startTime

    console.log('Generating training data...')

    const examples = generateTrainingData(
      numGames,
      DEFAULT_WEIGHTS,
      DEFAULT_AI_CONFIG,
      (completed, total) => {
        const now = Date.now()
        // Print progress every 2 seconds or when complete
        if (now - lastProgressTime >= 2000 || completed === total) {
          const elapsed = (now - startTime) / 1000
          const rate = completed / elapsed
          const remaining = total - completed
          const eta = remaining / rate

          process.stdout.write(
            `\r  Games: ${completed}/${total} (${((completed / total) * 100).toFixed(1)}%)` +
              ` | Rate: ${rate.toFixed(1)} games/s` +
              ` | ETA: ${formatTime(eta)}  `
          )
          lastProgressTime = now
        }

        if (verbose && completed % 100 === 0) {
          console.log(`  Completed ${completed} games`)
        }
      }
    )

    console.log('')
    console.log('')

    // Shuffle examples for better training
    console.log('Shuffling examples...')
    shuffleExamples(examples)

    // Handle append mode
    let finalExamples = examples
    if (append && fs.existsSync(outputPath)) {
      console.log('Loading existing data...')
      try {
        // Try binary format first
        if (outputPath.endsWith('.bin')) {
          const existingBuffer = fs.readFileSync(outputPath)
          const existingExamples = deserializeExamplesBinary(existingBuffer)
          finalExamples = [...existingExamples, ...examples]
        } else {
          const existingData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'))
          // Re-inflate existing examples
          const existingExamples: TrainingExample[] = []
          for (let i = 0; i < existingData.numExamples; i++) {
            const featureStart = i * existingData.featureSize
            const features = new Float32Array(
              existingData.features.slice(featureStart, featureStart + existingData.featureSize)
            )
            existingExamples.push({
              features,
              player: 'player1',
              label: existingData.labels[i],
            })
          }
          finalExamples = [...existingExamples, ...examples]
        }
        console.log(`  Combined ${finalExamples.length - examples.length} existing + ${examples.length} new = ${finalExamples.length} total`)
        shuffleExamples(finalExamples) // Re-shuffle combined data
      } catch (err) {
        console.warn('  Warning: Could not read existing file, creating new one')
      }
    }

    // Serialize and save - use binary for large datasets or .bin extension
    const useBinary = outputPath.endsWith('.bin') || finalExamples.length > 500000
    console.log(`Serializing data (${useBinary ? 'binary' : 'JSON'} format)...`)

    console.log('Saving to disk...')
    if (useBinary) {
      const binaryData = serializeExamplesBinary(finalExamples)
      const binPath = outputPath.endsWith('.bin') ? outputPath : outputPath.replace(/\.json$/, '.bin')
      fs.writeFileSync(binPath, binaryData)
    } else {
      const serialized = serializeExamples(finalExamples)
      fs.writeFileSync(outputPath, JSON.stringify(serialized))
    }

    const elapsed = (Date.now() - startTime) / 1000
    const actualPath = useBinary && !outputPath.endsWith('.bin') ? outputPath.replace(/\.json$/, '.bin') : outputPath
    const fileSize = fs.statSync(actualPath).size

    // Count win/loss distribution
    const wins = finalExamples.filter(e => e.label === 1).length
    const losses = finalExamples.filter(e => e.label === 0).length

    console.log('')
    console.log('=== Generation Complete ===')
    console.log(`  Total examples: ${finalExamples.length}`)
    console.log(`  Win labels: ${wins} (${((wins / finalExamples.length) * 100).toFixed(1)}%)`)
    console.log(`  Loss labels: ${losses} (${((losses / finalExamples.length) * 100).toFixed(1)}%)`)
    console.log(`  File size: ${formatBytes(fileSize)}`)
    console.log(`  Time elapsed: ${elapsed.toFixed(1)}s`)
    console.log('')
    console.log(`Data saved to: ${outputPath}`)
  })

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

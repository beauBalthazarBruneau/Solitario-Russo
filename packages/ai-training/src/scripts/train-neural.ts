#!/usr/bin/env node

/**
 * Script to train the neural network value model.
 * Run with: npx tsx src/scripts/train-neural.ts
 *
 * Prerequisites: Generate training data first with generate-data.ts
 */

import { Command } from 'commander'
import * as fs from 'fs'
import * as path from 'path'
import * as tf from '@tensorflow/tfjs-node'
import { createValueNetwork, compileModel, getModelInfo } from '../neural/model.js'
import { STATE_ENCODING_SIZE } from '../neural/state-encoder.js'
import type { SerializedTrainingData } from '../neural/training-data.js'

const program = new Command()

program
  .name('train-neural')
  .description('Train the neural network value model')
  .requiredOption('-d, --data <path>', 'Path to training data JSON file')
  .option('-o, --output <path>', 'Output directory for model', 'models/value-network')
  .option('-e, --epochs <number>', 'Number of training epochs', '50')
  .option('-b, --batch-size <number>', 'Batch size', '64')
  .option('-l, --learning-rate <number>', 'Learning rate', '0.001')
  .option('-v, --validation-split <number>', 'Validation split ratio', '0.2')
  .option('--patience <number>', 'Early stopping patience', '5')
  .option('--verbose', 'Show detailed progress', false)
  .action(async (options) => {
    const dataPath = path.resolve(options.data)
    const outputDir = path.resolve(options.output)
    const epochs = parseInt(options.epochs, 10)
    const batchSize = parseInt(options.batchSize, 10)
    const learningRate = parseFloat(options.learningRate)
    const validationSplit = parseFloat(options.validationSplit)
    const patience = parseInt(options.patience, 10)
    const verbose = options.verbose

    console.log('=== Neural Network Training ===')
    console.log('')
    console.log('Configuration:')
    console.log(`  Training data: ${dataPath}`)
    console.log(`  Output directory: ${outputDir}`)
    console.log(`  Epochs: ${epochs}`)
    console.log(`  Batch size: ${batchSize}`)
    console.log(`  Learning rate: ${learningRate}`)
    console.log(`  Validation split: ${validationSplit}`)
    console.log(`  Early stopping patience: ${patience}`)
    console.log('')

    // Load training data
    console.log('Loading training data...')
    if (!fs.existsSync(dataPath)) {
      console.error(`Error: Training data file not found: ${dataPath}`)
      console.log('Run generate-data.ts first to create training data.')
      process.exit(1)
    }

    const rawData = fs.readFileSync(dataPath, 'utf-8')
    const data: SerializedTrainingData = JSON.parse(rawData)

    console.log(`  Loaded ${data.numExamples} examples`)
    console.log(`  Feature size: ${data.featureSize}`)

    if (data.featureSize !== STATE_ENCODING_SIZE) {
      console.error(`Error: Feature size mismatch. Expected ${STATE_ENCODING_SIZE}, got ${data.featureSize}`)
      process.exit(1)
    }

    // Convert to tensors
    console.log('Preparing tensors...')
    const features = tf.tensor2d(data.features, [data.numExamples, data.featureSize])
    const labels = tf.tensor2d(data.labels, [data.numExamples, 1])

    // Check label distribution
    const labelSum = data.labels.reduce((a, b) => a + b, 0)
    console.log(`  Win labels: ${labelSum} (${((labelSum / data.numExamples) * 100).toFixed(1)}%)`)
    console.log(`  Loss labels: ${data.numExamples - labelSum} (${(((data.numExamples - labelSum) / data.numExamples) * 100).toFixed(1)}%)`)

    // Create model
    console.log('')
    console.log('Creating model...')
    const model = createValueNetwork()
    compileModel(model, learningRate)

    const modelInfo = getModelInfo(model)
    console.log(`  Input shape: [${modelInfo.inputShape.join(', ')}]`)
    console.log(`  Output shape: [${modelInfo.outputShape.join(', ')}]`)
    console.log(`  Total parameters: ${modelInfo.totalParams.toLocaleString()}`)

    if (verbose) {
      console.log('')
      model.summary()
    }

    // Setup callbacks
    const callbacks: tf.CustomCallbackArgs[] = []

    // Progress logging
    let bestValLoss = Infinity
    let patienceCounter = 0

    callbacks.push({
      onEpochEnd: async (epoch: number, logs: tf.Logs | undefined) => {
        const loss = logs?.loss?.toFixed(4) ?? 'N/A'
        const acc = logs?.acc ? (logs.acc * 100).toFixed(1) : 'N/A'
        const valLoss = logs?.val_loss?.toFixed(4) ?? 'N/A'
        const valAcc = logs?.val_acc ? (logs.val_acc * 100).toFixed(1) : 'N/A'

        console.log(
          `  Epoch ${epoch + 1}/${epochs}: ` +
            `loss=${loss}, acc=${acc}%, ` +
            `val_loss=${valLoss}, val_acc=${valAcc}%`
        )

        // Early stopping check
        if (logs?.val_loss !== undefined) {
          if (logs.val_loss < bestValLoss) {
            bestValLoss = logs.val_loss
            patienceCounter = 0
          } else {
            patienceCounter++
            if (patienceCounter >= patience) {
              console.log(`  Early stopping: validation loss hasn't improved for ${patience} epochs`)
              model.stopTraining = true
            }
          }
        }
      },
    })

    // Train
    console.log('')
    console.log('Training...')
    const startTime = Date.now()

    await model.fit(features, labels, {
      epochs,
      batchSize,
      validationSplit,
      shuffle: true,
      callbacks,
    })

    const trainTime = (Date.now() - startTime) / 1000

    // Cleanup tensors
    features.dispose()
    labels.dispose()

    // Save model
    console.log('')
    console.log('Saving model...')

    // Ensure output directory exists
    fs.mkdirSync(outputDir, { recursive: true })

    const savePath = `file://${outputDir}`
    await model.save(savePath)

    // Check saved files
    const savedFiles = fs.readdirSync(outputDir)
    const totalSize = savedFiles.reduce((sum, file) => {
      return sum + fs.statSync(path.join(outputDir, file)).size
    }, 0)

    console.log(`  Saved to: ${outputDir}`)
    console.log(`  Files: ${savedFiles.join(', ')}`)
    console.log(`  Total size: ${formatBytes(totalSize)}`)

    // Final summary
    console.log('')
    console.log('=== Training Complete ===')
    console.log(`  Training time: ${trainTime.toFixed(1)}s`)
    console.log(`  Best validation loss: ${bestValLoss.toFixed(4)}`)
    console.log(`  Model saved to: ${outputDir}`)
    console.log('')
    console.log('To use this model in the browser, copy the model files to:')
    console.log('  packages/web-app/public/models/value-network/')
  })

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

program.parse()

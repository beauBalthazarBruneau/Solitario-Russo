/**
 * Training data generation for neural network.
 * Generates labeled examples via self-play using the heuristic bot.
 */

import {
  initializeGame,
  type GameState,
  type Player,
} from '@russian-bank/game-engine'
import { computeAITurn, DEFAULT_WEIGHTS, DEFAULT_AI_CONFIG, type ScoreWeights, type AIConfig } from '../heuristic-ai.js'
import { encodeGameState, STATE_ENCODING_SIZE } from './state-encoder.js'

/**
 * A single training example
 */
export interface TrainingExample {
  /** Encoded state features */
  features: Float32Array
  /** Player perspective the state was encoded from */
  player: Player
  /** Game outcome: 1 = this player won, 0 = this player lost */
  label: number
}

/**
 * Collected game data before labeling
 */
interface GameRecord {
  states: { state: GameState; player: Player }[]
  winner: Player | null
}

/**
 * Plays a single game using self-play with the heuristic bot.
 * Records all intermediate states for training data.
 *
 * @param seed - Random seed for game initialization
 * @param weights - Score weights for the bot
 * @param config - AI config for the bot
 * @returns Game record with all states and the winner
 */
export function playSelfPlayGame(
  seed?: number,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
  config: AIConfig = DEFAULT_AI_CONFIG
): GameRecord {
  let state = initializeGame(seed)
  const record: GameRecord = {
    states: [],
    winner: null,
  }

  // Track recent moves for pattern detection across turns
  let recentMoves: string[] = []

  // Record initial state from both perspectives
  record.states.push({ state, player: 'player1' })
  record.states.push({ state, player: 'player2' })

  const MAX_TURNS = 1000 // Safety limit

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    if (state.winner || state.turnPhase === 'ended') {
      record.winner = state.winner
      break
    }

    // Play AI turn
    const steps = computeAITurn(state, weights, config, recentMoves)

    if (steps.length === 0) {
      // No moves possible, game is stuck
      break
    }

    // Record states at the start of each turn from current player's perspective
    const currentPlayer = state.currentTurn
    for (const step of steps) {
      // Record from current player's perspective
      record.states.push({ state: step.state, player: currentPlayer })
    }

    // Update recent moves for next turn
    recentMoves = steps
      .filter(s => s.decision.type === 'move' && s.decision.move)
      .map(s => {
        const m = s.decision.move!
        return `${m.from.type}:${m.from.owner ?? ''}:${m.from.index ?? ''}->${m.to.type}:${m.to.owner ?? ''}:${m.to.index ?? ''}`
      })
      .slice(-config.patternMemory)

    // Get final state
    const lastStep = steps[steps.length - 1]
    if (lastStep) {
      state = lastStep.state
    }
  }

  return record
}

/**
 * Converts a game record into training examples with labels.
 *
 * @param record - Game record from self-play
 * @returns Array of training examples
 */
export function recordToExamples(record: GameRecord): TrainingExample[] {
  if (!record.winner) {
    // Game had no winner (draw or stuck), skip
    return []
  }

  const examples: TrainingExample[] = []

  for (const { state, player } of record.states) {
    const features = encodeGameState(state, player)
    const label = player === record.winner ? 1 : 0

    examples.push({
      features,
      player,
      label,
    })
  }

  return examples
}

/**
 * Generates training data by playing multiple self-play games.
 *
 * @param numGames - Number of games to play
 * @param weights - Score weights for the bot
 * @param config - AI config for the bot
 * @param onProgress - Optional progress callback
 * @returns Array of training examples
 */
export function generateTrainingData(
  numGames: number,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
  config: AIConfig = DEFAULT_AI_CONFIG,
  onProgress?: (completed: number, total: number) => void
): TrainingExample[] {
  const allExamples: TrainingExample[] = []

  for (let i = 0; i < numGames; i++) {
    // Use varying seeds
    const seed = Math.floor(Math.random() * 2147483647)
    const record = playSelfPlayGame(seed, weights, config)
    const examples = recordToExamples(record)
    allExamples.push(...examples)

    if (onProgress) {
      onProgress(i + 1, numGames)
    }
  }

  return allExamples
}

/**
 * Shuffle training examples in place
 */
export function shuffleExamples(examples: TrainingExample[]): void {
  for (let i = examples.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = examples[i]!
    examples[i] = examples[j]!
    examples[j] = temp
  }
}

/**
 * Split examples into train and validation sets
 */
export function splitTrainValidation(
  examples: TrainingExample[],
  validationRatio: number = 0.2
): { train: TrainingExample[]; validation: TrainingExample[] } {
  const splitIndex = Math.floor(examples.length * (1 - validationRatio))
  return {
    train: examples.slice(0, splitIndex),
    validation: examples.slice(splitIndex),
  }
}

/**
 * Convert examples to tensors for training
 */
export function examplesToTensors(examples: TrainingExample[]): {
  features: Float32Array
  labels: Float32Array
} {
  const featureData = new Float32Array(examples.length * STATE_ENCODING_SIZE)
  const labelData = new Float32Array(examples.length)

  for (let i = 0; i < examples.length; i++) {
    const ex = examples[i]!
    featureData.set(ex.features, i * STATE_ENCODING_SIZE)
    labelData[i] = ex.label
  }

  return {
    features: featureData,
    labels: labelData,
  }
}

/**
 * Serializable format for training data
 */
export interface SerializedTrainingData {
  version: number
  featureSize: number
  numExamples: number
  features: number[] // Flattened Float32Array
  labels: number[]
}

/**
 * Serialize training examples to JSON-compatible format (for small datasets)
 */
export function serializeExamples(examples: TrainingExample[]): SerializedTrainingData {
  const { features, labels } = examplesToTensors(examples)

  // For large datasets, this will fail - use serializeExamplesBinary instead
  const featuresArray: number[] = []
  const labelsArray: number[] = []

  for (let i = 0; i < features.length; i++) {
    featuresArray.push(features[i]!)
  }
  for (let i = 0; i < labels.length; i++) {
    labelsArray.push(labels[i]!)
  }

  return {
    version: 1,
    featureSize: STATE_ENCODING_SIZE,
    numExamples: examples.length,
    features: featuresArray,
    labels: labelsArray,
  }
}

/**
 * Binary format header for training data
 */
export interface BinaryHeader {
  version: number
  featureSize: number
  numExamples: number
}

/**
 * Serialize training examples to binary format (for large datasets)
 * Format: [header: 12 bytes] [features: numExamples * featureSize * 4 bytes] [labels: numExamples * 4 bytes]
 */
export function serializeExamplesBinary(examples: TrainingExample[]): Buffer {
  const { features, labels } = examplesToTensors(examples)

  // Header: version (4 bytes) + featureSize (4 bytes) + numExamples (4 bytes)
  const headerSize = 12
  const featuresSize = features.byteLength // numExamples * featureSize * 4
  const labelsSize = labels.byteLength // numExamples * 4 (Float32Array)

  const buffer = Buffer.alloc(headerSize + featuresSize + labelsSize)

  // Write header
  buffer.writeUInt32LE(1, 0) // version
  buffer.writeUInt32LE(STATE_ENCODING_SIZE, 4) // featureSize
  buffer.writeUInt32LE(examples.length, 8) // numExamples

  // Write features
  Buffer.from(features.buffer).copy(buffer, headerSize)

  // Write labels (Float32Array)
  Buffer.from(labels.buffer).copy(buffer, headerSize + featuresSize)

  return buffer
}

/**
 * Deserialize training examples from binary format
 */
export function deserializeExamplesBinary(buffer: Buffer): TrainingExample[] {
  // Read header
  const version = buffer.readUInt32LE(0)
  if (version !== 1) {
    throw new Error(`Unsupported binary training data version: ${version}`)
  }

  const featureSize = buffer.readUInt32LE(4)
  const numExamples = buffer.readUInt32LE(8)

  const headerSize = 12
  const featuresSize = numExamples * featureSize * 4
  const labelsSize = numExamples * 4 // Float32Array

  // Read features
  const featuresBuffer = buffer.subarray(headerSize, headerSize + featuresSize)
  const features = new Float32Array(featuresBuffer.buffer, featuresBuffer.byteOffset, numExamples * featureSize)

  // Read labels (Float32Array)
  const labelsBuffer = buffer.subarray(headerSize + featuresSize, headerSize + featuresSize + labelsSize)
  const labels = new Float32Array(labelsBuffer.buffer, labelsBuffer.byteOffset, numExamples)

  // Convert to examples
  const examples: TrainingExample[] = []
  for (let i = 0; i < numExamples; i++) {
    const featureStart = i * featureSize
    examples.push({
      features: features.slice(featureStart, featureStart + featureSize),
      player: 'player1',
      label: labels[i]!,
    })
  }

  return examples
}

/**
 * Deserialize training data from JSON format
 */
export function deserializeExamples(data: SerializedTrainingData): TrainingExample[] {
  if (data.version !== 1) {
    throw new Error(`Unsupported training data version: ${data.version}`)
  }

  const examples: TrainingExample[] = []

  for (let i = 0; i < data.numExamples; i++) {
    const featureStart = i * data.featureSize
    const features = new Float32Array(data.features.slice(featureStart, featureStart + data.featureSize))

    examples.push({
      features,
      player: 'player1', // Not preserved, but not needed for training
      label: data.labels[i]!,
    })
  }

  return examples
}

/**
 * Neural network model architecture for win probability prediction.
 * Uses TensorFlow.js for browser-compatible inference.
 */

import * as tf from '@tensorflow/tfjs'
import { STATE_ENCODING_SIZE } from './state-encoder.js'

// Model architecture constants
const HIDDEN_1_SIZE = 128
const HIDDEN_2_SIZE = 64
const DROPOUT_RATE = 0.2

/**
 * Creates the value network model.
 * Architecture: Input(128) -> Dense(128, ReLU) -> Dropout -> Dense(64, ReLU) -> Dropout -> Dense(1, Sigmoid)
 *
 * @returns TensorFlow.js LayersModel
 */
export function createValueNetwork(): tf.LayersModel {
  const model = tf.sequential({
    layers: [
      // Input layer with first hidden layer
      tf.layers.dense({
        inputShape: [STATE_ENCODING_SIZE],
        units: HIDDEN_1_SIZE,
        activation: 'relu',
        kernelInitializer: 'heNormal',
        name: 'dense_1',
      }),
      tf.layers.dropout({
        rate: DROPOUT_RATE,
        name: 'dropout_1',
      }),

      // Second hidden layer
      tf.layers.dense({
        units: HIDDEN_2_SIZE,
        activation: 'relu',
        kernelInitializer: 'heNormal',
        name: 'dense_2',
      }),
      tf.layers.dropout({
        rate: DROPOUT_RATE,
        name: 'dropout_2',
      }),

      // Output layer - win probability
      tf.layers.dense({
        units: 1,
        activation: 'sigmoid',
        name: 'output',
      }),
    ],
  })

  return model
}

/**
 * Compiles the model for training.
 *
 * @param model - The model to compile
 * @param learningRate - Optional learning rate (default: 0.001)
 */
export function compileModel(model: tf.LayersModel, learningRate: number = 0.001): void {
  model.compile({
    optimizer: tf.train.adam(learningRate),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy'],
  })
}

/**
 * Loads a pre-trained model from a URL or file path.
 *
 * @param modelPath - Path to model.json (can be URL or file path)
 * @returns Promise resolving to the loaded model
 */
export async function loadValueNetwork(modelPath: string): Promise<tf.LayersModel> {
  return await tf.loadLayersModel(modelPath)
}

/**
 * Saves the model to a specified location.
 * For Node.js, use 'file://path/to/model'
 * For browser, use 'localstorage://model-name' or 'indexeddb://model-name'
 *
 * @param model - The model to save
 * @param savePath - Path to save the model
 */
export async function saveModel(model: tf.LayersModel, savePath: string): Promise<void> {
  await model.save(savePath)
}

/**
 * Get model summary info
 */
export function getModelInfo(model: tf.LayersModel): {
  inputShape: number[]
  outputShape: number[]
  totalParams: number
} {
  const inputShape = model.inputs[0]?.shape?.slice(1) ?? []
  const outputShape = model.outputs[0]?.shape?.slice(1) ?? []

  let totalParams = 0
  for (const layer of model.layers) {
    const weights = layer.getWeights()
    for (const w of weights) {
      totalParams += w.size
    }
  }

  return {
    inputShape: inputShape as number[],
    outputShape: outputShape as number[],
    totalParams,
  }
}

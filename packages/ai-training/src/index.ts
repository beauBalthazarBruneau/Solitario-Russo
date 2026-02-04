export {
  computeAITurn,
  playAITurn,
  getAIMoves,
  DEFAULT_WEIGHTS,
  DEFAULT_AI_CONFIG,
  BOT_PROFILES,
  DEFAULT_BOT_PROFILE,
  NEURAL_BOT_PROFILE,
  type AIDecision,
  type AITurnResult,
  type AITurnStep,
  type ScoreWeights,
  type AIConfig,
  type BotProfile,
} from './heuristic-ai.js'

export { runGridSearch, type GridSearchConfig, type GridSearchResult } from './grid-search.js'

export { runDepthComparison, type DepthComparisonConfig, type DepthComparisonResult } from './depth-comparison.js'

// Neural network exports
export { encodeGameState, getEncodingSize, STATE_ENCODING_SIZE } from './neural/state-encoder.js'

export {
  createValueNetwork,
  compileModel,
  loadValueNetwork,
  saveModel,
  getModelInfo,
} from './neural/model.js'

export {
  evaluateState,
  evaluateStatesBatch,
  evaluateMoves,
  getNeuralDecision,
  computeNeuralTurn,
  type NeuralScoredMove,
  type NeuralDecision,
  type NeuralTurnStep,
} from './neural/inference.js'

export {
  playSelfPlayGame,
  recordToExamples,
  generateTrainingData,
  shuffleExamples,
  splitTrainValidation,
  examplesToTensors,
  serializeExamples,
  deserializeExamples,
  type TrainingExample,
  type SerializedTrainingData,
} from './neural/training-data.js'

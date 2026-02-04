export {
  computeAITurn,
  playAITurn,
  getAIMoves,
  DEFAULT_WEIGHTS,
  DEFAULT_AI_CONFIG,
  BOT_PROFILES,
  DEFAULT_BOT_PROFILE,
  type AIDecision,
  type AITurnResult,
  type AITurnStep,
  type ScoreWeights,
  type AIConfig,
  type BotProfile,
} from './heuristic-ai.js'

export { runGridSearch, type GridSearchConfig, type GridSearchResult } from './grid-search.js'

export { runDepthComparison, type DepthComparisonConfig, type DepthComparisonResult } from './depth-comparison.js'

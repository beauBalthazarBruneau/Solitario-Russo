// Types
export type {
  Suit,
  Rank,
  Player,
  Card,
  PileType,
  PileLocation,
  PlayerState,
  GameState,
  Move,
  MoveResult,
  Color,
} from './types.js'

// Constants
export {
  SUITS,
  RANKS,
  RESERVE_SIZE,
  TABLEAU_COUNT,
  FOUNDATION_COUNT,
  MAX_MOVES,
  SUIT_COLORS,
  getCardColor,
  isOppositeColor,
} from './constants.js'

// Deck utilities
export { createDeck, shuffle, createSeededRng } from './deck.js'

// Game engine
export {
  initializeGame,
  cloneState,
  checkWinCondition,
  switchTurn,
  applyMove,
  drawFromHand,
  getValidMoves,
  getHintMoves,
  isValidMove,
  canDrawFromHand,
  getPlayerState,
  getOpponent,
  getTopCard,
  canPlayOnFoundation,
  canPlayOnTableau,
  canPlayOnOwnTableau,
  canPlayOnOpponentTableau,
  canPlayOnOpponentPile,
} from './engine.js'

// Notation
export {
  cardToNotation,
  notationToCard,
  pileToNotation,
  notationToPile,
  moveToNotation,
  drawToNotation,
  notationToMove,
  isDrawNotation,
  formatGameLog,
} from './notation.js'

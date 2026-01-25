export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13
export type Player = 'player1' | 'player2'

export interface Card {
  suit: Suit
  rank: Rank
  deck: Player // Which deck this card belongs to
}

export type PileType = 'reserve' | 'waste' | 'tableau' | 'foundation' | 'hand'

export interface PileLocation {
  type: PileType
  owner?: Player // undefined for foundations
  index?: number // For tableau (0-3) and foundation (0-7)
}

export interface PlayerState {
  reserve: Card[] // Face-down pile, top card (last in array) is face-up
  waste: Card[] // Played from hand, top card (last in array) is accessible
  tableau: Card[][] // 4 piles, each pile's top card (last in array) is accessible
  hand: Card[] // Draw pile, face-down
}

export interface GameState {
  player1: PlayerState
  player2: PlayerState
  foundations: Card[][] // 8 piles, one for each suit per deck
  currentTurn: Player
  turnPhase: 'playing' | 'must-draw' | 'ended'
  moveCount: number
  winner: Player | null
}

export interface Move {
  from: PileLocation
  to: PileLocation
  card: Card
}

export interface MoveResult {
  valid: boolean
  reason?: string
  newState?: GameState
  turnEnded?: boolean
}

// Utility type for card color
export type Color = 'red' | 'black'

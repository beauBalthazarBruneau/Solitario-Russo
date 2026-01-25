import type { Suit, Rank, Color } from './types.js'

export const SUITS: readonly Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'] as const
export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const

export const RESERVE_SIZE = 12
export const TABLEAU_COUNT = 4
export const FOUNDATION_COUNT = 8 // 4 suits x 2 decks
export const MAX_MOVES = 1000

// Foundation suit by row index (0-3): hearts, diamonds, clubs, spades
// Foundations 0-3 are column 1, foundations 4-7 are column 2
// Both columns have the same suit per row
export const FOUNDATION_SUITS: readonly Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'] as const

export function getFoundationSuit(foundationIndex: number): Suit {
  // Index 0,4 = hearts; 1,5 = diamonds; 2,6 = clubs; 3,7 = spades
  return FOUNDATION_SUITS[foundationIndex % 4] ?? 'hearts'
}

export const SUIT_COLORS: Record<Suit, Color> = {
  hearts: 'red',
  diamonds: 'red',
  clubs: 'black',
  spades: 'black',
}

export function getCardColor(suit: Suit): Color {
  return SUIT_COLORS[suit]
}

export function isOppositeColor(suit1: Suit, suit2: Suit): boolean {
  return SUIT_COLORS[suit1] !== SUIT_COLORS[suit2]
}

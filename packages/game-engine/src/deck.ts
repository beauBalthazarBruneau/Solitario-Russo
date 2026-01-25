import type { Card, Player } from './types.js'
import { SUITS, RANKS } from './constants.js'

/**
 * Creates a standard 52-card deck for a player
 */
export function createDeck(owner: Player): Card[] {
  const cards: Card[] = []

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ suit, rank, deck: owner })
    }
  }

  return cards
}

/**
 * Fisher-Yates shuffle algorithm
 * @param array - Array to shuffle (will be mutated)
 * @param rng - Optional random number generator (returns 0-1), defaults to Math.random
 */
export function shuffle<T>(array: T[], rng: () => number = Math.random): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const temp = array[i]!
    array[i] = array[j]!
    array[j] = temp
  }
  return array
}

/**
 * Creates a seeded random number generator using a simple LCG
 * Good enough for reproducible games, not for cryptography
 */
export function createSeededRng(seed: number): () => number {
  let state = seed

  return () => {
    // LCG parameters from Numerical Recipes
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

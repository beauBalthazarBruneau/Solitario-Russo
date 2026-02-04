/**
 * State encoder for neural network input.
 * Converts a GameState to a fixed-size Float32Array for neural network inference.
 */

import type { GameState, Player, Card, Suit } from '@russian-bank/game-engine'
import { getPlayerState, getOpponent } from '@russian-bank/game-engine'

// Suits in consistent order for one-hot encoding
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const SUIT_INDEX: Record<Suit, number> = {
  hearts: 0,
  diamonds: 1,
  clubs: 2,
  spades: 3,
}

// Feature dimensions
const FOUNDATION_FEATURES = 8 + 32 // 8 ranks + 8*4 suit one-hot
const PLAYER_FEATURES = 43 // Per player
const META_FEATURES = 2 // Current player, is my turn

export const STATE_ENCODING_SIZE = FOUNDATION_FEATURES + PLAYER_FEATURES * 2 + META_FEATURES // ~128

/**
 * Normalize a rank (1-13) to [0, 1] range
 */
function normalizeRank(rank: number): number {
  return (rank - 1) / 12 // 0 for Ace, 1 for King
}

/**
 * Normalize a pile size to [0, 1] range
 * Max pile sizes: reserve=12, waste=35, tableau=varies, hand=35
 */
function normalizePileSize(size: number, maxSize: number): number {
  return Math.min(size / maxSize, 1)
}

/**
 * Encode a card as [suit one-hot (4), rank normalized (1)] = 5 features
 * Returns zeros if card is null/undefined
 */
function encodeCard(card: Card | null | undefined): number[] {
  if (!card) {
    return [0, 0, 0, 0, 0]
  }
  const suitOneHot = [0, 0, 0, 0]
  suitOneHot[SUIT_INDEX[card.suit]] = 1
  return [...suitOneHot, normalizeRank(card.rank)]
}

/**
 * Get the top card of a pile (last element in array)
 */
function getTopCard(pile: Card[]): Card | null {
  return pile.length > 0 ? pile[pile.length - 1]! : null
}

/**
 * Encode a player's state from their perspective.
 * Returns 43 features.
 */
function encodePlayerState(state: GameState, player: Player): number[] {
  const ps = getPlayerState(state, player)
  const features: number[] = []

  // Reserve: size normalized + top card (5) = 6 features
  features.push(normalizePileSize(ps.reserve.length, 12))
  features.push(...encodeCard(getTopCard(ps.reserve)))

  // Waste: size normalized + top card (5) = 6 features
  features.push(normalizePileSize(ps.waste.length, 35))
  features.push(...encodeCard(getTopCard(ps.waste)))

  // Tableau (4 piles): each pile size + top card = 6 * 4 = 24 features
  for (let i = 0; i < 4; i++) {
    const pile = ps.tableau[i] ?? []
    features.push(normalizePileSize(pile.length, 13)) // Max tableau height estimate
    features.push(...encodeCard(getTopCard(pile)))
  }

  // Hand size normalized = 1 feature
  features.push(normalizePileSize(ps.hand.length, 35))

  // Drawn card: has drawn (0/1) + card encoding (5) = 6 features
  features.push(ps.drawnCard ? 1 : 0)
  features.push(...encodeCard(ps.drawnCard))

  return features
}

/**
 * Encode the foundation piles.
 * Returns 40 features: 8 ranks + 8*4 suit one-hot = 8 + 32.
 */
function encodeFoundations(state: GameState): number[] {
  const features: number[] = []

  // For each foundation pile
  for (let i = 0; i < 8; i++) {
    const pile = state.foundations[i] ?? []
    // Top rank normalized (0 if empty)
    const topCard = getTopCard(pile)
    features.push(topCard ? normalizeRank(topCard.rank) : 0)
  }

  // Suit one-hot for each foundation (4 features each)
  for (let i = 0; i < 8; i++) {
    const pile = state.foundations[i] ?? []
    const topCard = getTopCard(pile)
    if (topCard) {
      const suitOneHot = [0, 0, 0, 0]
      suitOneHot[SUIT_INDEX[topCard.suit]] = 1
      features.push(...suitOneHot)
    } else {
      features.push(0, 0, 0, 0)
    }
  }

  return features
}

/**
 * Encode the full game state from a specific player's perspective.
 * The encoding is symmetric - "my" state comes first, then "opponent".
 *
 * @param state - The current game state
 * @param forPlayer - The player's perspective to encode from
 * @returns Float32Array of normalized features
 */
export function encodeGameState(state: GameState, forPlayer: Player): Float32Array {
  const features: number[] = []

  // Foundations (40 features)
  features.push(...encodeFoundations(state))

  // My player state (43 features)
  features.push(...encodePlayerState(state, forPlayer))

  // Opponent player state (43 features)
  const opponent = getOpponent(forPlayer)
  features.push(...encodePlayerState(state, opponent))

  // Meta features (2 features)
  // Current player: 1 if it's forPlayer's turn, 0 otherwise
  features.push(state.currentTurn === forPlayer ? 1 : 0)
  // Is it my turn (same as above, but kept for clarity in model)
  features.push(state.currentTurn === forPlayer ? 1 : 0)

  return new Float32Array(features)
}

/**
 * Get the expected size of the encoded state
 */
export function getEncodingSize(): number {
  return STATE_ENCODING_SIZE
}

import type { Card, GameState, Move, MoveResult, Player, PileLocation } from './types.js'
import { isOppositeColor, getFoundationSuit } from './constants.js'

/**
 * Gets the top card from a pile (last element), or undefined if empty
 */
export function getTopCard(pile: Card[]): Card | undefined {
  return pile[pile.length - 1]
}

/**
 * Checks if a card can be played on a foundation pile
 * Foundations are suit-specific and build up: A-2-3-4-5-6-7-8-9-10-J-Q-K
 * Each foundation index corresponds to a specific suit
 */
export function canPlayOnFoundation(card: Card, pile: Card[], foundationIndex: number): boolean {
  // Check if card matches the designated suit for this foundation
  const requiredSuit = getFoundationSuit(foundationIndex)
  if (card.suit !== requiredSuit) {
    return false
  }

  if (pile.length === 0) {
    // Only Aces can start a foundation
    return card.rank === 1
  }

  const topCard = getTopCard(pile)
  if (!topCard) return card.rank === 1

  // Must be same suit and one rank higher
  return card.suit === topCard.suit && card.rank === topCard.rank + 1
}

/**
 * Checks if a card can be played on ANY tableau pile
 * All tableaus: build DOWN in ALTERNATING colors
 * Empty tableau: any card
 */
export function canPlayOnTableau(card: Card, pile: Card[]): boolean {
  if (pile.length === 0) {
    // Any card can go on empty tableau
    return true
  }

  const topCard = getTopCard(pile)
  if (!topCard) return true

  // Must be opposite color and one rank lower
  return isOppositeColor(card.suit, topCard.suit) && card.rank === topCard.rank - 1
}

// Legacy exports for backwards compatibility
export const canPlayOnOwnTableau = canPlayOnTableau
export const canPlayOnOpponentTableau = canPlayOnTableau

/**
 * Checks if a card can be played on opponent's waste or reserve
 * Attack rule: same suit, one rank higher or lower
 * Cannot play on empty pile
 */
export function canPlayOnOpponentPile(card: Card, pile: Card[]): boolean {
  if (pile.length === 0) {
    // Cannot play on empty opponent waste/reserve
    return false
  }

  const topCard = getTopCard(pile)
  if (!topCard) return false

  // Must be same suit and adjacent rank (±1)
  return (
    card.suit === topCard.suit &&
    (card.rank === topCard.rank + 1 || card.rank === topCard.rank - 1)
  )
}

/**
 * Gets the player state for a given player
 */
export function getPlayerState(state: GameState, player: Player) {
  return player === 'player1' ? state.player1 : state.player2
}

/**
 * Gets the opponent of a player
 */
export function getOpponent(player: Player): Player {
  return player === 'player1' ? 'player2' : 'player1'
}

/**
 * Gets the card at a pile location, or undefined if not accessible
 */
export function getCardAtLocation(state: GameState, location: PileLocation): Card | undefined {
  if (location.type === 'foundation') {
    const pile = state.foundations[location.index ?? 0]
    return pile ? getTopCard(pile) : undefined
  }

  if (!location.owner) return undefined
  const playerState = getPlayerState(state, location.owner)

  switch (location.type) {
    case 'reserve':
      return getTopCard(playerState.reserve)
    case 'waste':
      return getTopCard(playerState.waste)
    case 'tableau': {
      const pile = playerState.tableau[location.index ?? 0]
      return pile ? getTopCard(pile) : undefined
    }
    case 'hand':
      return getTopCard(playerState.hand)
    default:
      return undefined
  }
}

/**
 * Gets all valid moves for the current player
 */
export function getValidMoves(state: GameState): Move[] {
  const moves: Move[] = []
  const currentPlayer = state.currentTurn
  const opponent = getOpponent(currentPlayer)
  const playerState = getPlayerState(state, currentPlayer)
  const opponentState = getPlayerState(state, opponent)

  // Helper to add moves for a card from a source location
  const tryAddMove = (from: PileLocation, card: Card | undefined) => {
    if (!card) return

    // Try foundations (8 piles)
    for (let i = 0; i < state.foundations.length; i++) {
      const pile = state.foundations[i]
      if (pile && canPlayOnFoundation(card, pile, i)) {
        moves.push({
          from,
          to: { type: 'foundation', index: i },
          card,
        })
      }
    }

    // Try all tableau piles (own + opponent's)
    // Own tableau (4 piles)
    for (let i = 0; i < playerState.tableau.length; i++) {
      const pile = playerState.tableau[i]
      // Can't move to same pile
      if (from.type === 'tableau' && from.owner === currentPlayer && from.index === i) {
        continue
      }
      if (pile && canPlayOnTableau(card, pile)) {
        moves.push({
          from,
          to: { type: 'tableau', owner: currentPlayer, index: i },
          card,
        })
      }
    }

    // Opponent tableau (4 piles)
    for (let i = 0; i < opponentState.tableau.length; i++) {
      const pile = opponentState.tableau[i]
      // Can't move to same pile
      if (from.type === 'tableau' && from.owner === opponent && from.index === i) {
        continue
      }
      if (pile && canPlayOnTableau(card, pile)) {
        moves.push({
          from,
          to: { type: 'tableau', owner: opponent, index: i },
          card,
        })
      }
    }

    // Try opponent's waste (attack - same suit, ±1 rank)
    if (canPlayOnOpponentPile(card, opponentState.waste)) {
      moves.push({
        from,
        to: { type: 'waste', owner: opponent },
        card,
      })
    }

    // Try opponent's reserve (attack - same suit, ±1 rank)
    if (canPlayOnOpponentPile(card, opponentState.reserve)) {
      moves.push({
        from,
        to: { type: 'reserve', owner: opponent },
        card,
      })
    }
  }

  // Can play from reserve (top card)
  const reserveCard = getTopCard(playerState.reserve)
  if (reserveCard) {
    tryAddMove({ type: 'reserve', owner: currentPlayer }, reserveCard)
  }

  // Can play the just-drawn card (if any)
  // Note: drawnCard is set when a playable card is drawn from hand
  // The card is physically in waste but tracked separately
  if (state.drawnCard) {
    tryAddMove({ type: 'waste', owner: currentPlayer }, state.drawnCard)
  }

  // Can play from ANY tableau (own + opponent's top cards)
  for (let i = 0; i < playerState.tableau.length; i++) {
    const pile = playerState.tableau[i]
    const tableauCard = pile ? getTopCard(pile) : undefined
    if (tableauCard) {
      tryAddMove({ type: 'tableau', owner: currentPlayer, index: i }, tableauCard)
    }
  }

  for (let i = 0; i < opponentState.tableau.length; i++) {
    const pile = opponentState.tableau[i]
    const tableauCard = pile ? getTopCard(pile) : undefined
    if (tableauCard) {
      tryAddMove({ type: 'tableau', owner: opponent, index: i }, tableauCard)
    }
  }

  // Can draw from hand (special move - not added to regular moves)
  // Drawing is handled separately in the game loop

  return moves
}

/**
 * Checks if a move can draw from hand
 */
export function canDrawFromHand(state: GameState): boolean {
  const playerState = getPlayerState(state, state.currentTurn)
  return playerState.hand.length > 0 || playerState.waste.length > 0
}

/**
 * Validates a specific move
 */
export function isValidMove(state: GameState, move: Move): MoveResult {
  const validMoves = getValidMoves(state)
  const isValid = validMoves.some(
    (m) =>
      m.from.type === move.from.type &&
      m.from.owner === move.from.owner &&
      m.from.index === move.from.index &&
      m.to.type === move.to.type &&
      m.to.owner === move.to.owner &&
      m.to.index === move.to.index &&
      m.card.suit === move.card.suit &&
      m.card.rank === move.card.rank &&
      m.card.deck === move.card.deck
  )

  if (!isValid) {
    return { valid: false, reason: 'Invalid move' }
  }

  return { valid: true }
}

import type { Card, GameState, Move, MoveResult, Player, PlayerState } from './types.js'
import { RESERVE_SIZE, TABLEAU_COUNT, MAX_MOVES } from './constants.js'
import { createDeck, shuffle, createSeededRng } from './deck.js'
import {
  getValidMoves,
  isValidMove,
  getPlayerState,
  getOpponent,
  getTopCard,
  canPlayOnFoundation,
  canPlayOnOwnTableau,
  canPlayOnOpponentTableau,
  canDrawFromHand,
} from './validation.js'

/**
 * Deep clones a game state for immutability
 */
export function cloneState(state: GameState): GameState {
  return {
    player1: clonePlayerState(state.player1),
    player2: clonePlayerState(state.player2),
    foundations: state.foundations.map((pile) => [...pile]),
    currentTurn: state.currentTurn,
    turnPhase: state.turnPhase,
    moveCount: state.moveCount,
    winner: state.winner,
  }
}

function clonePlayerState(state: PlayerState): PlayerState {
  return {
    reserve: [...state.reserve],
    waste: [...state.waste],
    tableau: state.tableau.map((pile) => [...pile]),
    hand: [...state.hand],
  }
}

/**
 * Initializes a new game
 * @param seed - Optional seed for reproducible games
 */
export function initializeGame(seed?: number): GameState {
  const rng = seed !== undefined ? createSeededRng(seed) : Math.random

  // Create and shuffle both decks
  const deck1 = shuffle(createDeck('player1'), rng)
  const deck2 = shuffle(createDeck('player2'), rng)

  // Deal cards for each player
  const player1State = dealPlayerCards(deck1)
  const player2State = dealPlayerCards(deck2)

  // Initialize 8 empty foundation piles
  const foundations: Card[][] = Array.from({ length: 8 }, () => [])

  // Randomly pick starting player
  const startingPlayer: Player = rng() < 0.5 ? 'player1' : 'player2'

  return {
    player1: player1State,
    player2: player2State,
    foundations,
    currentTurn: startingPlayer,
    turnPhase: 'playing',
    moveCount: 0,
    winner: null,
  }
}

/**
 * Deals cards to create a player's initial state
 */
function dealPlayerCards(deck: Card[]): PlayerState {
  // Reserve: 12 cards (top card face-up)
  const reserve = deck.splice(0, RESERVE_SIZE)

  // Tableau: 4 piles with 1 card each
  const tableau: Card[][] = []
  for (let i = 0; i < TABLEAU_COUNT; i++) {
    const card = deck.splice(0, 1)
    tableau.push(card)
  }

  // Hand: remaining 35 cards
  const hand = [...deck]

  return {
    reserve,
    waste: [],
    tableau,
    hand,
  }
}

/**
 * Checks if a player has won (reserve + hand + waste all empty)
 */
export function checkWinCondition(state: GameState): Player | null {
  for (const player of ['player1', 'player2'] as const) {
    const playerState = getPlayerState(state, player)
    if (
      playerState.reserve.length === 0 &&
      playerState.hand.length === 0 &&
      playerState.waste.length === 0
    ) {
      return player
    }
  }
  return null
}

/**
 * Switches the turn to the other player
 */
export function switchTurn(state: GameState): GameState {
  const newState = cloneState(state)
  newState.currentTurn = getOpponent(state.currentTurn)
  newState.turnPhase = 'playing'
  return newState
}

/**
 * Applies a move to the game state
 * Returns the new state (immutable)
 */
export function applyMove(state: GameState, move: Move): MoveResult {
  // Validate the move first
  const validation = isValidMove(state, move)
  if (!validation.valid) {
    return validation
  }

  const newState = cloneState(state)
  const currentPlayer = newState.currentTurn
  const playerState = getPlayerState(newState, currentPlayer)
  const opponentState = getPlayerState(newState, getOpponent(currentPlayer))

  // Remove card from source
  let removedCard: Card | undefined
  switch (move.from.type) {
    case 'reserve':
      removedCard = playerState.reserve.pop()
      break
    case 'waste':
      removedCard = playerState.waste.pop()
      break
    case 'tableau': {
      const pile = playerState.tableau[move.from.index ?? 0]
      if (pile) {
        removedCard = pile.pop()
      }
      break
    }
  }

  if (!removedCard) {
    return { valid: false, reason: 'No card at source' }
  }

  // Add card to destination
  switch (move.to.type) {
    case 'foundation': {
      const pile = newState.foundations[move.to.index ?? 0]
      if (pile) {
        pile.push(removedCard)
      }
      break
    }
    case 'tableau': {
      const owner = move.to.owner
      const targetState = owner === currentPlayer ? playerState : opponentState
      const pile = targetState.tableau[move.to.index ?? 0]
      if (pile) {
        pile.push(removedCard)
      }
      break
    }
  }

  newState.moveCount++

  // Check win condition
  const winner = checkWinCondition(newState)
  if (winner) {
    newState.winner = winner
    newState.turnPhase = 'ended'
  }

  // Check move limit
  if (newState.moveCount >= MAX_MOVES) {
    newState.turnPhase = 'ended'
  }

  return {
    valid: true,
    newState,
    turnEnded: false,
  }
}

/**
 * Draws a card from hand to waste
 * This is the action that can end a turn
 */
export function drawFromHand(state: GameState): MoveResult {
  const newState = cloneState(state)
  const playerState = getPlayerState(newState, newState.currentTurn)

  // Check if we need to flip waste to hand
  if (playerState.hand.length === 0) {
    if (playerState.waste.length === 0) {
      return { valid: false, reason: 'No cards in hand or waste' }
    }
    // Flip waste to hand (reverse so bottom of waste becomes bottom of hand)
    playerState.hand = playerState.waste.reverse()
    playerState.waste = []
  }

  // Draw one card from hand to waste
  const drawnCard = playerState.hand.pop()
  if (!drawnCard) {
    return { valid: false, reason: 'No card to draw' }
  }
  playerState.waste.push(drawnCard)
  newState.moveCount++

  // Check if drawn card can be played
  const movesWithDrawnCard = getMovesForCard(newState, drawnCard, {
    type: 'waste',
    owner: newState.currentTurn,
  })

  let turnEnded = false
  if (movesWithDrawnCard.length === 0) {
    // Card cannot be played, turn ends
    turnEnded = true
    newState.currentTurn = getOpponent(state.currentTurn)
    newState.turnPhase = 'playing'
  }

  // Check win condition
  const winner = checkWinCondition(newState)
  if (winner) {
    newState.winner = winner
    newState.turnPhase = 'ended'
    turnEnded = false // Game over, not just turn ended
  }

  // Check move limit
  if (newState.moveCount >= MAX_MOVES) {
    newState.turnPhase = 'ended'
  }

  return {
    valid: true,
    newState,
    turnEnded,
  }
}

/**
 * Gets all valid moves for a specific card from a specific location
 */
function getMovesForCard(state: GameState, card: Card, from: Move['from']): Move[] {
  const moves: Move[] = []
  const currentPlayer = state.currentTurn
  const opponent = getOpponent(currentPlayer)
  const playerState = getPlayerState(state, currentPlayer)
  const opponentState = getPlayerState(state, opponent)

  // Try foundations
  for (let i = 0; i < state.foundations.length; i++) {
    const pile = state.foundations[i]
    if (pile && canPlayOnFoundation(card, pile)) {
      moves.push({
        from,
        to: { type: 'foundation', index: i },
        card,
      })
    }
  }

  // Try own tableau
  for (let i = 0; i < playerState.tableau.length; i++) {
    const pile = playerState.tableau[i]
    if (pile && canPlayOnOwnTableau(card, pile)) {
      moves.push({
        from,
        to: { type: 'tableau', owner: currentPlayer, index: i },
        card,
      })
    }
  }

  // Try opponent tableau
  for (let i = 0; i < opponentState.tableau.length; i++) {
    const pile = opponentState.tableau[i]
    if (pile && canPlayOnOpponentTableau(card, pile)) {
      moves.push({
        from,
        to: { type: 'tableau', owner: opponent, index: i },
        card,
      })
    }
  }

  return moves
}

// Re-export validation functions for convenience
export {
  getValidMoves,
  isValidMove,
  canDrawFromHand,
  getPlayerState,
  getOpponent,
  getTopCard,
  canPlayOnFoundation,
  canPlayOnOwnTableau,
  canPlayOnOpponentTableau,
}

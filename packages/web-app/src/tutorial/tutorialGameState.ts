import type { GameState, Card, PlayerState } from '@russian-bank/game-engine'

/**
 * Creates a deterministic game state specifically designed for the tutorial.
 * This state is carefully crafted to showcase all game mechanics:
 * - Valid foundation moves available
 * - Valid tableau moves with alternating colors
 * - Attack opportunities on opponent's piles
 * - Cards arranged to demonstrate rules clearly
 */

// Helper to create cards
function card(suit: Card['suit'], rank: Card['rank'], deck: Card['deck'] = 'player1'): Card {
  return { suit, rank, deck }
}

export function createTutorialGameState(): GameState {
  // Player 1's state (bottom - the user)
  // Designed to have immediate move opportunities
  const player1: PlayerState = {
    // Reserve: 12 cards, top card (last) is face-up
    // Top card is A♥ - can go to foundation
    reserve: [
      card('spades', 5), card('clubs', 8), card('diamonds', 9),
      card('hearts', 3), card('spades', 7), card('clubs', 10),
      card('diamonds', 4), card('hearts', 6), card('spades', 12),
      card('clubs', 2), card('diamonds', 11), card('hearts', 1), // Top: Ace of Hearts
    ],
    // Waste: Start with some cards, top is playable
    // Top card is 6♦ - can attack opponent's 7♦ reserve
    waste: [
      card('spades', 9), card('clubs', 4), card('diamonds', 6), // Top: 6 of Diamonds
    ],
    // Tableau: 4 piles with cards that allow various moves
    tableau: [
      [card('hearts', 7)],    // Red 7 - can receive black 6
      [card('spades', 10)],   // Black 10 - can receive red 9
      [card('diamonds', 4)],  // Red 4 - can receive black 3
      [card('clubs', 8)],     // Black 8 - can receive red 7
    ],
    // Hand: remaining cards (face-down draw pile)
    hand: [
      card('hearts', 2), card('spades', 3), card('clubs', 5),
      card('diamonds', 7), card('hearts', 8), card('spades', 11),
      card('clubs', 12), card('diamonds', 13), card('hearts', 9),
      card('spades', 4), card('clubs', 6), card('diamonds', 3),
      card('hearts', 10), card('spades', 6), card('clubs', 7),
      card('diamonds', 8), card('hearts', 11), card('spades', 2),
      card('clubs', 9), card('diamonds', 10), card('hearts', 4),
      card('spades', 8), card('clubs', 11), card('diamonds', 2),
      card('hearts', 12), card('spades', 13), card('clubs', 13),
      card('diamonds', 5), card('hearts', 5), card('spades', 1),
      card('clubs', 1), card('diamonds', 1), card('clubs', 3),
      card('diamonds', 12), card('hearts', 13),
    ],
    drawnCard: null,
  }

  // Player 2's state (top - the opponent/AI)
  // Designed to have attackable piles
  const player2: PlayerState = {
    // Reserve: Top card is 7♦ - attackable with 6♦ or 8♦
    reserve: [
      card('hearts', 3, 'player2'), card('clubs', 7, 'player2'),
      card('spades', 9, 'player2'), card('diamonds', 5, 'player2'),
      card('hearts', 11, 'player2'), card('clubs', 2, 'player2'),
      card('spades', 4, 'player2'), card('diamonds', 10, 'player2'),
      card('hearts', 8, 'player2'), card('clubs', 13, 'player2'),
      card('spades', 6, 'player2'), card('diamonds', 7, 'player2'), // Top: 7 of Diamonds
    ],
    // Waste: Top card is 5♠ - attackable with 4♠ or 6♠
    waste: [
      card('hearts', 2, 'player2'), card('clubs', 9, 'player2'),
      card('spades', 5, 'player2'), // Top: 5 of Spades
    ],
    // Tableau: Cards that demonstrate opponent's piles
    tableau: [
      [card('diamonds', 9, 'player2')],  // Red 9
      [card('clubs', 6, 'player2')],     // Black 6
      [card('hearts', 5, 'player2')],    // Red 5
      [card('spades', 11, 'player2')],   // Black Jack
    ],
    // Hand: remaining cards
    hand: [
      card('hearts', 1, 'player2'), card('spades', 2, 'player2'),
      card('clubs', 3, 'player2'), card('diamonds', 4, 'player2'),
      card('hearts', 4, 'player2'), card('spades', 3, 'player2'),
      card('clubs', 4, 'player2'), card('diamonds', 6, 'player2'),
      card('hearts', 6, 'player2'), card('spades', 7, 'player2'),
      card('clubs', 8, 'player2'), card('diamonds', 8, 'player2'),
      card('hearts', 7, 'player2'), card('spades', 8, 'player2'),
      card('clubs', 10, 'player2'), card('diamonds', 11, 'player2'),
      card('hearts', 9, 'player2'), card('spades', 10, 'player2'),
      card('clubs', 11, 'player2'), card('diamonds', 12, 'player2'),
      card('hearts', 10, 'player2'), card('spades', 12, 'player2'),
      card('clubs', 12, 'player2'), card('diamonds', 13, 'player2'),
      card('hearts', 12, 'player2'), card('spades', 13, 'player2'),
      card('clubs', 1, 'player2'), card('diamonds', 1, 'player2'),
      card('hearts', 13, 'player2'), card('spades', 1, 'player2'),
      card('clubs', 5, 'player2'), card('diamonds', 2, 'player2'),
      card('diamonds', 3, 'player2'), card('clubs', 6, 'player2'),
      card('hearts', 4, 'player2'),
    ],
    drawnCard: null,
  }

  // 8 empty foundation piles
  // Index 0-3: Hearts, Diamonds, Clubs, Spades (deck 1)
  // Index 4-7: Hearts, Diamonds, Clubs, Spades (deck 2)
  const foundations: Card[][] = [
    [], [], [], [],
    [], [], [], [],
  ]

  return {
    player1,
    player2,
    foundations,
    currentTurn: 'player1', // Tutorial always starts with player 1
    turnPhase: 'playing',
    moveCount: 0,
    winner: null,
    seed: 12345, // Fixed seed for tutorial
    history: [],
  }
}

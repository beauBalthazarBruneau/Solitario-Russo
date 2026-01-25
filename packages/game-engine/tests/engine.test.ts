import { describe, it, expect } from 'vitest'
import {
  initializeGame,
  cloneState,
  checkWinCondition,
  applyMove,
  drawFromHand,
  getValidMoves,
  getPlayerState,
  getTopCard,
  canPlayOnFoundation,
  canPlayOnOwnTableau,
  canPlayOnOpponentTableau,
  RESERVE_SIZE,
  TABLEAU_COUNT,
} from '../src/index.js'
import type { Card, GameState, Move } from '../src/index.js'

describe('Game Initialization', () => {
  it('should create a valid initial game state', () => {
    const state = initializeGame(12345)

    // Check player 1 state
    expect(state.player1.reserve.length).toBe(RESERVE_SIZE)
    expect(state.player1.tableau.length).toBe(TABLEAU_COUNT)
    expect(state.player1.tableau.every((pile) => pile.length === 1)).toBe(true)
    expect(state.player1.hand.length).toBe(36) // 52 - 12 - 4 = 36
    expect(state.player1.waste.length).toBe(0)

    // Check player 2 state
    expect(state.player2.reserve.length).toBe(RESERVE_SIZE)
    expect(state.player2.tableau.length).toBe(TABLEAU_COUNT)
    expect(state.player2.tableau.every((pile) => pile.length === 1)).toBe(true)
    expect(state.player2.hand.length).toBe(36)
    expect(state.player2.waste.length).toBe(0)

    // Check foundations
    expect(state.foundations.length).toBe(8)
    expect(state.foundations.every((pile) => pile.length === 0)).toBe(true)

    // Check game state
    expect(['player1', 'player2']).toContain(state.currentTurn)
    expect(state.turnPhase).toBe('playing')
    expect(state.moveCount).toBe(0)
    expect(state.winner).toBeNull()
  })

  it('should create reproducible games with same seed', () => {
    const state1 = initializeGame(42)
    const state2 = initializeGame(42)

    expect(state1.player1.reserve).toEqual(state2.player1.reserve)
    expect(state1.player2.reserve).toEqual(state2.player2.reserve)
    expect(state1.currentTurn).toBe(state2.currentTurn)
  })

  it('should create different games with different seeds', () => {
    const state1 = initializeGame(1)
    const state2 = initializeGame(2)

    // Very unlikely to be equal
    expect(state1.player1.reserve).not.toEqual(state2.player1.reserve)
  })

  it('should have correct card counts (104 total cards)', () => {
    const state = initializeGame(123)

    let totalCards = 0
    totalCards += state.player1.reserve.length
    totalCards += state.player1.waste.length
    totalCards += state.player1.hand.length
    for (const pile of state.player1.tableau) {
      totalCards += pile.length
    }
    totalCards += state.player2.reserve.length
    totalCards += state.player2.waste.length
    totalCards += state.player2.hand.length
    for (const pile of state.player2.tableau) {
      totalCards += pile.length
    }
    for (const pile of state.foundations) {
      totalCards += pile.length
    }

    expect(totalCards).toBe(104)
  })
})

describe('Clone State', () => {
  it('should deep clone the game state', () => {
    const original = initializeGame(999)
    const cloned = cloneState(original)

    // Should be equal
    expect(cloned.player1.reserve).toEqual(original.player1.reserve)

    // But modifying clone should not affect original
    cloned.player1.reserve.pop()
    expect(cloned.player1.reserve.length).toBe(original.player1.reserve.length - 1)
  })
})

describe('Foundation Play Validation', () => {
  it('should allow Ace on empty foundation', () => {
    const ace: Card = { suit: 'hearts', rank: 1, deck: 'player1' }
    expect(canPlayOnFoundation(ace, [])).toBe(true)
  })

  it('should not allow non-Ace on empty foundation', () => {
    const two: Card = { suit: 'hearts', rank: 2, deck: 'player1' }
    expect(canPlayOnFoundation(two, [])).toBe(false)
  })

  it('should allow building up by suit', () => {
    const ace: Card = { suit: 'spades', rank: 1, deck: 'player1' }
    const two: Card = { suit: 'spades', rank: 2, deck: 'player1' }
    const three: Card = { suit: 'spades', rank: 3, deck: 'player1' }

    expect(canPlayOnFoundation(two, [ace])).toBe(true)
    expect(canPlayOnFoundation(three, [ace, two])).toBe(true)
  })

  it('should not allow wrong suit on foundation', () => {
    const aceHearts: Card = { suit: 'hearts', rank: 1, deck: 'player1' }
    const twoSpades: Card = { suit: 'spades', rank: 2, deck: 'player1' }

    expect(canPlayOnFoundation(twoSpades, [aceHearts])).toBe(false)
  })

  it('should not allow skipping ranks', () => {
    const ace: Card = { suit: 'hearts', rank: 1, deck: 'player1' }
    const three: Card = { suit: 'hearts', rank: 3, deck: 'player1' }

    expect(canPlayOnFoundation(three, [ace])).toBe(false)
  })
})

describe('Own Tableau Play Validation', () => {
  it('should allow any card on empty tableau', () => {
    const king: Card = { suit: 'hearts', rank: 13, deck: 'player1' }
    expect(canPlayOnOwnTableau(king, [])).toBe(true)
  })

  it('should allow building down with alternating colors', () => {
    const eightSpades: Card = { suit: 'spades', rank: 8, deck: 'player1' }
    const sevenHearts: Card = { suit: 'hearts', rank: 7, deck: 'player1' }

    expect(canPlayOnOwnTableau(sevenHearts, [eightSpades])).toBe(true)
  })

  it('should not allow same color', () => {
    const eightSpades: Card = { suit: 'spades', rank: 8, deck: 'player1' }
    const sevenClubs: Card = { suit: 'clubs', rank: 7, deck: 'player1' }

    expect(canPlayOnOwnTableau(sevenClubs, [eightSpades])).toBe(false)
  })

  it('should not allow building up', () => {
    const eightSpades: Card = { suit: 'spades', rank: 8, deck: 'player1' }
    const nineHearts: Card = { suit: 'hearts', rank: 9, deck: 'player1' }

    expect(canPlayOnOwnTableau(nineHearts, [eightSpades])).toBe(false)
  })
})

describe('Opponent Tableau Play Validation', () => {
  it('should allow any card on empty opponent tableau', () => {
    const king: Card = { suit: 'hearts', rank: 13, deck: 'player1' }
    expect(canPlayOnOpponentTableau(king, [])).toBe(true)
  })

  it('should allow building up by same suit', () => {
    const sevenSpades: Card = { suit: 'spades', rank: 7, deck: 'player1' }
    const eightSpades: Card = { suit: 'spades', rank: 8, deck: 'player1' }

    expect(canPlayOnOpponentTableau(eightSpades, [sevenSpades])).toBe(true)
  })

  it('should allow building down by same suit', () => {
    const sevenSpades: Card = { suit: 'spades', rank: 7, deck: 'player1' }
    const sixSpades: Card = { suit: 'spades', rank: 6, deck: 'player1' }

    expect(canPlayOnOpponentTableau(sixSpades, [sevenSpades])).toBe(true)
  })

  it('should not allow different suit', () => {
    const sevenSpades: Card = { suit: 'spades', rank: 7, deck: 'player1' }
    const eightHearts: Card = { suit: 'hearts', rank: 8, deck: 'player1' }

    expect(canPlayOnOpponentTableau(eightHearts, [sevenSpades])).toBe(false)
  })
})

describe('Valid Moves', () => {
  it('should return valid moves for at least some initial states', () => {
    // Try multiple seeds - at least one should have valid initial moves
    let foundMovesInSomeGame = false
    for (let seed = 0; seed < 100; seed++) {
      const state = initializeGame(seed)
      const moves = getValidMoves(state)
      if (moves.length > 0) {
        foundMovesInSomeGame = true
        break
      }
    }
    expect(foundMovesInSomeGame).toBe(true)
  })

  it('should include foundation moves when Ace is available', () => {
    const state = initializeGame(12345)

    // Manually place an Ace in reserve to ensure we can test
    const currentPlayer = state.currentTurn
    const playerState = getPlayerState(state, currentPlayer)
    playerState.reserve.push({ suit: 'hearts', rank: 1, deck: currentPlayer })

    const moves = getValidMoves(state)
    const foundationMoves = moves.filter((m) => m.to.type === 'foundation')

    expect(foundationMoves.length).toBeGreaterThan(0)
  })
})

describe('Apply Move', () => {
  it('should apply a valid move and return new state', () => {
    const state = initializeGame(12345)
    const moves = getValidMoves(state)

    if (moves.length > 0) {
      const result = applyMove(state, moves[0]!)
      expect(result.valid).toBe(true)
      expect(result.newState).toBeDefined()
      expect(result.newState!.moveCount).toBe(1)
    }
  })

  it('should not mutate original state', () => {
    const state = initializeGame(12345)
    const originalMoveCount = state.moveCount
    const moves = getValidMoves(state)

    if (moves.length > 0) {
      applyMove(state, moves[0]!)
      expect(state.moveCount).toBe(originalMoveCount)
    }
  })
})

describe('Draw From Hand', () => {
  it('should draw a card to waste', () => {
    const state = initializeGame(12345)
    const playerState = getPlayerState(state, state.currentTurn)
    const originalHandSize = playerState.hand.length

    const result = drawFromHand(state)
    expect(result.valid).toBe(true)
    expect(result.newState).toBeDefined()

    const newPlayerState = getPlayerState(result.newState!, state.currentTurn)
    // Either turn ended (different player), or same player continues
    if (!result.turnEnded) {
      expect(newPlayerState.waste.length).toBe(1)
      expect(newPlayerState.hand.length).toBe(originalHandSize - 1)
    }
  })
})

describe('Win Condition', () => {
  it('should detect no winner in initial state', () => {
    const state = initializeGame(12345)
    expect(checkWinCondition(state)).toBeNull()
  })

  it('should detect winner when reserve, hand, and waste are empty', () => {
    const state = initializeGame(12345)

    // Manually empty player1's piles (cheating for test)
    state.player1.reserve = []
    state.player1.hand = []
    state.player1.waste = []

    expect(checkWinCondition(state)).toBe('player1')
  })
})

describe('Full Game Simulation', () => {
  it('should not crash during a simulated game', () => {
    let state = initializeGame(42)
    let iterations = 0
    const maxIterations = 100

    while (!state.winner && iterations < maxIterations) {
      const moves = getValidMoves(state)

      if (moves.length > 0) {
        // Pick first valid move
        const result = applyMove(state, moves[0]!)
        if (result.newState) {
          state = result.newState
        }
      } else {
        // No moves, try drawing
        const drawResult = drawFromHand(state)
        if (drawResult.newState) {
          state = drawResult.newState
        } else {
          // Stuck, end simulation
          break
        }
      }

      iterations++
    }

    // Should complete without throwing
    expect(iterations).toBeGreaterThan(0)
  })
})

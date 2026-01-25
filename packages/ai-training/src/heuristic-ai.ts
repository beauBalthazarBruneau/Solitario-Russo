import {
  type GameState,
  type Move,
  type PileLocation,
  getValidMoves,
  applyMove,
  drawFromHand,
  getPlayerState,
} from '@russian-bank/game-engine'

/**
 * Score weights for different move types.
 * Higher scores = more desirable moves.
 */
const SCORE_WEIGHTS = {
  // Playing to foundation is always good - removes cards permanently
  TO_FOUNDATION: 100,

  // Attacking opponent blocks their progress
  ATTACK_RESERVE: 80,  // Blocking their main card source is very valuable
  ATTACK_WASTE: 70,

  // Playing from reserve/waste depletes our piles (closer to winning)
  FROM_RESERVE: 50,
  FROM_WASTE: 30,

  // Playing from tableau is less valuable (doesn't deplete main piles)
  FROM_TABLEAU: 10,

  // Building on tableaus
  TO_OWN_TABLEAU: 5,
  TO_OPPONENT_TABLEAU: 15, // Can be useful to dump cards

  // Bonuses
  EMPTIES_RESERVE: 200,  // Huge bonus for emptying reserve
  CREATES_EMPTY_TABLEAU: -10, // Slight penalty - empty tableaus less useful in this game
  PLAYS_ACE: 20,  // Aces to foundation open up plays
  PLAYS_TWO: 15,  // Twos follow aces
}

interface ScoredMove {
  move: Move
  score: number
  reasoning: string
}

/**
 * Creates a unique key for a card's position
 */
function cardPositionKey(cardSuit: string, cardRank: number, cardDeck: string, location: PileLocation): string {
  const locKey = location.type === 'foundation'
    ? `f${location.index}`
    : `${location.type}-${location.owner}-${location.index ?? 0}`
  return `${cardSuit}${cardRank}${cardDeck}@${locKey}`
}

/**
 * Scores a single move based on strategic value
 */
function scoreMove(state: GameState, move: Move): ScoredMove {
  let score = 0
  const reasons: string[] = []
  const currentPlayer = state.currentTurn
  const playerState = getPlayerState(state, currentPlayer)

  // Score based on destination
  if (move.to.type === 'foundation') {
    score += SCORE_WEIGHTS.TO_FOUNDATION
    reasons.push('foundation')

    // Bonus for low cards (opens up more plays)
    if (move.card.rank === 1) {
      score += SCORE_WEIGHTS.PLAYS_ACE
      reasons.push('ace')
    } else if (move.card.rank === 2) {
      score += SCORE_WEIGHTS.PLAYS_TWO
      reasons.push('two')
    }
  } else if (move.to.type === 'reserve' && move.to.owner !== currentPlayer) {
    score += SCORE_WEIGHTS.ATTACK_RESERVE
    reasons.push('attack-reserve')
  } else if (move.to.type === 'waste' && move.to.owner !== currentPlayer) {
    score += SCORE_WEIGHTS.ATTACK_WASTE
    reasons.push('attack-waste')
  } else if (move.to.type === 'tableau') {
    if (move.to.owner === currentPlayer) {
      score += SCORE_WEIGHTS.TO_OWN_TABLEAU
      reasons.push('own-tableau')
    } else {
      score += SCORE_WEIGHTS.TO_OPPONENT_TABLEAU
      reasons.push('opponent-tableau')
    }
  }

  // Score based on source
  if (move.from.type === 'reserve') {
    score += SCORE_WEIGHTS.FROM_RESERVE
    reasons.push('from-reserve')

    // Huge bonus if this empties the reserve
    if (playerState.reserve.length === 1) {
      score += SCORE_WEIGHTS.EMPTIES_RESERVE
      reasons.push('empties-reserve!')
    }
  } else if (move.from.type === 'waste') {
    score += SCORE_WEIGHTS.FROM_WASTE
    reasons.push('from-waste')
  } else if (move.from.type === 'tableau') {
    score += SCORE_WEIGHTS.FROM_TABLEAU
    reasons.push('from-tableau')

    // Check if this creates an empty tableau
    const fromOwner = move.from.owner
    if (fromOwner) {
      const fromState = getPlayerState(state, fromOwner)
      const pile = fromState.tableau[move.from.index ?? 0]
      if (pile && pile.length === 1) {
        score += SCORE_WEIGHTS.CREATES_EMPTY_TABLEAU
        reasons.push('empties-tableau')
      }
    }
  }

  return {
    move,
    score,
    reasoning: reasons.join(', '),
  }
}

/**
 * Gets all valid moves scored and sorted by desirability,
 * filtering out moves that would create cycles (unless we must play a drawn card)
 */
function getScoredMoves(state: GameState, seenPositions: Set<string>): ScoredMove[] {
  const moves = getValidMoves(state)

  // If there's a drawn card that must be played, don't filter by cycle detection
  // The player MUST play this card, even if it revisits a position
  const shouldFilterCycles = !state.drawnCard

  const filteredMoves = shouldFilterCycles
    ? moves.filter(move => {
        const destKey = cardPositionKey(move.card.suit, move.card.rank, move.card.deck, move.to)
        return !seenPositions.has(destKey)
      })
    : moves

  const scored = filteredMoves.map(move => scoreMove(state, move))

  // Sort by score descending (best moves first)
  scored.sort((a, b) => b.score - a.score)

  return scored
}

export interface AIDecision {
  type: 'move' | 'draw'
  move?: Move
  reasoning: string
}

/**
 * Simple heuristic AI that picks the highest-scoring valid move.
 * If no moves available, draws from hand.
 */
function getAIDecision(state: GameState, seenPositions: Set<string>): AIDecision {
  // If game is over, no decision needed
  if (state.winner || state.turnPhase === 'ended') {
    return { type: 'draw', reasoning: 'game-over' }
  }

  const scoredMoves = getScoredMoves(state, seenPositions)
  const best = scoredMoves[0]

  if (best) {
    return {
      type: 'move',
      move: best.move,
      reasoning: `${best.reasoning} (score: ${best.score})`,
    }
  }

  // No moves available, must draw
  return { type: 'draw', reasoning: 'no-moves-available' }
}

/**
 * Records the current position of all accessible cards
 */
function recordCardPositions(state: GameState, player: 'player1' | 'player2', positions: Set<string>): void {
  const playerState = getPlayerState(state, player)

  // Top of reserve
  const reserveTop = playerState.reserve[playerState.reserve.length - 1]
  if (reserveTop) {
    positions.add(cardPositionKey(reserveTop.suit, reserveTop.rank, reserveTop.deck, { type: 'reserve', owner: player }))
  }

  // Top of waste
  const wasteTop = playerState.waste[playerState.waste.length - 1]
  if (wasteTop) {
    positions.add(cardPositionKey(wasteTop.suit, wasteTop.rank, wasteTop.deck, { type: 'waste', owner: player }))
  }

  // Top of each tableau
  for (let i = 0; i < playerState.tableau.length; i++) {
    const pile = playerState.tableau[i]
    const top = pile?.[pile.length - 1]
    if (top) {
      positions.add(cardPositionKey(top.suit, top.rank, top.deck, { type: 'tableau', owner: player, index: i }))
    }
  }
}

export interface AITurnStep {
  state: GameState
  decision: AIDecision
}

/**
 * Computes all moves for an AI turn upfront.
 * Returns an array of states and decisions that can be played back.
 */
export function computeAITurn(initialState: GameState): AITurnStep[] {
  const steps: AITurnStep[] = []
  let state = initialState
  const aiPlayer = initialState.currentTurn

  // Track positions cards have been at this turn to prevent cycles
  const seenPositions = new Set<string>()

  // Record initial positions
  recordCardPositions(state, 'player1', seenPositions)
  recordCardPositions(state, 'player2', seenPositions)

  const MAX_MOVES_PER_TURN = 100
  let moveCount = 0

  while (moveCount < MAX_MOVES_PER_TURN) {
    // Check if it's still our turn
    if (state.currentTurn !== aiPlayer) {
      break
    }

    // Check if game ended
    if (state.winner || state.turnPhase === 'ended') {
      break
    }

    const decision = getAIDecision(state, seenPositions)

    if (decision.type === 'move' && decision.move) {
      const result = applyMove(state, decision.move)
      if (result.valid && result.newState) {
        state = result.newState
        moveCount++

        // Record new positions after the move
        recordCardPositions(state, 'player1', seenPositions)
        recordCardPositions(state, 'player2', seenPositions)

        steps.push({ state, decision })
      } else {
        // Move failed unexpectedly, draw instead
        const drawResult = drawFromHand(state)
        if (drawResult.valid && drawResult.newState) {
          state = drawResult.newState
          steps.push({ state, decision: { type: 'draw', reasoning: 'move-failed-fallback' } })

          if (drawResult.turnEnded) {
            break
          }
          // After draw, record new positions
          recordCardPositions(state, 'player1', seenPositions)
          recordCardPositions(state, 'player2', seenPositions)
        } else {
          break
        }
      }
    } else {
      // Draw from hand
      const drawResult = drawFromHand(state)
      if (drawResult.valid && drawResult.newState) {
        state = drawResult.newState
        steps.push({ state, decision })

        if (drawResult.turnEnded) {
          break
        }
        // After draw, record new positions (new card from waste is now accessible)
        recordCardPositions(state, 'player1', seenPositions)
        recordCardPositions(state, 'player2', seenPositions)
      } else {
        // Can't draw - turn must end
        break
      }
    }
  }

  return steps
}

// Keep old exports for compatibility, but they now use the new implementation
export interface AITurnResult {
  finalState: GameState
  moves: AITurnStep[]
  turnEnded: boolean
}

export function playAITurn(initialState: GameState): AITurnResult {
  const steps = computeAITurn(initialState)
  const lastStep = steps[steps.length - 1]

  return {
    finalState: lastStep?.state ?? initialState,
    moves: steps,
    turnEnded: lastStep ? lastStep.state.currentTurn !== initialState.currentTurn : false,
  }
}

// Deprecated - use computeAITurn instead
export function* getAIMoves(initialState: GameState): Generator<{
  state: GameState
  decision: AIDecision
  turnEnded: boolean
}> {
  const steps = computeAITurn(initialState)
  const aiPlayer = initialState.currentTurn

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (!step) continue
    const isLast = i === steps.length - 1
    const turnEnded = isLast && step.state.currentTurn !== aiPlayer
    yield { state: step.state, decision: step.decision, turnEnded }
  }
}

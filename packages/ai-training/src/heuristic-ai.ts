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
export interface ScoreWeights {
  // Playing to foundation is always good - removes cards permanently
  TO_FOUNDATION: number

  // Attacking opponent blocks their progress
  ATTACK_RESERVE: number  // Blocking their main card source is very valuable
  ATTACK_WASTE: number

  // Playing from reserve/waste depletes our piles (closer to winning)
  FROM_RESERVE: number
  FROM_WASTE: number

  // Playing from tableau is less valuable (doesn't deplete main piles)
  FROM_TABLEAU: number

  // Building on tableaus
  TO_OWN_TABLEAU: number
  TO_OPPONENT_TABLEAU: number // Can be useful to dump cards

  // Bonuses
  EMPTIES_RESERVE: number  // Huge bonus for emptying reserve
  CREATES_EMPTY_TABLEAU: number // Slight penalty - empty tableaus less useful in this game
  PLAYS_ACE: number  // Aces to foundation open up plays
  PLAYS_TWO: number  // Twos follow aces
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  TO_FOUNDATION: 50,  // Lowered from 100 - AI plays better with more flexibility
  ATTACK_RESERVE: 40,  // Lowered from 80 - less aggressive attacking
  ATTACK_WASTE: 18,  // Lowered from 70 -> 35 -> 18 - much less aggressive on waste
  FROM_RESERVE: 50,
  FROM_WASTE: 30,
  FROM_TABLEAU: 5,  // Lowered from 10 - deprioritize tableau moves, focus on reserve/waste
  TO_OWN_TABLEAU: 5,
  TO_OPPONENT_TABLEAU: 15,
  EMPTIES_RESERVE: 200,
  CREATES_EMPTY_TABLEAU: -20,  // Lowered from -10 - avoid empty tableaus more
  PLAYS_ACE: 10,  // Lowered from 20 - don't over-prioritize aces
  PLAYS_TWO: 15,
}

/**
 * Configuration for AI exploration behavior
 */
export interface AIConfig {
  /** Base probability of picking a random move instead of the best (0-1). Default: 0.05 */
  explorationRate: number
  /** Penalty applied to tableau-to-tableau moves when they seem like shuffling. Default: 50 */
  shufflePenalty: number
  /** Number of recent moves to track for pattern detection. Default: 10 */
  patternMemory: number
  /** How many moves ahead to look for foundation plays. 0 = disabled. Default: 2 */
  lookAheadDepth: number
  /** Bonus per foundation move found in look-ahead. Default: 30 */
  lookAheadFoundationBonus: number
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  explorationRate: 0.05,
  shufflePenalty: 50,
  patternMemory: 10,
  lookAheadDepth: 2,
  lookAheadFoundationBonus: 30,
}

interface ScoredMove {
  move: Move
  score: number
  reasoning: string
}

/**
 * Creates a key representing a move pattern (for detecting shuffling)
 */
function movePatternKey(move: Move): string {
  return `${move.from.type}:${move.from.owner ?? ''}:${move.from.index ?? ''}->${move.to.type}:${move.to.owner ?? ''}:${move.to.index ?? ''}`
}

/**
 * Checks if a move looks like tableau shuffling
 */
function isTableauShuffle(move: Move): boolean {
  return move.from.type === 'tableau' && move.to.type === 'tableau'
}

/**
 * Look ahead after a move to count how many foundation plays become available.
 * Returns the number of foundation moves found within the look-ahead depth.
 */
function countFoundationMovesAhead(
  state: GameState,
  move: Move,
  depth: number
): number {
  if (depth <= 0) return 0

  // Simulate applying the move
  const result = applyMove(state, move)
  if (!result.valid || !result.newState) return 0

  const newState = result.newState

  // Get all valid moves in the new state
  const nextMoves = getValidMoves(newState)

  // Count foundation moves
  let foundationMoves = 0
  for (const nextMove of nextMoves) {
    if (nextMove.to.type === 'foundation') {
      foundationMoves++
    }
  }

  // If we have more depth, recursively look ahead from the best non-foundation moves
  if (depth > 1 && nextMoves.length > 0) {
    // Just check the first few moves to avoid exponential blowup
    const movesToCheck = nextMoves.slice(0, 3)
    for (const nextMove of movesToCheck) {
      foundationMoves += countFoundationMovesAhead(newState, nextMove, depth - 1)
    }
  }

  return foundationMoves
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
function scoreMove(state: GameState, move: Move, weights: ScoreWeights): ScoredMove {
  let score = 0
  const reasons: string[] = []
  const currentPlayer = state.currentTurn
  const playerState = getPlayerState(state, currentPlayer)

  // Score based on destination
  if (move.to.type === 'foundation') {
    score += weights.TO_FOUNDATION
    reasons.push('foundation')

    // Bonus for low cards (opens up more plays)
    if (move.card.rank === 1) {
      score += weights.PLAYS_ACE
      reasons.push('ace')
    } else if (move.card.rank === 2) {
      score += weights.PLAYS_TWO
      reasons.push('two')
    }
  } else if (move.to.type === 'reserve' && move.to.owner !== currentPlayer) {
    score += weights.ATTACK_RESERVE
    reasons.push('attack-reserve')
  } else if (move.to.type === 'waste' && move.to.owner !== currentPlayer) {
    score += weights.ATTACK_WASTE
    reasons.push('attack-waste')
  } else if (move.to.type === 'tableau') {
    if (move.to.owner === currentPlayer) {
      score += weights.TO_OWN_TABLEAU
      reasons.push('own-tableau')
    } else {
      score += weights.TO_OPPONENT_TABLEAU
      reasons.push('opponent-tableau')
    }
  }

  // Score based on source
  if (move.from.type === 'reserve') {
    score += weights.FROM_RESERVE
    reasons.push('from-reserve')

    // Huge bonus if this empties the reserve
    if (playerState.reserve.length === 1) {
      score += weights.EMPTIES_RESERVE
      reasons.push('empties-reserve!')
    }
  } else if (move.from.type === 'waste') {
    score += weights.FROM_WASTE
    reasons.push('from-waste')
  } else if (move.from.type === 'tableau') {
    score += weights.FROM_TABLEAU
    reasons.push('from-tableau')

    // Check if this creates an empty tableau
    const fromOwner = move.from.owner
    if (fromOwner) {
      const fromState = getPlayerState(state, fromOwner)
      const pile = fromState.tableau[move.from.index ?? 0]
      if (pile && pile.length === 1) {
        score += weights.CREATES_EMPTY_TABLEAU
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
function getScoredMoves(
  state: GameState,
  seenPositions: Set<string>,
  weights: ScoreWeights,
  config: AIConfig,
  recentMoves: string[]
): ScoredMove[] {
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

  const scored = filteredMoves.map(move => {
    const base = scoreMove(state, move, weights)

    // Apply shuffle penalty if this looks like repeated tableau shuffling
    if (isTableauShuffle(move)) {
      const pattern = movePatternKey(move)
      const patternCount = recentMoves.filter(p => p === pattern).length
      if (patternCount > 0) {
        base.score -= config.shufflePenalty * patternCount
        base.reasoning += `, shuffle-penalty:${patternCount}`
      }
    }

    // Look-ahead: bonus for moves that enable foundation plays
    if (config.lookAheadDepth > 0 && move.to.type !== 'foundation') {
      const futureFoundationMoves = countFoundationMovesAhead(state, move, config.lookAheadDepth)
      if (futureFoundationMoves > 0) {
        const bonus = futureFoundationMoves * config.lookAheadFoundationBonus
        base.score += bonus
        base.reasoning += `, look-ahead:+${futureFoundationMoves}f`
      }
    }

    return base
  })

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
 * With exploration, occasionally picks a random move instead.
 */
function getAIDecision(
  state: GameState,
  seenPositions: Set<string>,
  weights: ScoreWeights,
  config: AIConfig,
  recentMoves: string[],
  rng: () => number
): AIDecision {
  // If game is over, no decision needed
  if (state.winner || state.turnPhase === 'ended') {
    return { type: 'draw', reasoning: 'game-over' }
  }

  const scoredMoves = getScoredMoves(state, seenPositions, weights, config, recentMoves)

  if (scoredMoves.length === 0) {
    // No moves available, must draw
    return { type: 'draw', reasoning: 'no-moves-available' }
  }

  // Exploration: occasionally pick a random move
  if (rng() < config.explorationRate && scoredMoves.length > 1) {
    const randomIndex = Math.floor(rng() * scoredMoves.length)
    const chosen = scoredMoves[randomIndex]!
    return {
      type: 'move',
      move: chosen.move,
      reasoning: `${chosen.reasoning} (score: ${chosen.score}, explored)`,
    }
  }

  // Pick the best move
  const best = scoredMoves[0]!
  return {
    type: 'move',
    move: best.move,
    reasoning: `${best.reasoning} (score: ${best.score})`,
  }
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
 * Simple seeded random number generator
 */
function createRng(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
}

/**
 * Computes all moves for an AI turn upfront.
 * Returns an array of states and decisions that can be played back.
 * @param initialState - The game state at the start of the turn
 * @param weights - Optional score weights (defaults to DEFAULT_WEIGHTS)
 * @param config - Optional AI behavior config (defaults to DEFAULT_AI_CONFIG)
 * @param recentGameMoves - Optional recent moves from previous turns (for pattern detection across turns)
 */
export function computeAITurn(
  initialState: GameState,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
  config: AIConfig = DEFAULT_AI_CONFIG,
  recentGameMoves: string[] = []
): AITurnStep[] {
  const steps: AITurnStep[] = []
  let state = initialState
  const aiPlayer = initialState.currentTurn

  // Create RNG seeded from game state for reproducibility
  const rng = createRng(state.seed + state.moveCount)

  // Track positions cards have been at this turn to prevent cycles
  const seenPositions = new Set<string>()

  // Track recent moves for pattern detection (include moves from previous turns)
  const recentMoves = [...recentGameMoves]

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

    const decision = getAIDecision(state, seenPositions, weights, config, recentMoves, rng)

    if (decision.type === 'move' && decision.move) {
      const result = applyMove(state, decision.move)
      if (result.valid && result.newState) {
        state = result.newState
        moveCount++

        // Track this move pattern
        const pattern = movePatternKey(decision.move)
        recentMoves.push(pattern)
        // Keep only recent moves based on config
        while (recentMoves.length > config.patternMemory) {
          recentMoves.shift()
        }

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

export function playAITurn(
  initialState: GameState,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
  config: AIConfig = DEFAULT_AI_CONFIG,
  recentGameMoves: string[] = []
): AITurnResult {
  const steps = computeAITurn(initialState, weights, config, recentGameMoves)
  const lastStep = steps[steps.length - 1]

  return {
    finalState: lastStep?.state ?? initialState,
    moves: steps,
    turnEnded: lastStep ? lastStep.state.currentTurn !== initialState.currentTurn : false,
  }
}

// Deprecated - use computeAITurn instead
export function* getAIMoves(
  initialState: GameState,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
  config: AIConfig = DEFAULT_AI_CONFIG
): Generator<{
  state: GameState
  decision: AIDecision
  turnEnded: boolean
}> {
  const steps = computeAITurn(initialState, weights, config)
  const aiPlayer = initialState.currentTurn

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (!step) continue
    const isLast = i === steps.length - 1
    const turnEnded = isLast && step.state.currentTurn !== aiPlayer
    yield { state: step.state, decision: step.decision, turnEnded }
  }
}

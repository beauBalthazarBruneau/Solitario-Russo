import {
  type GameState,
  type Move,
  type PileLocation,
  getValidMoves,
  applyMove,
  drawFromHand,
  getPlayerState,
  getOpponent,
  canPlayOnFoundation,
  canPlayOnOpponentPile,
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

  // Penalties for pointless moves
  POINTLESS_TABLEAU_SHUFFLE: number // Heavy penalty for moving single card between empty tableaus
  TABLEAU_MOVE_NO_BENEFIT: number   // Penalty for tableau-to-tableau that doesn't expose useful card
  CREATES_USEFUL_EMPTY: number      // Bonus for emptying a tableau by moving to non-empty tableau

  // Stack consolidation
  DRAW_AVOIDANCE_EMPTY_BONUS: number // Bonus for playing empty-creating move instead of drawing
  STACK_HEIGHT_BONUS: number         // Per-unit bonus for increasing max tableau stack height
  SPREAD_PENALTY: number             // Penalty for spreading cards across more tableau piles
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  TO_FOUNDATION: 56,   // Evolved from 50 - slightly higher foundation priority
  ATTACK_RESERVE: 63,  // Evolved from 40 - much more aggressive reserve blocking
  ATTACK_WASTE: 8,     // Evolved from 18 - mostly ignore opponent waste
  FROM_RESERVE: 21,    // Evolved from 50 - less eager to play from reserve
  FROM_WASTE: 24,      // Evolved from 30 - slightly less waste priority
  FROM_TABLEAU: 5,
  TO_OWN_TABLEAU: 24,        // Evolved from 5 - much more willing to build on own tableau
  TO_OPPONENT_TABLEAU: 24,   // Evolved from 15 - more willing to dump on opponent
  EMPTIES_RESERVE: 118,      // Evolved from 200 - less obsessed with emptying reserve
  CREATES_EMPTY_TABLEAU: -8, // Evolved from -20 - less penalty for empty tableaus
  PLAYS_ACE: 0,              // Evolved from 10 - no special ace priority
  PLAYS_TWO: 24,             // Evolved from 15 - higher two priority
  POINTLESS_TABLEAU_SHUFFLE: -43,  // Evolved from -200 - less afraid of shuffling
  TABLEAU_MOVE_NO_BENEFIT: -80,    // Evolved from -50 - stricter about bad tableau moves
  CREATES_USEFUL_EMPTY: 54,        // Evolved from 25 - doubled emphasis on useful empties
  DRAW_AVOIDANCE_EMPTY_BONUS: 40,
  STACK_HEIGHT_BONUS: 8,
  SPREAD_PENALTY: -15,
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
  /** How many moves ahead to look for foundation plays. 0 = disabled. Default: 3 */
  lookAheadDepth: number
  /** Bonus per foundation move found in look-ahead. Default: 30 */
  lookAheadFoundationBonus: number
  /** Bonus per empty-creating move found in look-ahead. Default: 20 */
  lookAheadEmptyBonus: number
  /** Bonus per attack move found in look-ahead. Default: 15 */
  lookAheadAttackBonus: number
  /** Number of branches to explore at each look-ahead level. Default: 4 */
  lookAheadBranchFactor: number
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  explorationRate: 0.05,
  shufflePenalty: 50,
  patternMemory: 10,
  lookAheadDepth: 3,
  lookAheadFoundationBonus: 30,
  lookAheadEmptyBonus: 20,
  lookAheadAttackBonus: 15,
  lookAheadBranchFactor: 4,
}

/**
 * A named bot profile with its own weights and config.
 */
export interface BotProfile {
  id: string
  name: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  weights: ScoreWeights
  config: AIConfig
}

/** Hand-tuned v1 weights (before any training). */
const ORIGINAL_WEIGHTS: ScoreWeights = {
  TO_FOUNDATION: 50,
  ATTACK_RESERVE: 40,
  ATTACK_WASTE: 18,
  FROM_RESERVE: 50,
  FROM_WASTE: 30,
  FROM_TABLEAU: 5,
  TO_OWN_TABLEAU: 5,
  TO_OPPONENT_TABLEAU: 15,
  EMPTIES_RESERVE: 200,
  CREATES_EMPTY_TABLEAU: -20,
  PLAYS_ACE: 10,
  PLAYS_TWO: 15,
  POINTLESS_TABLEAU_SHUFFLE: -200,
  TABLEAU_MOVE_NO_BENEFIT: -50,
  CREATES_USEFUL_EMPTY: 25,
  DRAW_AVOIDANCE_EMPTY_BONUS: 0,
  STACK_HEIGHT_BONUS: 0,
  SPREAD_PENALTY: 0,
}

const ORIGINAL_CONFIG: AIConfig = {
  explorationRate: 0.05,
  shufflePenalty: 50,
  patternMemory: 10,
  lookAheadDepth: 2,
  lookAheadFoundationBonus: 30,
  lookAheadEmptyBonus: 0,
  lookAheadAttackBonus: 0,
  lookAheadBranchFactor: 3,
}

/** Overnight-trained v2 weights (82% win rate vs Original). */
const EVOLVED_WEIGHTS: ScoreWeights = {
  TO_FOUNDATION: 56,
  ATTACK_RESERVE: 63,
  ATTACK_WASTE: 8,
  FROM_RESERVE: 21,
  FROM_WASTE: 24,
  FROM_TABLEAU: 5,
  TO_OWN_TABLEAU: 24,
  TO_OPPONENT_TABLEAU: 24,
  EMPTIES_RESERVE: 118,
  CREATES_EMPTY_TABLEAU: -8,
  PLAYS_ACE: 0,
  PLAYS_TWO: 24,
  POINTLESS_TABLEAU_SHUFFLE: -43,
  TABLEAU_MOVE_NO_BENEFIT: -80,
  CREATES_USEFUL_EMPTY: 54,
  DRAW_AVOIDANCE_EMPTY_BONUS: 0,
  STACK_HEIGHT_BONUS: 0,
  SPREAD_PENALTY: 0,
}

const EVOLVED_CONFIG: AIConfig = {
  explorationRate: 0.05,
  shufflePenalty: 50,
  patternMemory: 10,
  lookAheadDepth: 2,
  lookAheadFoundationBonus: 30,
  lookAheadEmptyBonus: 0,
  lookAheadAttackBonus: 0,
  lookAheadBranchFactor: 3,
}

/** All available bot profiles, newest first. */
export const BOT_PROFILES: BotProfile[] = [
  {
    id: 'cali',
    name: 'Cali',
    difficulty: 'Hard',
    weights: DEFAULT_WEIGHTS,
    config: DEFAULT_AI_CONFIG,
  },
  {
    id: 'bobbi-shmurda',
    name: 'Bobbi Shmurda',
    difficulty: 'Medium',
    weights: EVOLVED_WEIGHTS,
    config: EVOLVED_CONFIG,
  },
  {
    id: 'alpha-bo',
    name: 'Alpha-Bo',
    difficulty: 'Easy',
    weights: ORIGINAL_WEIGHTS,
    config: ORIGINAL_CONFIG,
  },
]

export const DEFAULT_BOT_PROFILE: BotProfile = BOT_PROFILES[0]!

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
 * Finds tableau-to-tableau moves where the source pile has exactly 1 card
 * and the destination pile is non-empty (i.e. consolidation moves that create
 * an empty tableau slot).
 */
function findEmptyCreatingMoves(state: GameState): Move[] {
  const moves = getValidMoves(state)
  const currentPlayer = state.currentTurn
  return moves.filter(move => {
    if (move.from.type !== 'tableau' || move.to.type !== 'tableau') return false
    const fromOwner = move.from.owner
    if (!fromOwner) return false
    const fromState = getPlayerState(state, fromOwner)
    const fromPile = fromState.tableau[move.from.index ?? 0]
    if (!fromPile || fromPile.length !== 1) return false
    const toOwner = move.to.owner
    if (!toOwner) return false
    const toState = getPlayerState(state, toOwner)
    const toPile = toState.tableau[move.to.index ?? 0]
    return toPile != null && toPile.length > 0
  })
}

interface LookAheadResult {
  foundationMoves: number
  emptyCreatingMoves: number
  attackMoves: number
}

/**
 * Checks whether a move is an empty-creating tableau consolidation.
 */
function isEmptyCreatingMove(state: GameState, move: Move): boolean {
  if (move.from.type !== 'tableau' || move.to.type !== 'tableau') return false
  const fromOwner = move.from.owner
  const toOwner = move.to.owner
  if (!fromOwner || !toOwner) return false
  const fromPile = getPlayerState(state, fromOwner).tableau[move.from.index ?? 0]
  if (!fromPile || fromPile.length !== 1) return false
  const toPile = getPlayerState(state, toOwner).tableau[move.to.index ?? 0]
  return toPile != null && toPile.length > 0
}

/**
 * Checks whether a move attacks the opponent (plays onto their reserve or waste).
 */
function isAttackMove(state: GameState, move: Move): boolean {
  const currentPlayer = state.currentTurn
  return (
    (move.to.type === 'reserve' && move.to.owner !== currentPlayer) ||
    (move.to.type === 'waste' && move.to.owner !== currentPlayer)
  )
}

/**
 * Look ahead after a move to evaluate how many valuable plays become available.
 * Returns counts of foundation, empty-creating, and attack moves found within depth.
 * A 50% discount is applied per depth level to favor near-term opportunities.
 */
function evaluateLookAhead(
  state: GameState,
  move: Move,
  depth: number,
  branchFactor: number
): LookAheadResult {
  if (depth <= 0) return { foundationMoves: 0, emptyCreatingMoves: 0, attackMoves: 0 }

  const result = applyMove(state, move)
  if (!result.valid || !result.newState) return { foundationMoves: 0, emptyCreatingMoves: 0, attackMoves: 0 }

  const newState = result.newState
  const nextMoves = getValidMoves(newState)

  let foundationMoves = 0
  let emptyCreatingMoves = 0
  let attackMoves = 0

  for (const nextMove of nextMoves) {
    if (nextMove.to.type === 'foundation') foundationMoves++
    if (isEmptyCreatingMove(newState, nextMove)) emptyCreatingMoves++
    if (isAttackMove(newState, nextMove)) attackMoves++
  }

  // Recurse deeper: prioritise foundation and attack moves when selecting branches
  if (depth > 1 && nextMoves.length > 0) {
    // Sort branches: foundation first, then attack, then the rest
    const sorted = [...nextMoves].sort((a, b) => {
      const aScore = (a.to.type === 'foundation' ? 2 : 0) + (isAttackMove(newState, a) ? 1 : 0)
      const bScore = (b.to.type === 'foundation' ? 2 : 0) + (isAttackMove(newState, b) ? 1 : 0)
      return bScore - aScore
    })
    const movesToCheck = sorted.slice(0, branchFactor)
    for (const nextMove of movesToCheck) {
      const deeper = evaluateLookAhead(newState, nextMove, depth - 1, branchFactor)
      // 50% discount per depth level
      foundationMoves += deeper.foundationMoves * 0.5
      emptyCreatingMoves += deeper.emptyCreatingMoves * 0.5
      attackMoves += deeper.attackMoves * 0.5
    }
  }

  return { foundationMoves, emptyCreatingMoves, attackMoves }
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
 * Builds a string key representing the full board state.
 * Used to detect multi-move cycles that individual card position tracking misses.
 */
function hashGameState(state: GameState): string {
  const parts: string[] = []
  for (const player of ['player1', 'player2'] as const) {
    const ps = getPlayerState(state, player)
    parts.push(ps.reserve.map(c => `${c.suit}${c.rank}${c.deck}`).join(','))
    parts.push(ps.waste.map(c => `${c.suit}${c.rank}${c.deck}`).join(','))
    for (const pile of ps.tableau) {
      parts.push(pile.map(c => `${c.suit}${c.rank}${c.deck}`).join(','))
    }
  }
  for (const pile of state.foundations) {
    parts.push(pile.map(c => `${c.suit}${c.rank}${c.deck}`).join(','))
  }
  // Include per-player drawn cards in hash
  for (const player of ['player1', 'player2'] as const) {
    const ps = getPlayerState(state, player)
    if (ps.drawnCard) {
      parts.push(`dc${player}:${ps.drawnCard.suit}${ps.drawnCard.rank}${ps.drawnCard.deck}`)
    }
  }
  return parts.join('|')
}

/**
 * Computes metrics about a player's tableau piles:
 * maxHeight = tallest pile's card count, occupiedCount = number of non-empty piles.
 */
function computeTableauStackMetrics(state: GameState, player: 'player1' | 'player2'): { maxHeight: number; occupiedCount: number } {
  const ps = getPlayerState(state, player)
  let maxHeight = 0
  let occupiedCount = 0
  for (const pile of ps.tableau) {
    if (pile.length > 0) {
      occupiedCount++
      if (pile.length > maxHeight) maxHeight = pile.length
    }
  }
  return { maxHeight, occupiedCount }
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
  } else if (move.from.type === 'waste' || move.from.type === 'drawn') {
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
        // Moving single card - check if it's to a tableau
        if (move.to.type === 'tableau' && move.to.owner) {
          const toState = getPlayerState(state, move.to.owner)
          const toPile = toState.tableau[move.to.index ?? 0]
          if (toPile && toPile.length === 0) {
            // Moving to empty tableau = pointless shuffling
            score += weights.POINTLESS_TABLEAU_SHUFFLE
            reasons.push('pointless-shuffle!')
          } else {
            // Moving to non-empty tableau = creates useful empty spot
            score += weights.CREATES_USEFUL_EMPTY
            reasons.push('creates-empty-spot')
          }
        } else {
          // Moving to foundation or attack - emptying tableau is neutral
          score += weights.CREATES_EMPTY_TABLEAU
          reasons.push('empties-tableau')
        }
      } else if (pile && pile.length > 1 && move.to.type === 'tableau') {
        // Tableau-to-tableau move with cards underneath - check if exposed card is useful
        const exposedCard = pile[pile.length - 2]
        if (exposedCard) {
          const opponent = getOpponent(currentPlayer)
          const opponentState = getPlayerState(state, opponent)
          let exposedCardIsUseful = false

          // Check if exposed card can go to foundation
          for (let i = 0; i < state.foundations.length; i++) {
            const foundationPile = state.foundations[i]
            if (foundationPile && canPlayOnFoundation(exposedCard, foundationPile, i)) {
              exposedCardIsUseful = true
              break
            }
          }

          // Check if exposed card can attack opponent
          if (!exposedCardIsUseful) {
            if (canPlayOnOpponentPile(exposedCard, opponentState.waste) ||
                canPlayOnOpponentPile(exposedCard, opponentState.reserve)) {
              exposedCardIsUseful = true
            }
          }

          if (!exposedCardIsUseful) {
            score += weights.TABLEAU_MOVE_NO_BENEFIT
            reasons.push('no-benefit')
          }
        }
      }
    }
  }

  // Stack consolidation scoring for moves targeting own tableau
  if (move.to.type === 'tableau' && move.to.owner === currentPlayer) {
    const before = computeTableauStackMetrics(state, currentPlayer)

    // Simulate the move to measure metrics after
    const simResult = applyMove(state, move)
    if (simResult.valid && simResult.newState) {
      const after = computeTableauStackMetrics(simResult.newState, currentPlayer)

      // Reward increasing max stack height (consolidation)
      const heightDelta = after.maxHeight - before.maxHeight
      if (heightDelta > 0) {
        score += weights.STACK_HEIGHT_BONUS * heightDelta
        reasons.push(`stack-height:+${heightDelta}`)
      }

      // Penalise spreading cards across more piles; reward consolidation
      const spreadDelta = after.occupiedCount - before.occupiedCount
      if (spreadDelta > 0) {
        score += weights.SPREAD_PENALTY * spreadDelta
        reasons.push('spread')
      } else if (spreadDelta < 0) {
        // Reverse: bonus for reducing occupied count
        score += -weights.SPREAD_PENALTY * -spreadDelta
        reasons.push('consolidate')
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
  seenStates: Set<string>,
  weights: ScoreWeights,
  config: AIConfig,
  recentMoves: string[]
): ScoredMove[] {
  const moves = getValidMoves(state)

  // If there's a drawn card that must be played, don't filter by cycle detection
  // The player MUST play this card, even if it revisits a position
  const currentPlayerState = getPlayerState(state, state.currentTurn)
  const shouldFilterCycles = !currentPlayerState.drawnCard

  const cycleFiltered = shouldFilterCycles
    ? moves.filter(move => {
        const destKey = cardPositionKey(move.card.suit, move.card.rank, move.card.deck, move.to)
        return !seenPositions.has(destKey)
      })
    : moves

  // Filter out pointless empty-to-empty tableau shuffles (moving the only card
  // from a tableau to an empty tableau just swaps which pile is empty)
  const currentPlayer = state.currentTurn
  const filteredMoves = cycleFiltered.filter(move => {
    if (move.from.type !== 'tableau' || move.to.type !== 'tableau') return true
    const fromOwner = move.from.owner
    if (!fromOwner) return true
    const fromState = getPlayerState(state, fromOwner)
    const sourcePile = fromState.tableau[move.from.index ?? 0]
    if (!sourcePile || sourcePile.length !== 1) return true
    const toOwner = move.to.owner
    if (!toOwner) return true
    const toState = getPlayerState(state, toOwner)
    const destPile = toState.tableau[move.to.index ?? 0]
    return !destPile || destPile.length > 0
  })

  // Filter out moves that produce a board state we've already seen
  const stateFiltered = shouldFilterCycles
    ? filteredMoves.filter(move => {
        const result = applyMove(state, move)
        if (!result.valid || !result.newState) return false
        return !seenStates.has(hashGameState(result.newState))
      })
    : filteredMoves

  const scored = stateFiltered.map(move => {
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

    // Look-ahead: bonus for moves that enable valuable future plays
    if (config.lookAheadDepth > 0 && move.to.type !== 'foundation') {
      const ahead = evaluateLookAhead(state, move, config.lookAheadDepth, config.lookAheadBranchFactor)
      let lookAheadBonus = 0
      const parts: string[] = []
      if (ahead.foundationMoves > 0) {
        lookAheadBonus += ahead.foundationMoves * config.lookAheadFoundationBonus
        parts.push(`${Math.round(ahead.foundationMoves * 10) / 10}f`)
      }
      if (ahead.emptyCreatingMoves > 0) {
        lookAheadBonus += ahead.emptyCreatingMoves * config.lookAheadEmptyBonus
        parts.push(`${Math.round(ahead.emptyCreatingMoves * 10) / 10}e`)
      }
      if (ahead.attackMoves > 0) {
        lookAheadBonus += ahead.attackMoves * config.lookAheadAttackBonus
        parts.push(`${Math.round(ahead.attackMoves * 10) / 10}a`)
      }
      if (lookAheadBonus > 0) {
        base.score += lookAheadBonus
        base.reasoning += `, look-ahead:+${parts.join('+')}`
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
  seenStates: Set<string>,
  weights: ScoreWeights,
  config: AIConfig,
  recentMoves: string[],
  rng: () => number
): AIDecision {
  // If game is over, no decision needed
  if (state.winner || state.turnPhase === 'ended') {
    return { type: 'draw', reasoning: 'game-over' }
  }

  const scoredMoves = getScoredMoves(state, seenPositions, seenStates, weights, config, recentMoves)

  if (scoredMoves.length === 0) {
    // Before drawing, check if there are empty-creating consolidation moves
    // that the cycle filter may have excluded
    const emptyCreating = findEmptyCreatingMoves(state)
    if (emptyCreating.length > 0) {
      const chosen = emptyCreating[0]!
      return {
        type: 'move',
        move: chosen,
        reasoning: `draw-avoidance-empty (bonus: ${weights.DRAW_AVOIDANCE_EMPTY_BONUS})`,
      }
    }
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

  // Track full board state hashes to prevent multi-move cycles
  const seenStates = new Set<string>()

  // Track recent moves for pattern detection (include moves from previous turns)
  const recentMoves = [...recentGameMoves]

  // Record initial positions and state
  recordCardPositions(state, 'player1', seenPositions)
  recordCardPositions(state, 'player2', seenPositions)
  seenStates.add(hashGameState(state))

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

    const decision = getAIDecision(state, seenPositions, seenStates, weights, config, recentMoves, rng)

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

        // Record new positions and state after the move
        recordCardPositions(state, 'player1', seenPositions)
        recordCardPositions(state, 'player2', seenPositions)
        seenStates.add(hashGameState(state))

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
          // Drawing introduces a new card from the hand, so reset cycle
          // tracking — previously-seen positions/boards are reachable without cycling
          seenPositions.clear()
          seenStates.clear()
          recordCardPositions(state, 'player1', seenPositions)
          recordCardPositions(state, 'player2', seenPositions)
          seenStates.add(hashGameState(state))
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
        // Drawing introduces a new card from the hand, so reset cycle
        // tracking — previously-seen positions/boards are reachable without cycling
        seenPositions.clear()
        seenStates.clear()
        recordCardPositions(state, 'player1', seenPositions)
        recordCardPositions(state, 'player2', seenPositions)
        seenStates.add(hashGameState(state))
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

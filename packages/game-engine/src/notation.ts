import type { Card, Move, PileLocation, Player, Suit, Rank } from './types.js'

const SUIT_CHARS: Record<Suit, string> = {
  hearts: 'H',
  diamonds: 'D',
  clubs: 'C',
  spades: 'S',
}

const CHAR_TO_SUIT: Record<string, Suit> = {
  H: 'hearts',
  D: 'diamonds',
  C: 'clubs',
  S: 'spades',
}

const RANK_CHARS: Record<Rank, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: 'T',
  11: 'J',
  12: 'Q',
  13: 'K',
}

const CHAR_TO_RANK: Record<string, Rank> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
}

const TABLEAU_INDEX_CHARS = ['a', 'b', 'c', 'd'] as const

/**
 * Convert a card to notation string
 * Format: RankSuitDeck (e.g., "5H1" = 5 of Hearts from player 1's deck)
 */
export function cardToNotation(card: Card): string {
  const rank = RANK_CHARS[card.rank]
  const suit = SUIT_CHARS[card.suit]
  const deck = card.deck === 'player1' ? '1' : '2'
  return `${rank}${suit}${deck}`
}

/**
 * Parse a card from notation string
 */
export function notationToCard(notation: string): Card | null {
  if (notation.length < 3) return null

  const rankChar = notation[0]!
  const suitChar = notation[1]!
  const deckChar = notation[2]!

  const rank = CHAR_TO_RANK[rankChar]
  const suit = CHAR_TO_SUIT[suitChar]
  const deck: Player | undefined = deckChar === '1' ? 'player1' : deckChar === '2' ? 'player2' : undefined

  if (!rank || !suit || !deck) return null

  return { rank, suit, deck }
}

/**
 * Convert a pile location to notation string
 * R1/R2 = Reserve, W1/W2 = Waste, H1/H2 = Hand
 * T1a-T1d/T2a-T2d = Tableau, F1-F8 = Foundation
 */
export function pileToNotation(location: PileLocation): string {
  switch (location.type) {
    case 'reserve':
      return `R${location.owner === 'player1' ? '1' : '2'}`
    case 'waste':
      return `W${location.owner === 'player1' ? '1' : '2'}`
    case 'hand':
      return `H${location.owner === 'player1' ? '1' : '2'}`
    case 'tableau': {
      const player = location.owner === 'player1' ? '1' : '2'
      const index = TABLEAU_INDEX_CHARS[location.index ?? 0] ?? 'a'
      return `T${player}${index}`
    }
    case 'drawn':
      return `G${location.owner === 'player1' ? '1' : '2'}`
    case 'foundation':
      return `F${(location.index ?? 0) + 1}`
    default:
      return '??'
  }
}

/**
 * Parse a pile location from notation string
 */
export function notationToPile(notation: string): PileLocation | null {
  if (notation.length < 2) return null

  const type = notation[0]!
  const rest = notation.slice(1)

  switch (type) {
    case 'R':
      return { type: 'reserve', owner: rest === '1' ? 'player1' : 'player2' }
    case 'W':
      return { type: 'waste', owner: rest === '1' ? 'player1' : 'player2' }
    case 'H':
      return { type: 'hand', owner: rest === '1' ? 'player1' : 'player2' }
    case 'T': {
      if (rest.length < 2) return null
      const player: Player = rest[0] === '1' ? 'player1' : 'player2'
      const indexChar = rest[1]!
      const index = TABLEAU_INDEX_CHARS.indexOf(indexChar as typeof TABLEAU_INDEX_CHARS[number])
      if (index === -1) return null
      return { type: 'tableau', owner: player, index }
    }
    case 'G':
      return { type: 'drawn', owner: rest === '1' ? 'player1' : 'player2' }
    case 'F': {
      const index = parseInt(rest, 10) - 1
      if (isNaN(index) || index < 0 || index > 7) return null
      return { type: 'foundation', index }
    }
    default:
      return null
  }
}

/**
 * Convert a move to notation string
 * Format: "Card:From-To" (e.g., "5H1:R1-F3")
 * Draw from hand: "D1" or "D2"
 */
export function moveToNotation(move: Move): string {
  const card = cardToNotation(move.card)
  const from = pileToNotation(move.from)
  const to = pileToNotation(move.to)
  return `${card}:${from}-${to}`
}

/**
 * Notation for drawing from hand
 */
export function drawToNotation(player: Player): string {
  return `D${player === 'player1' ? '1' : '2'}`
}

/**
 * Parse a move from notation string
 */
export function notationToMove(notation: string): Move | null {
  const parts = notation.split(':')
  if (parts.length !== 2) return null

  const cardNotation = parts[0]!
  const locationParts = parts[1]!.split('-')
  if (locationParts.length !== 2) return null

  const card = notationToCard(cardNotation)
  const from = notationToPile(locationParts[0]!)
  const to = notationToPile(locationParts[1]!)

  if (!card || !from || !to) return null

  return { card, from, to }
}

/**
 * Check if notation represents a draw action
 */
export function isDrawNotation(notation: string): Player | null {
  if (notation === 'D1') return 'player1'
  if (notation === 'D2') return 'player2'
  return null
}

/**
 * Format a sequence of moves as a game log
 * Groups moves by turn number
 */
export function formatGameLog(moves: Array<{ notation: string; player: Player }>): string {
  const lines: string[] = []
  let turnNumber = 1
  let currentLine = `${turnNumber}.`
  let lastPlayer: Player | null = null

  for (const { notation, player } of moves) {
    if (lastPlayer !== null && player !== lastPlayer) {
      // Player changed, might be new turn
      if (player === 'player1') {
        lines.push(currentLine)
        turnNumber++
        currentLine = `${turnNumber}.`
      }
    }
    currentLine += ` ${notation}`
    lastPlayer = player
  }

  if (currentLine !== `${turnNumber}.`) {
    lines.push(currentLine)
  }

  return lines.join('\n')
}

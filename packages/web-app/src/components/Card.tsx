import type { Card as CardType } from '@russian-bank/game-engine'
import './Card.css'

interface CardProps {
  card: CardType | null
  faceDown?: boolean
  onClick?: () => void
  selected?: boolean
  validTarget?: boolean
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
}

const RANK_DISPLAY: Record<number, string> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K',
}

export function Card({ card, faceDown = false, onClick, selected, validTarget }: CardProps) {
  if (!card) {
    return (
      <div
        className={`card card--empty ${validTarget ? 'card--valid-target' : ''}`}
        onClick={onClick}
      />
    )
  }

  if (faceDown) {
    return (
      <div
        className={`card card--face-down card--${card.deck}`}
        onClick={onClick}
      />
    )
  }

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds'
  const rankDisplay = RANK_DISPLAY[card.rank] ?? card.rank.toString()
  const suitSymbol = SUIT_SYMBOLS[card.suit]

  return (
    <div
      className={`card card--face-up ${isRed ? 'card--red' : 'card--black'} ${selected ? 'card--selected' : ''} ${validTarget ? 'card--valid-target' : ''}`}
      onClick={onClick}
    >
      <div className="card__corner card__corner--top">
        <span className="card__rank">{rankDisplay}</span>
        <span className="card__suit">{suitSymbol}</span>
      </div>
      <div className="card__center">
        <span className="card__suit card__suit--large">{suitSymbol}</span>
      </div>
      <div className="card__corner card__corner--bottom">
        <span className="card__rank">{rankDisplay}</span>
        <span className="card__suit">{suitSymbol}</span>
      </div>
    </div>
  )
}

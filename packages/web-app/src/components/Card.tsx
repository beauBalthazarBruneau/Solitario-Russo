import type { Card as CardType, Suit, Rank } from '@russian-bank/game-engine'
import './Card.css'

interface CardProps {
  card: CardType | null
  faceDown?: boolean
  onClick?: () => void
  selected?: boolean
  validTarget?: boolean
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
}

const SUIT_CODE: Record<Suit, string> = {
  hearts: 'H',
  diamonds: 'D',
  clubs: 'C',
  spades: 'S',
}

const RANK_CODE: Record<Rank, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
}

function getCardImagePath(card: CardType): string {
  const rank = RANK_CODE[card.rank]
  const suit = SUIT_CODE[card.suit]
  return `/cards/${rank}${suit}.svg`
}

export function Card({
  card,
  faceDown = false,
  onClick,
  selected,
  validTarget,
  draggable = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: CardProps) {
  if (!card) {
    return (
      <div
        className={`card card--empty ${validTarget ? 'card--valid-target' : ''}`}
        onClick={onClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
      />
    )
  }

  if (faceDown) {
    return (
      <div
        className={`card card--face-down card--${card.deck}`}
        onClick={onClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
      />
    )
  }

  return (
    <div
      className={`card card--face-up ${selected ? 'card--selected' : ''} ${validTarget ? 'card--valid-target' : ''}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <img
        src={getCardImagePath(card)}
        alt={`${RANK_CODE[card.rank]} of ${card.suit}`}
        className="card__image"
        draggable={false}
      />
    </div>
  )
}

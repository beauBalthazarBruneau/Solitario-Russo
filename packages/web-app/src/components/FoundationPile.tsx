import type { Card as CardType, PileLocation, Suit } from '@russian-bank/game-engine'
import { Card } from './Card'
import './FoundationPile.css'

interface FoundationPileProps {
  cards: CardType[]
  location: PileLocation
  suit: Suit
  onClick: (location: PileLocation) => void
  isSelected: (location: PileLocation) => boolean
  isValidTarget: (location: PileLocation) => boolean
  onDrop: (location: PileLocation) => void
}

const SUIT_ICONS: Record<Suit, string> = {
  hearts: '/suits/Hearts.svg',
  diamonds: '/suits/Diamonds.svg',
  clubs: '/suits/Clubs.svg',
  spades: '/suits/Spades.svg',
}

export function FoundationPile({
  cards,
  location,
  suit,
  onClick,
  isSelected,
  isValidTarget,
  onDrop,
}: FoundationPileProps) {
  const topCard = cards[cards.length - 1]
  const selected = isSelected(location)
  const validTarget = isValidTarget(location)

  const handleClick = () => onClick(location)

  const handleDragOver = (e: React.DragEvent) => {
    if (validTarget) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    onDrop(location)
  }

  const pileId = `pile-foundation-${location.index}`

  if (cards.length === 0) {
    return (
      <div
        className={`foundation-pile foundation-pile--empty ${validTarget ? 'foundation-pile--valid-target' : ''}`}
        data-pile-id={pileId}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <img
          src={SUIT_ICONS[suit]}
          alt={suit}
          className="foundation-pile__suit-icon"
          draggable={false}
        />
      </div>
    )
  }

  return (
    <div className="foundation-pile" data-pile-id={pileId}>
      <Card
        card={topCard ?? null}
        onClick={handleClick}
        selected={selected}
        validTarget={validTarget}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
    </div>
  )
}

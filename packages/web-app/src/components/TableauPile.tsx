import type { Card as CardType, PileLocation } from '@russian-bank/game-engine'
import { Card } from './Card'
import './TableauPile.css'

interface TableauPileProps {
  cards: CardType[]
  location: PileLocation
  direction: 'left' | 'right' // Fan direction away from center
  onClick: (location: PileLocation) => void
  isSelected: (location: PileLocation) => boolean
  isValidTarget: (location: PileLocation) => boolean
  canDrag: boolean
  onDragStart: (location: PileLocation) => void
  onDragEnd: () => void
  onDrop: (location: PileLocation) => void
}

export function TableauPile({
  cards,
  location,
  direction,
  onClick,
  isSelected,
  isValidTarget,
  canDrag,
  onDragStart,
  onDragEnd,
  onDrop,
}: TableauPileProps) {
  const selected = isSelected(location)
  const validTarget = isValidTarget(location)

  const handleClick = () => onClick(location)

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    onDragStart(location)
  }

  const handleDragEnd = () => {
    onDragEnd()
  }

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

  if (cards.length === 0) {
    return (
      <div className={`tableau-pile tableau-pile--empty tableau-pile--${direction}`}>
        <Card
          card={null}
          onClick={handleClick}
          validTarget={validTarget}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      </div>
    )
  }

  return (
    <div
      className={`tableau-pile tableau-pile--${direction}`}
      style={{ '--card-count': cards.length } as React.CSSProperties}
    >
      {cards.map((card, index) => {
        const isTop = index === cards.length - 1
        return (
          <div
            key={`${card.suit}-${card.rank}-${card.deck}`}
            className="tableau-pile__card"
            style={{ '--index': index } as React.CSSProperties}
          >
            <Card
              card={card}
              onClick={isTop ? handleClick : undefined}
              selected={isTop && selected}
              validTarget={isTop && validTarget}
              draggable={isTop && canDrag}
              onDragStart={isTop ? handleDragStart : undefined}
              onDragEnd={isTop ? handleDragEnd : undefined}
              onDragOver={isTop ? handleDragOver : undefined}
              onDrop={isTop ? handleDrop : undefined}
            />
          </div>
        )
      })}
    </div>
  )
}

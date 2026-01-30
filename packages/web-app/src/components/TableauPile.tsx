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
  hasMovesFrom?: (location: PileLocation) => boolean
}

export function TableauPile({
  cards,
  location,
  direction,
  onClick,
  isSelected,
  isValidTarget,
  hasMovesFrom,
}: TableauPileProps) {
  const selected = isSelected(location)
  const validTarget = isValidTarget(location)
  const hasHint = hasMovesFrom?.(location) ?? false

  const handleClick = () => onClick(location)

  const pileId = `pile-tableau-${location.owner}-${location.index}`

  if (cards.length === 0) {
    return (
      <div
        className={`tableau-pile tableau-pile--empty tableau-pile--${direction}`}
        data-pile-id={pileId}
      >
        <Card
          card={null}
          onClick={handleClick}
          validTarget={validTarget}
        />
      </div>
    )
  }

  return (
    <div
      className={`tableau-pile tableau-pile--${direction}`}
      data-pile-id={pileId}
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
              hint={isTop && hasHint}
            />
          </div>
        )
      })}
    </div>
  )
}

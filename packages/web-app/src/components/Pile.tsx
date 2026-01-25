import type { Card as CardType, PileLocation } from '@russian-bank/game-engine'
import { Card } from './Card'
import './Pile.css'

interface PileProps {
  cards: CardType[]
  location: PileLocation
  label?: string
  showCount?: boolean
  faceDown?: boolean
  spread?: boolean
  onClick: (location: PileLocation) => void
  isSelected: (location: PileLocation) => boolean
  isValidTarget: (location: PileLocation) => boolean
}

export function Pile({
  cards,
  location,
  label,
  showCount = false,
  faceDown = false,
  spread = false,
  onClick,
  isSelected,
  isValidTarget,
}: PileProps) {
  const topCard = cards[cards.length - 1]
  const selected = isSelected(location)
  const validTarget = isValidTarget(location)

  const handleClick = () => onClick(location)

  if (spread && cards.length > 0) {
    // Show stacked cards with slight offset (for tableau piles)
    return (
      <div className="pile pile--spread">
        {label && <div className="pile__label">{label}</div>}
        <div className="pile__cards">
          {cards.map((card, index) => (
            <div
              key={`${card.suit}-${card.rank}-${card.deck}`}
              className="pile__card"
              style={{ '--card-index': index } as React.CSSProperties}
            >
              <Card
                card={card}
                faceDown={faceDown && index < cards.length - 1}
                onClick={handleClick}
                selected={selected && index === cards.length - 1}
                validTarget={validTarget && index === cards.length - 1}
              />
            </div>
          ))}
          {cards.length === 0 && (
            <Card
              card={null}
              onClick={handleClick}
              validTarget={validTarget}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="pile">
      {label && <div className="pile__label">{label}</div>}
      <div className="pile__stack" onClick={handleClick}>
        <Card
          card={topCard ?? null}
          faceDown={faceDown && cards.length > 0}
          selected={selected}
          validTarget={validTarget}
        />
        {showCount && cards.length > 1 && (
          <div className="pile__count">{cards.length}</div>
        )}
      </div>
    </div>
  )
}

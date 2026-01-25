import type { Card as CardType, PileLocation } from '@russian-bank/game-engine'
import { Card } from './Card'
import './Pile.css'

interface PileProps {
  cards: CardType[]
  location: PileLocation
  label?: string
  showCount?: boolean
  faceDown?: boolean
  onClick: (location: PileLocation) => void
  isSelected: (location: PileLocation) => boolean
  isValidTarget: (location: PileLocation) => boolean
  canDrag?: boolean
  onDragStart?: (location: PileLocation) => void
  onDragEnd?: () => void
  onDrop?: (location: PileLocation) => void
  hasMovesFrom?: (location: PileLocation) => boolean
}

export function Pile({
  cards,
  location,
  label,
  showCount = false,
  faceDown = false,
  onClick,
  isSelected,
  isValidTarget,
  canDrag = false,
  onDragStart,
  onDragEnd,
  onDrop,
  hasMovesFrom,
}: PileProps) {
  const topCard = cards[cards.length - 1]
  const selected = isSelected(location)
  const validTarget = isValidTarget(location)
  const hasHint = hasMovesFrom?.(location) ?? false

  const handleClick = () => onClick(location)

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    onDragStart?.(location)
  }

  const handleDragEnd = () => {
    onDragEnd?.()
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (validTarget) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    onDrop?.(location)
  }

  const pileId = location.index !== undefined
    ? `pile-${location.type}-${location.owner}-${location.index}`
    : `pile-${location.type}-${location.owner}`

  return (
    <div className="pile" data-pile-id={pileId}>
      {label && <div className="pile__label">{label}</div>}
      <div className="pile__stack">
        <Card
          card={topCard ?? null}
          faceDown={faceDown && cards.length > 0}
          onClick={handleClick}
          selected={selected}
          validTarget={validTarget}
          hint={hasHint && !faceDown && cards.length > 0}
          draggable={canDrag && !faceDown && cards.length > 0}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
        {showCount && cards.length > 1 && (
          <div className="pile__count">{cards.length}</div>
        )}
      </div>
    </div>
  )
}

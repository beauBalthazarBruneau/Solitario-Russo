import { useEffect, useState } from 'react'
import type { Card as CardType } from '@russian-bank/game-engine'
import './AnimatingCard.css'

interface Position {
  x: number
  y: number
  width: number
  height: number
}

interface AnimatingCardProps {
  card: CardType
  from: Position
  to: Position
  onComplete: () => void
  duration?: number
}

const SUIT_CODE: Record<string, string> = {
  hearts: 'H',
  diamonds: 'D',
  clubs: 'C',
  spades: 'S',
}

const RANK_CODE: Record<number, string> = {
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

export function AnimatingCard({
  card,
  from,
  to,
  onComplete,
  duration = 200,
}: AnimatingCardProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Start animation on next frame to ensure initial position is rendered
    requestAnimationFrame(() => {
      setIsAnimating(true)
    })

    const timer = setTimeout(() => {
      onComplete()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onComplete])

  const style = isAnimating
    ? {
        left: to.x,
        top: to.y,
        width: to.width,
        height: to.height,
        transition: `all ${duration}ms ease-out`,
      }
    : {
        left: from.x,
        top: from.y,
        width: from.width,
        height: from.height,
      }

  return (
    <div className="animating-card" style={style}>
      <img
        src={getCardImagePath(card)}
        alt={`${RANK_CODE[card.rank]} of ${card.suit}`}
        className="animating-card__image"
        draggable={false}
      />
    </div>
  )
}

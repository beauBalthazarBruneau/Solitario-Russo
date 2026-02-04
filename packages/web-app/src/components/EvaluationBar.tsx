import './EvaluationBar.css'

interface EvaluationBarProps {
  player1Cards: number
  player2Cards: number
  /** Neural network's win probability for player 1 (0-1) */
  neuralWinProb?: number
}

export function EvaluationBar({ player1Cards, player2Cards, neuralWinProb }: EvaluationBarProps) {
  const total = player1Cards + player2Cards
  // Player 1 (white) percentage - shown from the bottom
  const player1Percent = total > 0 ? (player1Cards / total) * 100 : 50
  // Neural evaluation - player 1 (red) percentage from bottom
  const neuralPercent = neuralWinProb !== undefined ? neuralWinProb * 100 : 50

  return (
    <div className="evaluation-bar-container">
      {/* Card count bar (white/black) */}
      <div className="evaluation-bar">
        <div
          className="evaluation-bar__white"
          style={{ height: `${player1Percent}%` }}
        />
      </div>
      {/* Neural evaluation bar (red/blue) */}
      <div className="evaluation-bar evaluation-bar--neural">
        <div
          className="evaluation-bar__red"
          style={{ height: `${neuralPercent}%` }}
        />
      </div>
    </div>
  )
}

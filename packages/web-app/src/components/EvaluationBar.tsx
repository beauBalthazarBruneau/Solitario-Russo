import './EvaluationBar.css'

interface EvaluationBarProps {
  player1Cards: number
  player2Cards: number
}

export function EvaluationBar({ player1Cards, player2Cards }: EvaluationBarProps) {
  const total = player1Cards + player2Cards
  // Player 1 (white) percentage - shown from the bottom
  const player1Percent = total > 0 ? (player1Cards / total) * 100 : 50

  return (
    <div className="evaluation-bar">
      <div
        className="evaluation-bar__white"
        style={{ height: `${player1Percent}%` }}
      />
    </div>
  )
}

import './TutorialOverlay.css'

interface TutorialPromptProps {
  onStart: () => void
  onSkip: () => void
}

export function TutorialPrompt({ onStart, onSkip }: TutorialPromptProps) {
  return (
    <div className="tutorial-prompt">
      <div className="tutorial-prompt__card">
        <h2 className="tutorial-prompt__title">Welcome to Solitario Russo!</h2>
        <p className="tutorial-prompt__subtitle">
          Would you like a quick tutorial to learn how to play? It only takes a couple of minutes.
        </p>
        <div className="tutorial-prompt__buttons">
          <button
            className="tutorial-prompt__button tutorial-prompt__button--primary"
            onClick={onStart}
          >
            Start Tutorial
          </button>
          <button
            className="tutorial-prompt__button tutorial-prompt__button--secondary"
            onClick={onSkip}
          >
            Skip, I know how to play
          </button>
        </div>
      </div>
    </div>
  )
}

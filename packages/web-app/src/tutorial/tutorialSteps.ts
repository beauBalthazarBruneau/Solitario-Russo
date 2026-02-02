import type { PileLocation } from '@russian-bank/game-engine'

export type TutorialStepType = 'info' | 'interactive'

export interface TutorialStep {
  id: string
  title: string
  content: string
  type: TutorialStepType
  // Elements to highlight (data-pile-id or data-tutorial-id)
  highlight?: string[]
  // For interactive steps: required action to proceed
  requiredAction?: {
    type: 'click-pile' | 'make-move' | 'open-settings'
    pileLocation?: PileLocation
    anyValidMove?: boolean
  }
  // Position of tooltip relative to highlighted element
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  // Welcome
  {
    id: 'welcome',
    title: 'Welcome to Solitario Russo!',
    content: `Solitario Russo is a competitive two-player card game where you race against an opponent to be the first to get rid of all your cards.

This tutorial will teach you:
• How the game board is organized
• How to move cards
• How to attack your opponent
• How to customize your settings

Let's get started!`,
    type: 'info',
    tooltipPosition: 'center',
  },

  // Game Board Overview
  {
    id: 'board-overview',
    title: 'The Game Board',
    content: `The board is divided into three areas:

• **Top:** Your opponent's area (their hand, waste, and reserve)
• **Middle:** Shared tableau and foundation piles
• **Bottom:** Your area (your hand, waste, and reserve)

Your goal is to empty all your piles before your opponent empties theirs!`,
    type: 'info',
    tooltipPosition: 'center',
  },

  // Your Piles
  {
    id: 'your-piles',
    title: 'Your Piles',
    content: `You have three personal piles:

• **Hand:** Your main deck. Draw from here when you can't make any moves.
• **Waste:** Cards you've drawn go here. Play from this pile.
• **Reserve:** An extra pile of cards you can also play from.

The number on each pile shows how many cards remain.`,
    type: 'info',
    highlight: ['pile-reserve-player1', 'pile-waste-player1', 'pile-hand-player1'],
    tooltipPosition: 'top',
  },

  // Foundations
  {
    id: 'foundations',
    title: 'Foundations',
    content: `The 8 foundation piles in the center are shared by both players.

• Build foundations **up by suit** from Ace to King
• Example: A♥ → 2♥ → 3♥ → ... → K♥
• Each suit has two foundation piles (one per deck)

Getting cards to the foundations is the best way to reduce your card count!`,
    type: 'info',
    highlight: [
      'pile-foundation-0', 'pile-foundation-1', 'pile-foundation-2', 'pile-foundation-3',
      'pile-foundation-4', 'pile-foundation-5', 'pile-foundation-6', 'pile-foundation-7',
    ],
    tooltipPosition: 'center',
  },

  // Tableaus
  {
    id: 'tableaus',
    title: 'Tableaus',
    content: `Each player has 4 tableau piles on their side of the board.

• Build tableaus **down in alternating colors**
• Example: 8♥ (red) → 7♠ (black) → 6♦ (red)
• Empty tableaus can accept **any card**

You can play cards to your own tableaus OR your opponent's tableaus!`,
    type: 'info',
    highlight: [
      'pile-tableau-player1-0', 'pile-tableau-player1-1',
      'pile-tableau-player1-2', 'pile-tableau-player1-3',
    ],
    tooltipPosition: 'top',
  },

  // Click to Move Tutorial
  {
    id: 'click-to-move-intro',
    title: 'Moving Cards: Click to Move',
    content: `The easiest way to move cards:

1. **Click** on the pile you want to move from
   - The pile will highlight to show it's selected

2. **Click** on where you want to move the card
   - Valid destinations will be highlighted

3. To **cancel**, click the selected pile again or click an empty area

Try it now! Click on your **Reserve** pile (it has an Ace of Hearts you can play).`,
    type: 'interactive',
    highlight: ['pile-reserve-player1'],
    requiredAction: {
      type: 'click-pile',
    },
    tooltipPosition: 'top',
  },

  // Complete a move
  {
    id: 'complete-move',
    title: 'Complete the Move',
    content: `Great! You've selected a pile. Now you can see which destinations are valid (they're highlighted).

**Click on a highlighted destination** to complete the move.

The card will animate to its new position.`,
    type: 'interactive',
    requiredAction: {
      type: 'make-move',
      anyValidMove: true,
    },
    tooltipPosition: 'center',
  },

  // Drawing Cards
  {
    id: 'drawing-cards',
    title: 'Drawing Cards',
    content: `When you have no valid moves available:

1. **Click on your Hand pile** to draw a card

2. The drawn card goes to your **Drawn** slot first

3. If the drawn card can be played, **you must play it**

4. If it can't be played, it goes to your **Waste** and your **turn ends**

Remember: You can only draw when no other moves are possible!`,
    type: 'info',
    highlight: ['pile-hand-player1', 'pile-drawn-player1'],
    tooltipPosition: 'top',
  },

  // Attacking
  {
    id: 'attacking',
    title: 'Attacking Your Opponent',
    content: `Slow down your opponent by playing cards onto their waste or reserve!

**Attack Rules:**
• Must be the **same suit**
• Must be **±1 rank** (one higher or one lower)

**Example:**
If opponent's waste shows 7♦, you can attack with 6♦ or 8♦

Attacks are a powerful strategy to gain the advantage!`,
    type: 'info',
    highlight: ['pile-waste-player2', 'pile-reserve-player2'],
    tooltipPosition: 'bottom',
  },

  // Turn Structure
  {
    id: 'turn-structure',
    title: 'Turn Structure',
    content: `On your turn:

1. **Make all possible moves** - play as many cards as you can

2. **Draw if stuck** - when no moves are available, draw from your hand

3. **Turn ends** - when you draw and can't play the drawn card

The current player is always highlighted on the board with a golden glow.`,
    type: 'info',
    tooltipPosition: 'center',
  },

  // Winning
  {
    id: 'winning',
    title: 'Winning the Game',
    content: `The game ends when one player **empties all their piles** (hand, waste, and reserve).

That player wins!

Keep an eye on the card counts in the status bar to track your progress versus your opponent.`,
    type: 'info',
    tooltipPosition: 'center',
  },

  // Settings Access
  {
    id: 'settings-access',
    title: 'Game Settings',
    content: `When you're playing, you can customize your experience through the **Settings** menu (gear icon in the top right).

From Settings you can:
• **Toggle AI opponent** on/off
• **Choose bot difficulty** - pick from different opponents
• **Enable/disable hints** - highlighted piles show good moves
• **Replay this tutorial** anytime via "How to Play"

Settings are available on the main game screen after the tutorial.`,
    type: 'info',
    tooltipPosition: 'center',
  },

  // Strategy Tips
  {
    id: 'tips',
    title: 'Tips for Success',
    content: `1. **Prioritize foundations** - Cards played here are gone for good

2. **Keep tableaus flexible** - Don't stack too deep; empty tableaus give options

3. **Attack strategically** - Slow your opponent when you have matching cards

4. **Use hints while learning** - They'll teach you which moves are strong

5. **Watch the card counts** - Know when you're ahead or behind`,
    type: 'info',
    tooltipPosition: 'center',
  },

  // Completion
  {
    id: 'completion',
    title: "You're Ready to Play!",
    content: `You now know everything you need to start playing Solitario Russo.

Remember:
• Click or drag to move cards
• Build foundations up by suit
• Build tableaus down in alternating colors
• Attack your opponent's waste and reserve
• Access Settings anytime to adjust your experience

Good luck and have fun!`,
    type: 'info',
    tooltipPosition: 'center',
  },
]

export const TOTAL_STEPS = TUTORIAL_STEPS.length

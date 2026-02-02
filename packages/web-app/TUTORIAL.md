# Solitario Russo In-App Tutorial - Project Specification

## Project Overview

Build an interactive, step-by-step tutorial system for first-time users of Solitario Russo. The tutorial should guide new players through the game's mechanics, controls, and settings in an engaging and easy-to-follow manner.

### Goals
- Reduce friction for new players
- Teach core game mechanics through interactive guidance
- Show users how to move cards using both control methods
- Demonstrate how to access and modify settings
- Allow users to skip or revisit the tutorial at any time

### Target Audience
- First-time players unfamiliar with Solitario Russo
- Players unfamiliar with competitive solitaire games
- Users who need a refresher on controls or rules

---

## Epic 1: Tutorial Infrastructure

### Issue 1.1: Tutorial State Management
**Description:** Create the foundation for tracking tutorial progress and user preferences.

**Requirements:**
- Track whether user has completed the tutorial
- Store tutorial progress (current step, completed steps)
- Persist tutorial completion status in localStorage
- Provide ability to reset/replay tutorial
- Track if tutorial was skipped vs completed

**Acceptance Criteria:**
- Tutorial state persists across browser sessions
- User can restart tutorial from settings
- First-time visitors are automatically prompted to start tutorial

---

### Issue 1.2: Tutorial Overlay System
**Description:** Build a reusable overlay/modal system for displaying tutorial steps.

**Requirements:**
- Semi-transparent backdrop that dims non-focused areas
- Spotlight/highlight effect on the element being explained
- Tooltip/popover component for tutorial text
- Support for positioning tooltips relative to highlighted elements (top, bottom, left, right)
- Smooth transitions between tutorial steps

**Acceptance Criteria:**
- Overlay does not block interaction with highlighted elements when required
- Tooltips automatically reposition to stay within viewport
- Transitions are smooth and not jarring

---

### Issue 1.3: Tutorial Navigation Controls
**Description:** Implement controls for navigating through tutorial steps.

**Requirements:**
- "Next" button to advance to the next step
- "Back" button to return to the previous step
- "Skip Tutorial" option always visible
- Step indicator showing progress (e.g., "Step 3 of 12")
- Keyboard navigation support (arrow keys, Escape to skip)

**Acceptance Criteria:**
- Users can navigate forward and backward through steps
- Skip button exits tutorial and marks as skipped
- Progress indicator accurately reflects current position

---

### Issue 1.4: Tutorial Entry Points
**Description:** Define how and when users enter the tutorial.

**Requirements:**
- Auto-prompt on first visit with option to start or skip
- "How to Play" button in the main game UI (header or settings)
- Tutorial accessible from Settings modal
- Deep-link support to start tutorial at specific sections

**Acceptance Criteria:**
- First-time users see tutorial prompt before game starts
- Returning users can easily access tutorial from UI
- Tutorial can be launched mid-game without losing game state

---

## Epic 2: Tutorial Content - Game Introduction

### Issue 2.1: Welcome Screen
**Description:** Create an engaging welcome step that introduces the game.

**Tutorial Content:**
> **Welcome to Solitario Russo!**
>
> Solitario Russo is a competitive two-player card game where you race against an opponent to be the first to get rid of all your cards.
>
> This tutorial will teach you:
> - How the game board is organized
> - How to move cards
> - How to attack your opponent
> - How to customize your settings
>
> Let's get started!

**Requirements:**
- Display game logo/title
- Brief game description
- Overview of what tutorial will cover
- "Start Tutorial" and "Skip" buttons

---

### Issue 2.2: Game Board Overview
**Description:** Introduce the overall layout of the game board.

**Tutorial Content:**
> **The Game Board**
>
> The board is divided into three areas:
>
> - **Top:** Your opponent's area (their hand, waste, and reserve)
> - **Middle:** Shared tableau and foundation piles
> - **Bottom:** Your area (your hand, waste, and reserve)
>
> Your goal is to empty all your piles before your opponent empties theirs!

**Requirements:**
- Highlight entire game board
- Show visual indicators for each area (top, middle, bottom)
- Brief pause to let user absorb the layout

---

### Issue 2.3: Your Piles Explanation
**Description:** Explain the player's personal piles (hand, waste, reserve).

**Tutorial Content:**
> **Your Piles**
>
> You have three personal piles:
>
> - **Hand:** Your main deck. Draw from here when you can't make any moves.
> - **Waste:** Cards you've drawn go here. Play from this pile.
> - **Reserve:** An extra pile of cards you can also play from.
>
> The number on each pile shows how many cards remain.

**Requirements:**
- Sequentially highlight Hand, Waste, and Reserve piles
- Show card count indicators
- Explain that opponent has matching piles at the top

---

### Issue 2.4: Foundations Explanation
**Description:** Explain foundation piles and how to build on them.

**Tutorial Content:**
> **Foundations**
>
> The 8 foundation piles in the center are shared by both players.
>
> - Build foundations **up by suit** from Ace to King
> - Example: A♥ → 2♥ → 3♥ → ... → K♥
> - Each suit has two foundation piles (one per deck)
>
> Getting cards to the foundations is the best way to reduce your card count!

**Requirements:**
- Highlight foundation area
- Show suit symbols on empty foundations
- Emphasize "up by suit" rule

---

### Issue 2.5: Tableaus Explanation
**Description:** Explain tableau piles and building rules.

**Tutorial Content:**
> **Tableaus**
>
> Each player has 4 tableau piles on their side of the board.
>
> - Build tableaus **down in alternating colors**
> - Example: 8♥ (red) → 7♠ (black) → 6♦ (red)
> - Empty tableaus can accept **any card**
>
> You can play cards to your own tableaus OR your opponent's tableaus!

**Requirements:**
- Highlight player's tableau piles
- Show example of alternating colors
- Mention ability to play on opponent's tableaus

---

## Epic 3: Tutorial Content - Moving Cards

### Issue 3.1: Click-to-Move Tutorial
**Description:** Teach users the click-to-select, click-to-place control method.

**Tutorial Content:**
> **Moving Cards: Click to Move**
>
> The easiest way to move cards:
>
> 1. **Click** on the pile you want to move from
>    - The pile will highlight to show it's selected
>
> 2. **Click** on where you want to move the card
>    - Valid destinations will be highlighted
>
> 3. To **cancel**, click the selected pile again or click an empty area
>
> Try it now! Click on your waste pile to select it.

**Requirements:**
- Interactive step: require user to click a pile to proceed
- Highlight the pile when selected
- Show valid destination highlights
- Wait for user to complete a move before advancing

**Acceptance Criteria:**
- User must successfully complete a click-to-move action
- Visual feedback shows selection and valid targets
- Tutorial advances only after successful move

---

### Issue 3.2: Drag-and-Drop Tutorial
**Description:** Teach users the drag-and-drop control method.

**Tutorial Content:**
> **Moving Cards: Drag and Drop**
>
> You can also drag cards directly:
>
> 1. **Click and hold** on a card you want to move
>
> 2. **Drag** the card to your desired destination
>    - Valid destinations will highlight as you hover
>
> 3. **Release** to drop the card
>    - If it's a valid move, the card will stay
>    - If invalid, the card returns to its original position
>
> Try dragging a card now!

**Requirements:**
- Interactive step: require user to drag a card
- Show card following cursor during drag
- Highlight valid drop targets on hover
- Animate card snapping to destination or returning

**Acceptance Criteria:**
- User must successfully complete a drag-and-drop move
- Visual feedback during drag operation
- Tutorial advances only after successful move

---

### Issue 3.3: Drawing Cards Tutorial
**Description:** Teach users how to draw from their hand.

**Tutorial Content:**
> **Drawing Cards**
>
> When you have no valid moves available:
>
> 1. **Click on your Hand pile** to draw a card
>
> 2. The drawn card goes to your **Waste pile**
>
> 3. If the drawn card can be played, **you must play it**
>
> 4. If it can't be played, your **turn ends**
>
> Remember: You can only draw when no other moves are possible!

**Requirements:**
- Highlight the Hand pile
- Explain forced draw rule
- Explain forced play rule for drawn cards

---

### Issue 3.4: Attacking Opponent Tutorial
**Description:** Teach users how to attack their opponent's piles.

**Tutorial Content:**
> **Attacking Your Opponent**
>
> Slow down your opponent by playing cards onto their waste or reserve!
>
> **Attack Rules:**
> - Must be the **same suit**
> - Must be **±1 rank** (one higher or one lower)
>
> **Example:**
> If opponent's waste shows 7♦, you can attack with 6♦ or 8♦
>
> Attacks are a powerful strategy to gain the advantage!

**Requirements:**
- Highlight opponent's waste and reserve piles
- Show example attack scenario
- Emphasize same suit, ±1 rank rule

---

## Epic 4: Tutorial Content - Settings & Features

### Issue 4.1: Accessing Settings Tutorial
**Description:** Show users how to open the settings modal.

**Tutorial Content:**
> **Accessing Settings**
>
> Customize your game experience through Settings:
>
> 1. Look for the **Settings button** (gear icon) in the game status bar
>
> 2. **Click** to open the Settings panel
>
> Let's open Settings now!

**Requirements:**
- Highlight the Settings button/icon
- Interactive step: require user to click Settings
- Settings modal opens upon click

**Acceptance Criteria:**
- User must click Settings button to proceed
- Settings modal opens successfully

---

### Issue 4.2: AI Opponent Settings Tutorial
**Description:** Explain AI opponent options.

**Tutorial Content:**
> **Play vs AI**
>
> Toggle AI opponent on or off:
>
> - **ON:** Play against the computer
> - **OFF:** Play with a friend (two-player mode)
>
> **Choose Your Opponent:**
> When AI is enabled, select from different bot personalities. Each has a different play style and difficulty level.
>
> Try different opponents to find your ideal challenge!

**Requirements:**
- Highlight "Play vs AI" toggle
- Highlight AI opponent dropdown
- Explain bot selection

---

### Issue 4.3: Hints Setting Tutorial
**Description:** Explain the hints feature and how to toggle it.

**Tutorial Content:**
> **Hints**
>
> Need help finding good moves? Enable Hints!
>
> - **ON:** Piles with worthwhile moves will be highlighted
> - **OFF:** No move suggestions (for a challenge)
>
> Hints are great for learning which moves are typically strong plays.
>
> We recommend keeping hints **ON** while you're learning!

**Requirements:**
- Highlight hints toggle
- Explain what hints look like in-game
- Recommend setting for new players

---

### Issue 4.4: Other Game Controls Tutorial
**Description:** Explain Undo, New Game, and Move History features.

**Tutorial Content:**
> **Game Controls**
>
> **Undo Button:**
> Made a mistake? Click Undo to reverse your last move.
> Note: Undo is disabled during the AI's turn.
>
> **New Game Button:**
> Start a fresh game at any time.
>
> **Move History:**
> Click to expand a log of all moves in the current game. Great for reviewing your play and learning from your decisions!

**Requirements:**
- Sequentially highlight Undo, New Game, and History controls
- Explain each function briefly
- Mention undo limitation during AI turn

---

## Epic 5: Tutorial Content - Winning & Tips

### Issue 5.1: Turn Structure Tutorial
**Description:** Explain how turns work.

**Tutorial Content:**
> **Turn Structure**
>
> On your turn:
>
> 1. **Make all possible moves** - play as many cards as you can
>
> 2. **Draw if stuck** - when no moves are available, draw from your hand
>
> 3. **Turn ends** - when you draw and can't play the drawn card
>
> The current player is always highlighted on the board.

**Requirements:**
- Explain turn flow
- Highlight turn indicator on the game board

---

### Issue 5.2: Winning the Game Tutorial
**Description:** Explain win conditions.

**Tutorial Content:**
> **Winning the Game**
>
> The game ends when one player **empties all their piles** (hand, waste, and reserve).
>
> That player wins!
>
> Keep an eye on the card counts in the status bar to track your progress versus your opponent.

**Requirements:**
- Highlight card count displays
- Emphasize empty-all-piles win condition

---

### Issue 5.3: Strategy Tips
**Description:** Provide helpful tips for new players.

**Tutorial Content:**
> **Tips for Success**
>
> 1. **Prioritize foundations** - Cards played here are gone for good
>
> 2. **Keep tableaus flexible** - Don't stack too deep; empty tableaus give options
>
> 3. **Attack strategically** - Slow your opponent when you have matching cards
>
> 4. **Use hints while learning** - They'll teach you which moves are strong
>
> 5. **Watch the card counts** - Know when you're ahead or behind

**Requirements:**
- Display tips in a clear, scannable format
- Keep tips concise and actionable

---

### Issue 5.4: Tutorial Completion
**Description:** Final step celebrating tutorial completion.

**Tutorial Content:**
> **You're Ready to Play!**
>
> You now know everything you need to start playing Solitario Russo.
>
> Remember:
> - Click or drag to move cards
> - Build foundations up by suit
> - Build tableaus down in alternating colors
> - Attack your opponent's waste and reserve
> - Access Settings anytime to adjust your experience
>
> Good luck and have fun!

**Requirements:**
- Congratulatory message
- Quick reference summary
- "Start Playing" button to close tutorial
- Option to "Replay Tutorial"

---

## Epic 6: Polish & Accessibility

### Issue 6.1: Mobile/Touch Support
**Description:** Ensure tutorial works on touch devices.

**Requirements:**
- Touch-friendly tooltip sizes and buttons
- Tap interactions work same as click
- Drag-and-drop tutorial adapted for touch (touch and drag)
- Responsive positioning for smaller screens

---

### Issue 6.2: Accessibility
**Description:** Make tutorial accessible to all users.

**Requirements:**
- Keyboard navigation through all steps
- Screen reader support with appropriate ARIA labels
- Sufficient color contrast for highlights and text
- Focus management (focus moves logically between steps)
- Reduced motion option for animations

---

### Issue 6.3: Tutorial Analytics (Optional)
**Description:** Track tutorial engagement for improvement.

**Requirements:**
- Track tutorial start rate
- Track completion rate vs skip rate
- Track where users drop off
- Track tutorial replays from settings

---

## Implementation Priority

### Phase 1 (MVP)
1. Issue 1.5: Deterministic Tutorial Game State
2. Issue 1.1: Tutorial State Management
3. Issue 1.2: Tutorial Overlay System
4. Issue 1.3: Tutorial Navigation Controls
5. Issue 2.1: Welcome Screen
6. Issue 2.2: Game Board Overview
7. Issue 3.1: Click-to-Move Tutorial
8. Issue 5.4: Tutorial Completion

### Phase 2
1. Issue 1.4: Tutorial Entry Points
2. Issue 1.6: Tutorial Replay from Settings
3. Issue 2.3-2.5: Pile explanations
4. Issue 3.2-3.4: Additional move tutorials
5. Issue 4.1-4.4: Settings tutorials

### Phase 3
1. Issue 5.1-5.3: Turn structure and tips
2. Issue 6.1: Mobile support
3. Issue 6.2: Accessibility
4. Issue 6.3: Analytics (optional)

---

## Dependencies

- Deterministic game state (1.5) must be created before any interactive tutorial steps
- Tutorial overlay system must be built before any content steps
- State management must be in place before tracking progress
- Click-to-move tutorial should come before drag-and-drop
- Settings access tutorial requires settings modal to exist
- Tutorial replay (1.6) depends on deterministic game state (1.5) and state management (1.1)

---

## Design Decisions

1. **Game Board:** Tutorial runs on the real game board, not a sandbox
2. **Progression:** Tutorial blocks game progression until completed or skipped
3. **Skipping:** Tutorial is skippable as a whole only (no per-section skipping)
4. **Replay:** Tutorial can be re-enabled from Settings at any time
5. **Deterministic State:** Tutorial always uses the same predetermined game state for consistency

---

## Additional Requirements from Design Decisions

### Issue 1.5: Deterministic Tutorial Game State
**Description:** Create a fixed, predetermined game state that is used every time the tutorial runs.

**Requirements:**
- Define a specific seed or fixed card arrangement for the tutorial
- Tutorial always starts with identical card positions for both players
- Game state should be designed to showcase all tutorial scenarios:
  - At least one valid foundation move available
  - At least one valid tableau move available
  - A card that can attack opponent's waste/reserve
  - Cards arranged to demonstrate alternating colors on tableaus
- When tutorial ends (completed or skipped), transition to a fresh random game

**Acceptance Criteria:**
- Every user sees the exact same cards in the same positions during tutorial
- Tutorial game state enables all interactive tutorial steps to be completed
- Normal random game begins after tutorial concludes

---

### Issue 1.6: Tutorial Replay from Settings
**Description:** Add option in Settings to restart the tutorial.

**Requirements:**
- Add "Replay Tutorial" or "How to Play" button in Settings modal
- Clicking this option:
  - Closes Settings modal
  - Resets game to the deterministic tutorial state
  - Starts tutorial from the beginning
- Button should be clearly visible and labeled

**Acceptance Criteria:**
- Users can access tutorial replay from Settings at any time
- Current game is replaced with tutorial game state
- Full tutorial experience restarts from step 1

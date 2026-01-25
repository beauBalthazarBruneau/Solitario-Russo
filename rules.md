# Russian Bank (Crapette) - Game Rules

## Overview

Russian Bank is a competitive two-player solitaire game. Each player tries to be the first to empty all their cards by playing them to shared foundation piles and tactical tableau piles.

---

## Setup

Each player has their own standard 52-card deck (distinguishable by back design).

**Per player:**
- **Reserve (12 cards):** Face-down pile, top card face-up
- **Tableau (4 cards):** 4 face-up cards in a row
- **Hand (35 cards):** Remaining cards, face-down draw pile
- **Waste (0 cards):** Empty at start, builds during play

**Shared:**
- **Foundations (8 piles):** Empty at start, built up by suit from Ace to King

---

## Objective

Be the first player to empty your **reserve**, **hand**, AND **waste** piles.

---

## Turn Structure

On your turn, you make moves until your turn ends. Your turn ends when:
1. You draw a card from hand that **cannot** be played (it stays on waste), OR
2. You are completely stuck (no moves, hand empty, waste empty)

If stuck with no hand/waste, turn passes to opponent.

---

## Card Movement Rules

### Foundations (shared, 8 piles)

- Start with Ace, build **UP by suit**: A-2-3-4-5-6-7-8-9-10-J-Q-K
- Any player can play to any foundation
- Cards on foundations are **locked** (cannot be moved off)
- Foundation plays are **optional** (not mandatory)

### Your Own Tableau (4 piles)

- Build **DOWN** in **ALTERNATING colors**
- Example: 8♠ (black) → 7♥ (red) → 6♣ (black)
- **Empty pile:** Can place **ANY card**
- **Only top card** can be moved (no stack moves)

### Opponent's Tableau (4 piles)

- Build **UP or DOWN** by **SAME SUIT only**
- Example: 7♠ → 6♠ or 8♠
- This is how you "attack" - blocking their piles
- **Empty pile:** Can place **ANY card** (aggressive blocking)

---

## Where You Can Play FROM

| Source | → Foundation | → Own Tableau | → Opponent Tableau |
|--------|-------------|---------------|-------------------|
| Reserve (top) | ✓ | ✓ | ✓ |
| Waste (top) | ✓ | ✓ | ✓ |
| Own Tableau (top) | ✓ | ✓ (other pile) | ✓ |
| Hand | ✗ | ✗ | ✗ |

**Hand cards** can only be drawn to waste (see below).

---

## Drawing from Hand

Drawing is the key turn mechanic:

1. Draw one card from hand, place it on your waste pile
2. **If the card CAN be played:** Play it, then continue your turn normally (you may draw again later)
3. **If the card CANNOT be played:** It stays on waste and **your turn ends**

**Hand recycling:** When your hand is empty, your waste pile **immediately flips** to become your new hand (no turn cost).

---

## Winning

**Win condition:** Your reserve + hand + waste are ALL empty.

Your tableau cards don't matter - only the three personal piles.

---

## Game End Conditions

1. **Victory:** A player empties reserve + hand + waste
2. **Move limit:** After 1000 total moves, game is a **draw**
3. **Mutual stuck:** Both players stuck consecutively with no possible moves - turn passes back and forth until someone can move or draw

---

## Summary of Key Rules

| Rule | Decision |
|------|----------|
| Foundation plays | Optional (not mandatory) |
| Own tableau building | Down, alternating colors |
| Opponent tableau building | Up OR down, same suit |
| Empty own tableau | Any card |
| Empty opponent tableau | Any card |
| Stack moves | No (top card only) |
| Draw mechanic | Draw → play if able → continue; else turn ends |
| Multiple draws per turn | Yes, if each drawn card is played |
| Hand recycle | Immediate when hand empties |
| Win condition | Reserve + hand + waste all empty |
| Move limit | 1000 moves → draw |

---

## Example Turn

1. Player 1's turn begins
2. Play 5♥ from reserve to foundation (4♥ was on top) ✓
3. Play 3♠ from reserve to opponent's tableau (2♠ was on top) ✓
4. No more moves from reserve/tableau
5. Draw from hand → get 7♦
6. Play 7♦ to own tableau (8♠ was on top) ✓
7. Draw from hand → get K♣
8. Cannot play K♣ anywhere → goes to waste → **turn ends**

# AI Bot Improvements

## Current Issues

- Bot is too easy to beat — lost 4 in a row against a human player
- Overnight training improved bot vs bot (82% win rate) but that doesn't translate to strength against humans
- Training only optimizes against its own baseline, not against human-like strategies

## Ideas

- Should be penalized if the turn ends, but there are cards on the board that can be moved to create an empty tableau. 
- Should encourage longer tableau stacks rather than leaving empty tableaus.
- Should be able to look ahead more turns.
- Should not be able to move from one empty tableau to another.
-  Should also not be able to do a move that repeats a game state.
 - Aces should always go straight to foundation.


## Gameplay updates
- when you draw, that card has to be plaed immediately or the turn is over.
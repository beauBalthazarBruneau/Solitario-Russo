# AI Training Results

## Training Run: January 2025

### Configuration
- **Games per config**: 100
- **Total games**: 6,400
- **Training time**: ~8.3 minutes
- **Weights tested**: TO_FOUNDATION, ATTACK_RESERVE, EMPTIES_RESERVE
- **Range multipliers**: 0.5x, 1x, 1.5x, 2x of default values

### Key Findings

#### 1. TO_FOUNDATION = 50 is optimal (default was 100)
- **Best win rate: 58%** with TO_FOUNDATION=50
- Baseline (TO_FOUNDATION=100) achieved only 51%
- Higher values (150, 200) performed worse (38-49%)
- **Insight**: The AI plays better when it doesn't rush cards to foundations. This allows more flexibility to set up better move sequences.

#### 2. EMPTIES_RESERVE has no impact
- Identical results across all values (100, 200, 300, 400)
- This weight can likely be simplified or removed
- **Insight**: Emptying the reserve is either rare or always the obvious choice when available.

#### 3. ATTACK_RESERVE shows no clear pattern
- Default value (80) performs well
- No significant difference between 40, 80, 120, 160

#### 4. Draw rate dramatically reduced
- Before improvements: ~50-60% draws
- After improvements: ~1% draws
- Achieved through: look-ahead search, stagnation detection, exploration, shuffle penalties

### Top 5 Configurations

| Rank | Win Rate | Configuration |
|------|----------|---------------|
| 1 | 58% | TO_FOUNDATION=50 |
| 2 | 58% | TO_FOUNDATION=50, ATTACK_RESERVE=160 |
| 3 | 57% | TO_FOUNDATION=50, ATTACK_RESERVE=40 |
| 4 | 55% | TO_FOUNDATION=50, ATTACK_RESERVE=120 |
| 5 | 52% | TO_FOUNDATION=200, ATTACK_RESERVE=120 |

### Optimized Weights

```typescript
const OPTIMIZED_WEIGHTS: ScoreWeights = {
  TO_FOUNDATION: 50,        // Changed from 100
  ATTACK_RESERVE: 80,       // Keep default
  ATTACK_WASTE: 70,         // Not tested yet
  FROM_RESERVE: 50,         // Not tested yet
  FROM_WASTE: 30,           // Not tested yet
  FROM_TABLEAU: 10,         // Not tested yet
  TO_OWN_TABLEAU: 5,        // Not tested yet
  TO_OPPONENT_TABLEAU: 15,  // Not tested yet
  EMPTIES_RESERVE: 200,     // Doesn't matter
  CREATES_EMPTY_TABLEAU: -10, // Not tested yet
  PLAYS_ACE: 20,            // Not tested yet
  PLAYS_TWO: 15,            // Not tested yet
}
```

### AI Features Implemented

1. **Look-ahead search** (depth=2): Simulates moves ahead to find paths to foundation plays
2. **Stagnation detection**: Increases exploration when no foundation progress in 50+ moves
3. **Exploration rate**: 5% base chance of trying non-optimal moves, increases when stagnant
4. **Shuffle penalty**: Penalizes repeated tableau-to-tableau moves that don't make progress
5. **Pattern memory**: Tracks recent moves to detect and penalize shuffling patterns

### Next Steps: Weight Groups to Test

Testing all 12 weights at once would require 16 million combinations. Instead, we'll test in logical groups and combine the best findings.

#### Group 1: Source Weights (where cards come from)
```bash
npm run train -w @russian-bank/ai-training -- -g 100 -v --vary "FROM_RESERVE,FROM_WASTE,FROM_TABLEAU" --range "0.5,1,2"
```
- FROM_RESERVE (default: 50)
- FROM_WASTE (default: 30)
- FROM_TABLEAU (default: 10)

#### Group 2: Tableau Destination Weights
```bash
npm run train -w @russian-bank/ai-training -- -g 100 -v --vary "TO_OWN_TABLEAU,TO_OPPONENT_TABLEAU" --range "0.5,1,2"
```
- TO_OWN_TABLEAU (default: 5)
- TO_OPPONENT_TABLEAU (default: 15)

#### Group 3: Attack Weights
```bash
npm run train -w @russian-bank/ai-training -- -g 100 -v --vary "ATTACK_RESERVE,ATTACK_WASTE" --range "0.5,1,2"
```
- ATTACK_RESERVE (default: 80)
- ATTACK_WASTE (default: 70)

#### Group 4: Bonus Weights
```bash
npm run train -w @russian-bank/ai-training -- -g 100 -v --vary "CREATES_EMPTY_TABLEAU,PLAYS_ACE,PLAYS_TWO" --range "0.5,1,2"
```
- CREATES_EMPTY_TABLEAU (default: -10)
- PLAYS_ACE (default: 20)
- PLAYS_TWO (default: 15)

#### Already Tested
- TO_FOUNDATION: **50** (optimized from 100) ✓
- EMPTIES_RESERVE: No impact, keep default ✓
- FROM_TABLEAU: **5** (optimized from 10) ✓
- FROM_RESERVE: No clear pattern, keep default ✓
- FROM_WASTE: No clear pattern, keep default ✓

---

## Group 1 Results: Source Weights

**Date**: January 2025
**Games per config**: 100
**Total games**: 2,700
**Training time**: ~4.5 minutes

### Weights Tested
- FROM_RESERVE: 25, 50, 100 (default: 50)
- FROM_WASTE: 15, 30, 60 (default: 30)
- FROM_TABLEAU: 5, 10, 20 (default: 10)

### Key Findings

#### FROM_TABLEAU = 5 is optimal (default was 10)
- Both top configs (56% win rate) had FROM_TABLEAU=5
- Higher values (20) hurt performance (40-46%)
- **Insight**: Deprioritizing tableau moves helps the AI focus on depleting reserve/waste, which is what wins the game.

#### FROM_RESERVE - no clear pattern
- Both 25 and 100 appeared in top configs
- Default (50) performs well

#### FROM_WASTE - no clear pattern
- Default (30) performs fine
- No significant improvement from changes

### Top 5 Configurations

| Rank | Win Rate | Configuration |
|------|----------|---------------|
| 1 | 56% | FROM_RESERVE=25, FROM_TABLEAU=5 |
| 2 | 56% | FROM_RESERVE=100, FROM_TABLEAU=5 |
| 3 | 53% | FROM_RESERVE=25, FROM_WASTE=60, FROM_TABLEAU=20 |
| 4 | 53% | baseline |
| 5 | 52% | FROM_RESERVE=100 |

### Updated Default Weights
```typescript
FROM_TABLEAU: 5  // Changed from 10
```

---

## Group 2 Results: Tableau Destination Weights

**Date**: January 2025
**Games per config**: 100
**Total games**: 900
**Training time**: ~1.5 minutes

### Weights Tested
- TO_OWN_TABLEAU: 3, 5, 10 (default: 5)
- TO_OPPONENT_TABLEAU: 8, 15, 30 (default: 15)

### Key Findings

#### Baseline is optimal!
- Current defaults (TO_OWN_TABLEAU=5, TO_OPPONENT_TABLEAU=15) achieved best win rate of 57%
- No changes needed

#### TO_OWN_TABLEAU = 5 is optimal
- Higher values (10) hurt performance significantly (42-50%)
- Lower values (3) are close but not better

#### TO_OPPONENT_TABLEAU - no clear pattern
- Default (15) performs well
- Changes don't significantly improve results

### Top 5 Configurations

| Rank | Win Rate | Configuration |
|------|----------|---------------|
| 1 | 57% | baseline |
| 2 | 56% | TO_OWN_TABLEAU=3 |
| 3 | 56% | TO_OPPONENT_TABLEAU=30 |
| 4 | 55% | TO_OWN_TABLEAU=3, TO_OPPONENT_TABLEAU=30 |
| 5 | 50% | TO_OWN_TABLEAU=10, TO_OPPONENT_TABLEAU=30 |

### Updated Default Weights
No changes - defaults are already optimal.

---

## Group 3 Results: Attack Weights

**Date**: January 2025
**Games per config**: 100
**Total games**: 900
**Training time**: ~1.5 minutes

### Weights Tested
- ATTACK_RESERVE: 40, 80, 160 (default: 80)
- ATTACK_WASTE: 35, 70, 140 (default: 70)

### Key Findings

#### Lower attack weights are better
- ATTACK_RESERVE=40, ATTACK_WASTE=35 achieved 51% win rate
- Baseline (80, 70) only achieved 45%
- **Insight**: The AI plays better when it doesn't over-prioritize attacking the opponent. Focus on your own progress first.

### Top 5 Configurations

| Rank | Win Rate | Configuration |
|------|----------|---------------|
| 1 | 51% | ATTACK_RESERVE=40, ATTACK_WASTE=35 |
| 2 | 51% | ATTACK_WASTE=140 |
| 3 | 48% | ATTACK_WASTE=35 |
| 4 | 47% | ATTACK_RESERVE=160, ATTACK_WASTE=35 |
| 5 | 46% | ATTACK_RESERVE=40, ATTACK_WASTE=140 |

### Updated Default Weights
```typescript
ATTACK_RESERVE: 40  // Changed from 80
ATTACK_WASTE: 35    // Changed from 70
```

---

## Group 4 Results: Bonus Weights

**Date**: January 2025
**Games per config**: 100
**Total games**: 2,700
**Training time**: ~4 minutes

### Weights Tested
- CREATES_EMPTY_TABLEAU: -5, -10, -20 (default: -10)
- PLAYS_ACE: 10, 20, 40 (default: 20)
- PLAYS_TWO: 8, 15, 30 (default: 15)

### Key Findings

#### CREATES_EMPTY_TABLEAU = -20 is optimal (default was -10)
- Stronger penalty for creating empty tableaus helps
- **Insight**: Empty tableaus are less useful in this game, avoid creating them.

#### PLAYS_ACE = 10 is optimal (default was 20)
- Appears in top 4 configurations
- **Insight**: Don't over-prioritize playing aces to foundations.

#### PLAYS_TWO - no clear pattern
- Default (15) performs fine

### Top 5 Configurations

| Rank | Win Rate | Configuration |
|------|----------|---------------|
| 1 | 57% | CREATES_EMPTY_TABLEAU=-20, PLAYS_ACE=10 |
| 2 | 56% | CREATES_EMPTY_TABLEAU=-5, PLAYS_ACE=10, PLAYS_TWO=8 |
| 3 | 56% | PLAYS_ACE=10, PLAYS_TWO=30 |
| 4 | 55% | PLAYS_ACE=10, PLAYS_TWO=8 |
| 5 | 54% | PLAYS_TWO=30 |

### Updated Default Weights
```typescript
CREATES_EMPTY_TABLEAU: -20  // Changed from -10
PLAYS_ACE: 10               // Changed from 20
```

---

## Group 5 Results: Offensive Strategy Balance

**Date**: January 2025
**Games per config**: 100
**Total games**: 2,700
**Training time**: ~3.7 minutes

### Weights Tested
- TO_OPPONENT_TABLEAU: 8, 15, 30 (default: 15)
- ATTACK_RESERVE: 20, 40, 80 (default: 40)
- ATTACK_WASTE: 18, 35, 70 (default: 35)

### Key Findings

#### ATTACK_WASTE = 18 is optimal (was 35)
- Clear winner at 65% win rate
- Even lower than our already-lowered value
- **Insight**: Attacking opponent's waste is overrated. Focus on your own game instead.

#### ATTACK_RESERVE - mixed results
- Both 40 and 80 appear in top configs
- Keep default (40)

#### TO_OPPONENT_TABLEAU - no clear pattern
- Default (15) is fine

### Top 5 Configurations

| Rank | Win Rate | Configuration |
|------|----------|---------------|
| 1 | 65% | ATTACK_WASTE=18 |
| 2 | 64% | ATTACK_RESERVE=80, ATTACK_WASTE=18 |
| 3 | 63% | ATTACK_WASTE=18, TO_OPPONENT_TABLEAU=8 |
| 4 | 63% | ATTACK_RESERVE=80, ATTACK_WASTE=70, TO_OPPONENT_TABLEAU=30 |
| 5 | 61% | ATTACK_RESERVE=80, ATTACK_WASTE=18, TO_OPPONENT_TABLEAU=8 |

### Updated Default Weights
```typescript
ATTACK_WASTE: 18  // Changed from 35
```

---

## Final Optimized Weights

All training complete. Here are the final optimized weights:

```typescript
export const DEFAULT_WEIGHTS: ScoreWeights = {
  TO_FOUNDATION: 50,         // Changed from 100
  ATTACK_RESERVE: 40,        // Changed from 80
  ATTACK_WASTE: 18,          // Changed from 70 -> 35 -> 18
  FROM_RESERVE: 50,          // Unchanged
  FROM_WASTE: 30,            // Unchanged
  FROM_TABLEAU: 5,           // Changed from 10
  TO_OWN_TABLEAU: 5,         // Unchanged
  TO_OPPONENT_TABLEAU: 15,   // Unchanged
  EMPTIES_RESERVE: 200,      // Unchanged (no impact)
  CREATES_EMPTY_TABLEAU: -20, // Changed from -10
  PLAYS_ACE: 10,             // Changed from 20
  PLAYS_TWO: 15,             // Unchanged
}
```

### Summary of Changes

| Weight | Original | Optimized | Change |
|--------|----------|-----------|--------|
| TO_FOUNDATION | 100 | 50 | -50% |
| ATTACK_RESERVE | 80 | 40 | -50% |
| ATTACK_WASTE | 70 | 18 | -74% |
| FROM_TABLEAU | 10 | 5 | -50% |
| CREATES_EMPTY_TABLEAU | -10 | -20 | +100% penalty |
| PLAYS_ACE | 20 | 10 | -50% |

### Key Insights

1. **Less aggressive is better**: Lower attack weights, especially ATTACK_WASTE
2. **Focus on your own game**: Deprioritize tableau moves, focus on depleting reserve/waste
3. **Avoid empty tableaus**: Stronger penalty helps
4. **Don't rush aces**: Lower priority for playing aces to foundations
5. **Attacking waste is overrated**: The biggest single improvement came from lowering ATTACK_WASTE

### Other Improvements to Consider

- Remove EMPTIES_RESERVE weight entirely (has no effect)
- Explore deeper look-ahead (depth=3) if performance allows
- Add more sophisticated exploration strategies

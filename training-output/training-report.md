# Overnight AI Training Report

**Generated:** 2026-01-27 16:53:20
**Training Duration:** 18m 37s
**Total Games Played:** 2,000
**Generations Completed:** 10

## Best Configuration

**Win Rate:** 65.0%
**Record:** 13W / 6L / 1D

### Optimized Weights

```typescript
const OVERNIGHT_OPTIMIZED_WEIGHTS: ScoreWeights = {
  TO_FOUNDATION: 148, // was 56
  ATTACK_RESERVE: 58, // was 63
  ATTACK_WASTE: 0, // was 8
  FROM_RESERVE: 32, // was 21
  FROM_WASTE: 31, // was 24
  FROM_TABLEAU: 3, // was 5
  TO_OWN_TABLEAU: 30, // was 24
  TO_OPPONENT_TABLEAU: 20, // was 24
  EMPTIES_RESERVE: 103, // was 118
  CREATES_EMPTY_TABLEAU: -10, // was -8
  PLAYS_ACE: 14, // was 0
  PLAYS_TWO: 17, // was 24
  POINTLESS_TABLEAU_SHUFFLE: -110, // was -43
  TABLEAU_MOVE_NO_BENEFIT: -128, // was -80
  CREATES_USEFUL_EMPTY: 45, // was 54
  DRAW_AVOIDANCE_EMPTY_BONUS: 28, // was 40
  STACK_HEIGHT_BONUS: 8,
  SPREAD_PENALTY: -11, // was -15
}
```

## Training Progress

| Generation | Best Win Rate | Avg Win Rate | Notable Changes |
|------------|---------------|--------------|-----------------|
| 1 | 50.0% | 31.5% | TO_FOUNDATION=71, ATTACK_RESERVE=58, FROM_WASTE=31 |
| 2 | 50.0% | 32.0% | TO_FOUNDATION=71, ATTACK_RESERVE=58, FROM_WASTE=31 |
| 3 | 60.0% | 41.0% | TO_FOUNDATION=112, ATTACK_RESERVE=58, ATTACK_WASTE=0 |
| 4 | 60.0% | 42.5% | TO_FOUNDATION=112, ATTACK_RESERVE=58, ATTACK_WASTE=0 |
| 5 | 60.0% | 42.0% | TO_FOUNDATION=112, ATTACK_RESERVE=58, ATTACK_WASTE=0 |
| 6 | 60.0% | 46.5% | TO_FOUNDATION=112, ATTACK_RESERVE=58, ATTACK_WASTE=0 |
| 7 | 60.0% | 41.0% | TO_FOUNDATION=112, ATTACK_RESERVE=58, ATTACK_WASTE=0 |
| 8 | 60.0% | 51.0% | TO_FOUNDATION=112, ATTACK_RESERVE=58, ATTACK_WASTE=0 |
| 9 | 60.0% | 45.5% | TO_FOUNDATION=112, ATTACK_RESERVE=58, ATTACK_WASTE=0 |
| 10 | 65.0% | 47.5% | TO_FOUNDATION=148, ATTACK_RESERVE=58, ATTACK_WASTE=0 |

## Weight Evolution

Key weight changes from baseline:

- **TO_FOUNDATION**: 56 -> 148 (increased 164%)
- **ATTACK_WASTE**: 8 -> 0 (decreased 100%)
- **FROM_RESERVE**: 21 -> 32 (increased 52%)
- **FROM_WASTE**: 24 -> 31 (increased 29%)
- **FROM_TABLEAU**: 5 -> 3 (decreased 40%)
- **TO_OWN_TABLEAU**: 24 -> 30 (increased 25%)
- **TO_OPPONENT_TABLEAU**: 24 -> 20 (decreased 17%)
- **EMPTIES_RESERVE**: 118 -> 103 (decreased 13%)
- **CREATES_EMPTY_TABLEAU**: -8 -> -10 (decreased 25%)
- **PLAYS_ACE**: 0 -> 14 (increased 1400%)
- **PLAYS_TWO**: 24 -> 17 (decreased 29%)
- **POINTLESS_TABLEAU_SHUFFLE**: -43 -> -110 (decreased 156%)
- **TABLEAU_MOVE_NO_BENEFIT**: -80 -> -128 (decreased 60%)
- **CREATES_USEFUL_EMPTY**: 54 -> 45 (decreased 17%)
- **DRAW_AVOIDANCE_EMPTY_BONUS**: 40 -> 28 (decreased 30%)
- **SPREAD_PENALTY**: -15 -> -11 (increased 27%)

## Configuration Used

```json
{
  "populationSize": 10,
  "gamesPerEvaluation": 10,
  "generations": 10,
  "mutationRate": 0.3,
  "mutationStrength": 0.25,
  "eliteCount": 2,
  "tournamentSize": 3,
  "checkpointInterval": 2,
  "maxTurnsPerGame": 1000
}
```

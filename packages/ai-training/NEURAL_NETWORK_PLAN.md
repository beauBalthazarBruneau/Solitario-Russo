# Neural Network AI for Russian Bank

## Overview

Replace/augment the heuristic-based AI with a neural network that learns to evaluate game positions. The model will run entirely in-browser using TensorFlow.js.

## Current System

The existing AI uses:
- **Hand-tuned weights** (18 parameters) to score moves
- **Lookahead search** (depth 5, branch factor 2) to evaluate future positions
- **Evolutionary training** to optimize weights

**Limitation:** The weight-based system plateaued at ~82% win rate. A neural network can potentially learn more complex patterns.

---

## Proposed Architecture

### Value Network Approach

A **value network** predicts the probability of winning from any game state. This slots cleanly into the existing system:

```
Game State → Encoder → Neural Net → Win Probability (0-1)
```

For move selection:
1. Get all valid moves
2. For each move, simulate applying it
3. Run resulting state through the neural net
4. Pick the move with highest win probability

### Model Size (Browser Constraints)

Target: **< 1MB** model size for fast loading and inference

- Input: ~500-800 features
- Hidden layers: 2-3 layers, 128-256 neurons each
- Output: 1 neuron (sigmoid activation)
- Total params: ~100-200K

---

## State Encoding

### Card Representation

Each card needs to encode:
- **Suit** (4 options: hearts, diamonds, clubs, spades)
- **Rank** (13 options: A, 2-10, J, Q, K)
- **Deck** (2 options: A or B - there are two decks)

### Game State Features

#### Foundation Piles (8 piles)
For each foundation pile (0-7):
- Top card rank (0-13, where 0 = empty) → 8 features
- Pile suit (one-hot, 4 features each) → 32 features
- **Total: 40 features**

#### Tableau Piles (8 piles - 4 per player)
For each tableau pile:
- Is empty (1 feature)
- Pile height (normalized, 1 feature)
- Top card encoding (suit one-hot + rank normalized) → 5 features
- **Total: 8 × 7 = 56 features**

#### Reserve Piles (2 piles)
For each player:
- Cards remaining (normalized, 1 feature)
- Top card encoding (5 features)
- **Total: 2 × 6 = 12 features**

#### Waste Piles (2 piles)
For each player:
- Cards in waste (normalized, 1 feature)
- Top card encoding (5 features)
- **Total: 2 × 6 = 12 features**

#### Hand Piles (2 piles - hidden cards)
For each player:
- Cards remaining (normalized) → 2 features

#### Drawn Card
- Has drawn card (1 feature)
- Drawn card encoding (5 features)
- **Total: 6 features**

#### Game Meta
- Current player (1 feature, 0 or 1)
- Move count (normalized, 1 feature)
- **Total: 2 features**

### Alternative: Full Board Encoding

For richer representation, encode ALL visible cards:

- 8 tableau piles × max 20 cards × 6 features = 960 features
- Plus foundations, reserves, etc.

This captures card ordering in tableau stacks, which matters for strategy.

### Estimated Input Size

**Simple encoding:** ~130 features
**Rich encoding:** ~500-800 features

Start with simple, expand if needed.

---

## Training Pipeline

### 1. Data Generation

Generate training data via self-play:

```typescript
interface TrainingExample {
  state: number[]        // Encoded game state
  outcome: number        // 1 = player won, 0 = player lost
  moveNumber: number     // How far into the game
}
```

**Process:**
1. Play games using current bot vs itself (or random policy)
2. At each state, record the encoding
3. After game ends, label all states with final outcome
4. Apply discount for early moves (optional)

**Target:** 100K-1M training examples

### 2. Training

```typescript
// Pseudocode
const model = tf.sequential({
  layers: [
    tf.layers.dense({ inputShape: [NUM_FEATURES], units: 256, activation: 'relu' }),
    tf.layers.dropout({ rate: 0.2 }),
    tf.layers.dense({ units: 128, activation: 'relu' }),
    tf.layers.dropout({ rate: 0.2 }),
    tf.layers.dense({ units: 1, activation: 'sigmoid' })
  ]
})

model.compile({
  optimizer: tf.train.adam(0.001),
  loss: 'binaryCrossentropy',
  metrics: ['accuracy']
})
```

### 3. Evaluation

Test trained model by:
1. Playing against the heuristic bot
2. Measuring win rate over 100+ games
3. Comparing move selection to heuristic

### 4. Iteration

If value network alone isn't enough:
- Add **policy network** (predicts move directly)
- Combine with **MCTS** (Monte Carlo Tree Search)
- Train via **reinforcement learning** (PPO, DQN)

---

## Integration with Existing Code

### New Files

```
packages/ai-training/
  src/
    neural/
      state-encoder.ts    # Game state → tensor
      model.ts            # TensorFlow.js model definition
      training.ts         # Training loop
      inference.ts        # Run model for move selection
    scripts/
      generate-training-data.ts
      train-model.ts
      evaluate-model.ts
```

### Browser Integration

```typescript
// In web-app
import * as tf from '@tensorflow/tfjs'

// Load pre-trained model
const model = await tf.loadLayersModel('/models/russian-bank/model.json')

// Use in AI
function evaluateState(state: GameState): number {
  const encoded = encodeGameState(state)
  const tensor = tf.tensor2d([encoded])
  const prediction = model.predict(tensor) as tf.Tensor
  return prediction.dataSync()[0]
}
```

---

## Development Phases

### Phase 1: Foundation (Current Sprint)
- [ ] Implement state encoder
- [ ] Define model architecture
- [ ] Create training data generator
- [ ] Set up training pipeline in Node.js

### Phase 2: Training
- [ ] Generate 100K training examples
- [ ] Train initial model
- [ ] Evaluate against heuristic bot
- [ ] Iterate on architecture/features

### Phase 3: Integration
- [ ] Export model for TensorFlow.js browser runtime
- [ ] Integrate into web app
- [ ] Add as new bot option ("Neural" difficulty)
- [ ] Performance optimization

### Phase 4: Enhancement (Future)
- [ ] Add policy network
- [ ] Implement MCTS
- [ ] Self-play reinforcement learning
- [ ] Continuous improvement pipeline

---

## Dependencies

```json
{
  "@tensorflow/tfjs": "^4.x",
  "@tensorflow/tfjs-node": "^4.x"  // For faster training in Node
}
```

---

## Open Questions

1. **Training target:** Should we predict absolute win probability, or relative advantage?

2. **State encoding:** Simple (130 features) vs rich (800 features)?

3. **Training data:** Self-play only, or include human games if available?

4. **Move selection:** Pure value network, or combine with existing lookahead?

5. **Model variants:** Train separate models for different skill levels?

---

## References

- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
- [AlphaZero Paper](https://arxiv.org/abs/1712.01815)
- [Deep Learning for Card Games](https://arxiv.org/abs/1711.08946)

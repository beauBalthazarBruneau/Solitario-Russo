# Supabase Integration Plan

## Overview

Integrate Supabase for user authentication, game storage, multiplayer matchmaking, and collecting training data for the neural network.

---

## Database Schema

### Users (handled by Supabase Auth)
- `id` (uuid, primary key)
- `email`
- `created_at`
- `display_name` (profile)

### Games
```sql
create table games (
  id uuid primary key default gen_random_uuid(),
  seed integer not null,
  player1_id uuid references auth.users(id),
  player2_id uuid references auth.users(id), -- null for vs bot
  bot_id text, -- 'neural', 'cali', etc. null for pvp
  winner text, -- 'player1', 'player2', or null (in progress)
  history text[] not null default '{}',
  move_count integer not null default 0,
  status text not null default 'in_progress', -- 'in_progress', 'completed', 'abandoned'
  created_at timestamptz default now(),
  completed_at timestamptz,

  -- For training data
  used_for_training boolean default false
);
```

### Game States (for multiplayer real-time sync)
```sql
create table game_states (
  game_id uuid primary key references games(id),
  state jsonb not null, -- Full GameState serialized
  current_turn text not null, -- 'player1' or 'player2'
  updated_at timestamptz default now()
);
```

### Player Stats
```sql
create table player_stats (
  user_id uuid primary key references auth.users(id),
  games_played integer default 0,
  games_won integer default 0,
  games_vs_bot integer default 0,
  games_vs_human integer default 0,
  win_streak integer default 0,
  best_win_streak integer default 0
);
```

---

## Features

### 1. User Authentication
- Sign up / Sign in with email
- Anonymous play (games not saved)
- Link anonymous account to email later

### 2. Game Storage
- Auto-save completed games for logged-in users
- Game history viewable in profile
- Replay past games

### 3. Multiplayer
- **Matchmaking**: Queue system for finding opponents
- **Private games**: Share link to invite friend
- **Real-time sync**: Supabase Realtime for game state updates
- **Turn notifications**: Know when opponent has played

### 4. Training Data Collection
- Store all completed games (with consent)
- Flag games where human beat the bot
- Periodic export for neural network training
- Privacy: anonymize data before training

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Web App       │────▶│   Supabase      │
│   (React)       │     │                 │
│                 │◀────│  - Auth         │
│  - Game UI      │     │  - Database     │
│  - Neural Bot   │     │  - Realtime     │
│  - Multiplayer  │     │  - Edge Funcs   │
└─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Training       │
                        │  Pipeline       │
                        │                 │
                        │  - Export games │
                        │  - Train model  │
                        │  - Deploy model │
                        └─────────────────┘
```

---

## Implementation Phases

### Phase 1: Auth & Game Storage
1. Set up Supabase project
2. Add `@supabase/supabase-js` to web-app
3. Create auth UI (sign in/up modal)
4. Save completed games to database
5. Add game history to user profile

### Phase 2: Training Pipeline
1. Create export script for training data
2. Filter for human-wins-vs-bot games
3. Add to training data generation
4. Retrain model with new data
5. Deploy updated model

### Phase 3: Multiplayer
1. Add matchmaking queue (Supabase Edge Function)
2. Create game invites with shareable links
3. Implement real-time game state sync
4. Add turn notifications
5. Handle disconnections/reconnections

### Phase 4: Leaderboards & Social
1. Global leaderboard
2. Friends list
3. Challenge friends to games
4. Spectate live games

---

## API Design

### Supabase Client Setup
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)
```

### Save Game
```typescript
async function saveGame(game: CompletedGame) {
  const { data, error } = await supabase
    .from('games')
    .insert({
      seed: game.seed,
      player1_id: user.id,
      bot_id: game.botId,
      winner: game.winner,
      history: game.history,
      move_count: game.moveCount,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
}
```

### Real-time Game Subscription
```typescript
const channel = supabase
  .channel(`game:${gameId}`)
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'game_states' },
    (payload) => {
      setGameState(payload.new.state)
    }
  )
  .subscribe()
```

### Matchmaking Queue
```typescript
// Edge function: /functions/matchmaking
async function findMatch(userId: string) {
  // 1. Add to queue
  // 2. Check for waiting players
  // 3. If match found, create game and notify both
  // 4. Return game_id or 'waiting'
}
```

---

## Environment Variables

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Security

### Row Level Security (RLS)
```sql
-- Users can only see their own games
create policy "Users can view own games"
  on games for select
  using (auth.uid() = player1_id or auth.uid() = player2_id);

-- Users can only insert games they're part of
create policy "Users can create games"
  on games for insert
  with check (auth.uid() = player1_id);
```

### Data Privacy
- Training data export excludes user IDs
- Only game history and winner used for training
- Users can opt-out of training data collection
- GDPR: users can request data deletion

---

## Cost Estimate

Supabase Free Tier includes:
- 500MB database
- 1GB file storage
- 2GB bandwidth
- 50,000 monthly active users

Should be sufficient for initial launch. Upgrade if needed (~$25/mo for Pro).

---

## ELO Rating System

### Overview
Implement ELO-based rating for multiplayer matchmaking and leaderboards.

### Schema
```sql
alter table player_stats add column elo integer default 1200;
alter table games add column player1_elo_before integer;
alter table games add column player2_elo_before integer;
alter table games add column player1_elo_after integer;
alter table games add column player2_elo_after integer;
```

### ELO Calculation
- Starting ELO: 1200
- K-factor: 32 (higher volatility for new players)
- Standard ELO formula for expected score and rating change
- Only update ELO for ranked multiplayer games (not vs bot)

### Matchmaking
- Match players within ~200 ELO range
- Expand range over time if no match found
- Option for "ranked" vs "casual" games

---

## Open Questions

1. Should anonymous users be able to play multiplayer?
2. How to handle abandoned games in multiplayer?
3. Mobile app considerations?
4. Separate ELO for different bot difficulties?

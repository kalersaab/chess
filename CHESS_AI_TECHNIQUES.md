# Chess AI Search Techniques

## Overview
This document describes the advanced search algorithms and pruning techniques used in the chess engine to accelerate move evaluation and find the best moves efficiently.

---

## Alpha-Beta Pruning

### What it is
Alpha-Beta pruning is a minimax algorithm optimization that eliminates branches of the search tree that cannot influence the final decision.

### How it works
- **Alpha**: Lower bound on the value a maximizing node can achieve
- **Beta**: Upper bound on the value a minimizing node can achieve
- **Pruning**: If `alpha >= beta`, we can stop searching because the opponent will never allow this branch in the game

### Code Implementation
```cpp
if (alpha >= beta) {
    // Prune: no need to search further
    break;
}
```

### Benefits
- Reduces search space exponentially
- Maintains exact solution optimality
- Enables deeper searches in same time

---

## Null-Move Pruning (NMP)

### What it is
Null-move pruning is a forward pruning technique that assumes the current player can pass their turn and still maintain a good position. If the opponent cannot exploit this passed opportunity, the position is too good to refute and can be pruned.

### Key Principle
**If a position is so good that even passing your turn doesn't lose, then most defensive moves in this position won't work either.**

### How it works

1. **Make a null move**: Skip the current player's turn
2. **Search with reduced depth**: R (reduction factor)
   - R = 2 for most depths
   - R = 3 for deep searches (depth >= 6)
3. **Restore position**: Undo the null move
4. **Evaluate result**:
   - If score >= beta: **PRUNE** (position too good, opponent can't refute)
   - Otherwise: Continue normal search

### Code Implementation
```cpp
// Null-move pruning
if (allowNull && depth >= 3 && !isInCheck(state, state.whiteTurn)) {
    const int R = depth >= 6 ? 3 : 2; // Reduction factor
    
    // Make null move (skip turn)
    UndoRecord undo;
    undo.whiteTurn = state.whiteTurn;
    undo.enPassantX = state.enPassantX;
    undo.enPassantY = state.enPassantY;
    state.enPassantX = state.enPassantY = -1;
    state.whiteTurn = !state.whiteTurn;
    
    // Search with reduced depth, disallow another null move
    int nullScore = -alphaBeta(depth - R - 1, ply + 1, -beta, -beta + 1, false);
    
    // Restore position
    state.whiteTurn = undo.whiteTurn;
    state.enPassantX = undo.enPassantX;
    state.enPassantY = undo.enPassantY;
    
    // Prune if null move fails high
    if (nullScore >= beta)
        return beta;
}
```

### When NMP is NOT Applied
- **In check**: Cannot make a null move when in check
- **Shallow depth**: Only applied at depth >= 3
- **Recursive null moves**: Set `allowNull = false` in null-move search to prevent multiple consecutive null moves

### Parameters
- **Depth threshold**: 3 plies minimum
- **Reduction factor (R)**:
  - Standard: R = 2
  - Deep searches: R = 3 (depth >= 6)

### Verification Window
- Search window: `-beta` to `-beta + 1`
- This is a narrow window that quickly determines if null move fails high
- If score > -beta + 1, we know it fails high without full search

### Benefits
- **50-80% speedup** in typical positions
- Particularly effective in:
  - Quiet positions (no tactical complications)
  - Positions after capture sequences
  - Positions with material advantage
- **Maintains correctness**: Cannot return incorrect scores

### Limitations
- **Zugzwang positions**: May fail in positions where having a move is better than passing
  - Example: Endings with limited moves, restricted pieces
  - Rare in general chess positions
- **Verification required**: Must verify null-move cutoff with full search in rare cases

---

## Move Ordering

### Why it matters
Alpha-beta pruning effectiveness depends heavily on move ordering. Good moves should be searched first to maximize cutoffs.

### Implementation
Moves are ordered by:

1. **Transposition Table Best Move** (Score: 2,000,000)
   - Best move from previous searches
   - Highest priority

2. **Captures and Promotions** (Score: 900,000+)
   - Sorted by MVV-LVA (Most Valuable Victim, Least Valuable Attacker)
   - Material gain moves first

3. **En Passant** (Score: 900,000)
   - Special capture move

4. **Promotions** (Score: 850,000+)
   - Sorted by promoted piece value

5. **Killer Moves** (Score: 700,000-800,000)
   - Non-capture moves that caused cutoffs at sibling nodes
   - Likely to be good in similar positions

6. **History Heuristic** (Score: Variable)
   - Quiet moves sorted by historical success rate
   - Moves that caused cutoffs before are prioritized

### Formula for Move Scoring
```
Score = 
  2,000,000 (if TT best move)
  900,000 + 10*victim_value - attacker_value (if capture)
  900,000 (if en passant)
  850,000 + promotion_piece_value (if promotion)
  800,000 (if killer 1)
  700,000 (if killer 2)
  history[side][from_square][to_square] (quiet moves)
```

---

## Killer Heuristic

### What it is
Moves that caused beta cutoffs at sibling nodes (same depth, different branch) are stored as "killer moves".

### Why it works
If a move caused a cutoff in a similar position at the same depth, it's likely to work well in related positions.

### Implementation
```cpp
void Searcher::storeKiller(int ply, const Move &m) {
    if (ply >= MAX_PLY) return;
    if (state.bd[sq(m.toX, m.toY)] != EMPTY) return; // Only quiet moves
    if (!(killers[ply][0] == m)) {
        killers[ply][1] = killers[ply][0];
        killers[ply][0] = m;
    }
}
```

### Storage
- 2 killers per depth (up to 64 depths)
- Track most recent and previous best moves
- Only quiet (non-capture) moves

---

## History Heuristic

### What it is
A table tracking which quiet moves have historically caused cutoffs in search.

### Implementation
```cpp
int history[2][64][64];  // [side][from_square][to_square]

// On cutoff, increment history score
history[side][m.fromX*8+m.fromY][m.toX*8+m.toY] += depth * depth;

// Use as move ordering score
```

### Why depth²?
- Cutoffs at deeper levels are more significant
- Indicate strong moves that work across many positions
- Exponential weighting emphasizes important moves

---

## Transposition Table (TT)

### What it is
A hash table storing previously evaluated positions to avoid re-searching identical positions in different move orders.

### Benefits
- Stores: Position hash, score, depth, search type, best move
- Avoids duplicate work when same position reached via different move sequences
- Significantly speeds up endgames and tactical positions

### Implementation
```cpp
const TTEntry *entry = tt.probe(hash);
if (entry && entry->depth >= depth) {
    switch (entry->flag) {
        case TTFlag::EXACT:  return entry->score;
        case TTFlag::LOWER:  alpha = std::max(alpha, entry->score);
        case TTFlag::UPPER:  beta = std::min(beta, entry->score);
    }
}
```

### Flags
- **EXACT**: Score is exact in this position
- **LOWER**: Score is lower bound (alpha cutoff)
- **UPPER**: Score is upper bound (beta cutoff)

---

## Quiescence Search

### What it is
Extended search that only evaluates captures and promotions at depth 0, ensuring all forcing moves are explored.

### Why needed
Positions can look drastically different after forcing sequences. Without quiescence search, the engine can miss tactical blows.

### Implementation
```cpp
int Searcher::quiescence(int alpha, int beta) {
    int standPat = evaluate(state);
    if (standPat >= beta) return beta;  // Stand pat (don't capture)
    
    // Only search captures, sorted by victim value
    auto moves = generateCaptureMoves(state, state.whiteTurn);
    // ... evaluate each capture
}
```

### Benefits
- Avoids "horizon effect" (missing tactics at search edge)
- Ensures forcing sequences are fully evaluated
- Small performance cost, huge accuracy gain

---

## Iterative Deepening

### What it is
Searching progressively deeper (depth 1, 2, 3, ..., max) rather than jumping to maximum depth.

### Why it works
- Shallow searches find good moves quickly
- Time-bounded: Returns best move found so far if time runs out
- Enables better move ordering for deeper searches

### Implementation
```cpp
for (int depth = 1; depth <= maxDepth; depth++) {
    // Search entire tree at this depth
    // Use previous best move to order current search
}
```

### Overhead
- Theoretically 33% slower (1 + 1/2 + 1/4 + ...)
- In practice, massive speedup due to better move ordering
- Net: 20-30% faster overall

---

## Performance Impact

### Without optimizations
- Depth 4: ~10 million nodes
- Depth 5: ~100 million nodes (10x slower)

### With optimizations
- Alpha-beta pruning: ~50-90% reduction
- Null-move pruning: ~50-80% additional reduction
- Move ordering: ~50-200% speedup
- TT + Killer + History: ~20-30% speedup

### Combined Effect
- **Depth 4**: Evaluates 0.5-2M nodes (instead of 10M)
- **Depth 5**: Evaluates 5-20M nodes (instead of 100M)
- **Depth 6**: Feasible in reasonable time

---

## Algorithm Summary

```
alphaBeta(depth, ply, alpha, beta, allowNull):
    1. Probe transposition table
    2. If depth == 0, return quiescence search
    3. If allowNull and good position, try null-move pruning
    4. Generate and order moves
    5. For each legal move:
        a. Apply move
        b. Recursively search with (depth-1)
        c. Undo move
        d. Update alpha/beta
        e. If alpha >= beta, prune (store killer)
    6. Store result in TT
    7. Return best score
```

---

## Tuning Parameters

### For faster analysis (real-time)
```cpp
const int R = 2;  // Conservative reduction
// MAX_DEPTH = 4
```

### For deeper analysis
```cpp
const int R = (depth >= 6) ? 3 : 2;  // Adaptive reduction
// MAX_DEPTH = 6-8
```

### For endgame accuracy
```cpp
// Increase TT size
// Increase MAX_PLY for killer tracking
// More quiescence search depth
```

---

## References

- **Alpha-Beta Pruning**: Knuth & Moore, "An Analysis of Alpha-Beta Pruning" (1975)
- **Null-Move Pruning**: Goetsch & Campbell, "Null-Move Pruning in Chess" (1990)
- **Killer Heuristic**: Akl & Newborn (1977)
- **History Heuristic**: Schaeffer (1983)


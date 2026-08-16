# Late Move Reduction - Quick Reference

## What is LMR?

A search optimization that reduces search depth for weak moves, speeding up the engine by 2-4x without losing strength.

## When is LMR Applied?

```
Condition 1: Move Index ≥ 3 (after first few moves)
Condition 2: Depth ≥ 3 (enough depth to reduce)
Condition 3: Not a capture (need to evaluate capturing moves carefully)
Condition 4: Not a promotion (promotions are valuable)
Condition 5: Not a killer move (they showed promise before)
```

## How Much to Reduce?

```
Reduction = log2(moveIndex) / 2 + log2(depth) / 4

Examples:
- Move 4, Depth 6: reduce by 1 ply  → search 5 instead of 6
- Move 8, Depth 8: reduce by 1 ply  → search 7 instead of 8
- Move 16, Depth 12: reduce by 2 plies → search 10 instead of 12
```

## Search Pattern

```
if (moveIndex == 0) {
    // First move: always search at full depth
    fullDepthSearch(depth);
} else if (isCapture || isPromotion || isKiller) {
    // Critical moves: full depth search
    principalVariationSearch(depth);
} else {
    // Quiet moves: try reduced depth first
    reducedScore = search(depth - reduction);
    if (reducedScore > alpha && reducedScore < beta) {
        // If promising, verify at full depth
        fullScore = search(depth);
    }
}
```

## Performance Numbers

### Expected Improvement
- Nodes searched: **-40% to -50%**
- Time per move: **-30% to -40%**
- Achievable depth: **+1 ply in same time**

### Example Search
```
Without LMR:
Depth 6: 5M nodes in 2 seconds (weak play)

With LMR:
Depth 7: 5M nodes in 2 seconds (stronger play)
```

## Implementation in This Engine

### File: `Search.cpp`
- **Function**: `getLMRReduction()` - Calculates reduction amount
- **Modified**: `alphaBeta()` loop - Applies LMR to quiet moves

### File: `Search.h`
- **Added**: `getLMRReduction()` method declaration

## Configuration

### Current Settings
```cpp
// Reduction starts after move 3
if (moveIdx < 3) return 0;

// Only for depth 3+
if (depth < 3) return 0;

// Formula: log-based reduction
reduction = (logMoveIdx + 1) / 2 + (logDepth + 1) / 4;

// Cap reduction at (depth - 1)
reduction = min(reduction, depth - 1);
```

### Tuning Guide

**Make stronger (more pruning):**
```cpp
// More aggressive reduction
if (moveIdx < 2) return 0;  // Start after move 2 instead of 3

// Stronger formula
reduction = (logMoveIdx + 1) / 2 + (logDepth + 1) / 3;

// More positions get LMR
if (depth < 2) return 0;  // Apply even at shallow depth
```

**Make conservative (less pruning):**
```cpp
// Less aggressive reduction
if (moveIdx < 4) return 0;  // Start after move 4 instead of 3

// Weaker formula
reduction = (logMoveIdx + 2) / 3 + (logDepth + 1) / 5;

// Fewer positions get LMR
if (depth < 4) return 0;  // Don't apply at shallow depth
```

## Debugging

### Check if LMR is Working
```cpp
// Add this to see reductions being applied:
if (shouldUseLMR) {
    std::cerr << "LMR: Depth " << depth << " Move " << moveIdx 
              << " Reducing by " << lmrReduction << std::endl;
}
```

### Measure Impact
```bash
# Without LMR (comment out shouldUseLMR line)
time ./chess_engine position depth=6

# With LMR (normal build)
time ./chess_engine position depth=6

# Should be 2-4x faster for similar depth
```

## Key Interactions

| Technique | Interaction with LMR |
|-----------|----------------------|
| Alpha-Beta Pruning | LMR works within alpha-beta framework |
| Transposition Table | Reduced searches benefit from TT hits |
| Null Move Pruning | Both prune; use with care at shallow depth |
| Killer Heuristics | Don't reduce killer moves |
| Move Ordering | Depends on good move ordering quality |
| Quiescence Search | Not affected; only in main search |

## Common Mistakes to Avoid

1. **Not excluding captures** - Will miss tactics
2. **Not excluding promotions** - Loses strong moves
3. **Not excluding killers** - Wastes reduction potential
4. **Reducing too early** - Set moveIdx threshold correctly
5. **Reducing too aggressively** - Tune constants carefully

## Visual Example

```
Move ordering: [Great, Good, Okay, Weak1, Weak2, Weak3, ...]

Without LMR:
Move 0 (Great):  Depth 6 search ✓
Move 1 (Good):   Depth 6 search ✓
Move 2 (Okay):   Depth 6 search ✓
Move 3 (Weak1):  Depth 6 search (unnecessary!)
Move 4 (Weak2):  Depth 6 search (unnecessary!)
...

With LMR:
Move 0 (Great):  Depth 6 search ✓
Move 1 (Good):   Depth 6 search ✓
Move 2 (Okay):   Depth 6 search ✓
Move 3 (Weak1):  Depth 5 search → if promising: Depth 6 ✓
Move 4 (Weak2):  Depth 5 search → likely not promising, skip
...

Result: 30-50% fewer searches, much faster!
```

## Testing Positions

### Position 1: Tactical (many weak moves)
- LMR benefit: High (lots to prune)
- Depth improvement: +1-2 plies

### Position 2: Quiet (few moves, sharp evaluations)
- LMR benefit: Moderate
- Depth improvement: +0-1 plies

### Position 3: Endgame (few legal moves)
- LMR benefit: Low (little to prune)
- Depth improvement: 0 plies

## Next Steps for Enhancement

1. **Adaptive LMR** - Adjust based on position features
2. **Singular Extensions** - Extend unique moves
3. **Multi-cut** - Combine multiple pruning techniques
4. **Razoring** - Futility pruning for shallow depth

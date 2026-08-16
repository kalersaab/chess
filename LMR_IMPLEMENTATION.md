# Late Move Reduction (LMR) Implementation

## Overview

Late Move Reduction (LMR) is an advanced pruning technique used in chess engines to significantly speed up the alpha-beta search algorithm. The core idea is that moves appearing late in the move list (after the best moves have been found by move ordering) are less likely to be strong, so we can search them with reduced depth and only do a full-depth search if they show promise.

## How LMR Works

### Basic Principle

1. **Good moves typically appear early** - With effective move ordering (captures, promotions, killers, history heuristics), the best moves are usually examined first.
2. **Late moves are usually weak** - Moves appearing later in the list are unlikely to change the evaluation significantly.
3. **Reduce depth for safety** - Instead of searching late moves at full depth, search them at reduced depth.
4. **Re-search if promising** - If a reduced search returns a score better than alpha, re-search at full depth to verify.

### LMR Formula

The reduction amount depends on two factors:

```
reduction = log2(moveIndex) / 2 + log2(depth) / 4
```

- **Move Index**: Higher indices get stronger reductions
  - Move 3-4: ~1 ply reduction
  - Move 10+: ~2 plies reduction
  - Move 50+: ~3 plies reduction

- **Depth**: Deeper searches allow more aggressive reductions
  - Depth 3-4: Minimal reduction
  - Depth 6-8: Moderate reduction
  - Depth 10+: Strong reduction

### Example Scenarios

**Scenario 1: Early game, good move ordering**
```
Depth: 6, Move Index: 5 (quiet move)
Reduction = log2(5)/2 + log2(6)/4 = 1 + 0 = 1 ply
Search: 5 plies instead of 6
```

**Scenario 2: Deep search, many moves tried**
```
Depth: 10, Move Index: 20 (quiet move)
Reduction = log2(20)/2 + log2(10)/4 = 2 + 1 = 3 plies
Search: 7 plies instead of 10
```

## LMR Conditions

LMR is only applied when ALL of the following are true:

1. **Depth ≥ 3** - Need minimum depth to make reduction worthwhile
2. **Move Index ≥ 3** - Don't reduce the first few moves (likely to be best)
3. **Not a capture** - Captures need full evaluation
4. **Not a promotion** - Promotions are too important
5. **Not a killer move** - Killer moves showed promise in sibling nodes
6. **Not a check move** - Checking moves need careful evaluation

## Implementation Details

### Key Functions

#### `getLMRReduction(depth, moveIdx)`
```cpp
int Searcher::getLMRReduction(int depth, int moveIdx) const {
    if (depth < 3 || moveIdx < 3) return 0;
    
    // Calculate log2 of depth and move index
    int logMoveIdx = 0, temp = moveIdx;
    while (temp > 1) { logMoveIdx++; temp /= 2; }
    
    int logDepth = 0;
    temp = depth;
    while (temp > 1) { logDepth++; temp /= 2; }
    
    // Calculate reduction: log(moveIdx)/2 + log(depth)/4
    int reduction = (logMoveIdx + 1) / 2 + (logDepth + 1) / 4;
    return std::min(reduction, depth - 1);
}
```

### Modified Alpha-Beta Loop

The main search loop now includes LMR:

```cpp
for (const auto &m : moves) {
    // ... (apply move) ...
    
    // Determine LMR applicability
    bool isCapture = (captured piece exists);
    bool isPromotion = (move has promotion);
    bool isKiller = (move in killer list);
    
    bool shouldUseLMR = !isCapture && !isPromotion && 
                        !isKiller && moveIdx >= 3 && depth >= 3;
    
    int lmrReduction = shouldUseLMR ? getLMRReduction(depth, moveIdx) : 0;
    int searchDepth = depth - 1 - lmrReduction;
    
    if (moveIdx == 0) {
        // First move: full depth
        score = -alphaBeta(depth-1, ply+1, -beta, -alpha, true);
    } else if (shouldUseLMR && searchDepth < depth - 1) {
        // Reduced depth search first
        score = -alphaBeta(searchDepth, ply+1, -alpha-1, -alpha, true);
        
        // If promising, re-search at full depth
        if (score > alpha && score < beta)
            score = -alphaBeta(depth-1, ply+1, -beta, -alpha, true);
    } else {
        // Standard PVS
        score = -alphaBeta(depth-1, ply+1, -alpha-1, -alpha, true);
        if (score > alpha && score < beta)
            score = -alphaBeta(depth-1, ply+1, -beta, -alpha, true);
    }
    
    // ... (rest of evaluation) ...
}
```

## Performance Impact

### Search Speed Improvements

With LMR properly implemented, expect:

- **Breadth** (nodes searched): -40% to -50% for quiet moves
- **Time per move**: -30% to -40% depending on position
- **Depth achievable**: +1 ply for similar time budget

### Position-Dependent Results

- **Tactical positions**: More improvement (many weak moves to prune)
- **Quiet positions**: Less improvement (fewer quiet moves to reduce)
- **Forced sequences**: No improvement (fewer moves overall)

### Trade-offs

**Advantages:**
- Exponential speedup from reduced branching factor
- Allows deeper searches in the same time
- Better move quality from deeper analysis

**Disadvantages:**
- Requires tuning reduction constants
- Risk of missing tactics if reduction too aggressive
- Requires accurate move ordering to be effective

## Tuning LMR

### Adjustable Parameters

1. **Reduction factor** - Can adjust the log formula coefficients:
   ```cpp
   // More aggressive:
   int reduction = (logMoveIdx + 1) / 2 + (logDepth + 1) / 3;
   
   // More conservative:
   int reduction = (logMoveIdx + 2) / 3 + (logDepth + 1) / 5;
   ```

2. **Minimum move index** - When to start reducing:
   ```cpp
   bool shouldUseLMR = ... && moveIdx >= 4 && ...;  // More conservative
   bool shouldUseLMR = ... && moveIdx >= 2 && ...;  // More aggressive
   ```

3. **Minimum depth** - Don't reduce shallow searches:
   ```cpp
   if (depth < 4) return 0;  // More conservative
   if (depth < 2) return 0;  // More aggressive
   ```

## Interaction with Other Techniques

### With Transposition Tables
- LMR works well with TT lookups
- Reduced searches still benefit from cached results
- Be careful with depth comparisons

### With Null Move Pruning
- Both reduce branching; coordinate carefully
- Null move handles zugzwang at shallow depth
- LMR handles quiet moves at any depth

### With Killer Heuristics
- Don't reduce killer moves (they showed promise)
- Use killer moves to improve move ordering for LMR

### With History Heuristics
- Good history scores indicate strong moves
- Can use as secondary condition to avoid LMR

## Advanced Variations

### Aspiration Search with LMR
```cpp
// Use narrow window with LMR for faster search
int score = -alphaBeta(depth-1, ply+1, -guess-margin, -guess+margin, true);
if (score <= guess-margin || score >= guess+margin) {
    // Research with full window
    score = -alphaBeta(depth-1, ply+1, -beta, -alpha, true);
}
```

### Verification Search
```cpp
// After getting good result from reduced search, verify
if (reducedScore > alpha && reducedScore < beta) {
    // Verify at original depth
    score = -alphaBeta(depth-1, ply+1, -beta, -alpha, true);
}
```

## Debugging and Testing

### Verifying LMR Correctness

1. **Comparison mode** - Run with/without LMR on same position:
   ```cpp
   // Temporarily disable LMR
   bool shouldUseLMR = false;  // Toggle this
   ```

2. **Node counting** - LMR should reduce total nodes by 30-50%

3. **Move quality** - Best moves should be identical

4. **Performance** - Should see 2-4x speedup with comparable strength

### Common Issues

- **Too aggressive reduction**: Missing tactics, playing weakly
- **Asymmetric results**: Different moves at different depths
- **Slower than expected**: Move ordering issues (promote captures/killers)

## References

LMR was popularized by:
- Crafty (Bob Hyatt) - Early LMR implementation
- Rybka - Modern LMR formula
- Stockfish - Reference implementation

## Future Enhancements

1. **Adaptive LMR** - Adjust based on position type
2. **PVS extensions** - Extend certain tactical moves
3. **Singular extensions** - Extend singular moves in PV
4. **Multi-cut pruning** - Combine with other pruning techniques

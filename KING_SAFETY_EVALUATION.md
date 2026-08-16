# King Safety Evaluation in Chess Engine

## Overview
The chess engine evaluates board positions using a combination of **material count** and **positional tables (PST - Piece Square Tables)**. King safety is evaluated through the **King Piece Square Table (PST_KING_MG)** which guides the engine's strategy for king placement throughout the game.

---

## King Piece Square Table (PST_KING_MG)

The king's positional value changes based on its location on the board, helping the engine understand safe vs unsafe squares.

### King PST Values

```
      a    b    c    d    e    f    g    h
   +----+----+----+----+----+----+----+----+
8  |-30 |-40 |-40 |-50 |-50 |-40 |-40 |-30 |  Center is dangerous (castled kings)
7  |-30 |-40 |-40 |-50 |-50 |-40 |-40 |-30 |
6  |-30 |-40 |-40 |-50 |-50 |-40 |-40 |-30 |
5  |-30 |-40 |-40 |-50 |-50 |-40 |-40 |-30 |
4  |-20 |-30 |-30 |-40 |-40 |-30 |-30 |-20 |  Safer than center
3  |-10 |-20 |-20 |-20 |-20 |-20 |-20 |-10 |  Relatively safe
2  | 20 | 20 |  0 |  0 |  0 |  0 | 20 | 20 |  Safer corner positions
1  | 20 | 30 | 10 |  0 |  0 | 10 | 30 | 20 |  Safest (castled positions preferred)
   +----+----+----+----+----+----+----+----+
```

### Key Principles

1. **Opening/Early Game**: King prefers corners (a1, h1 for white) - typical castled positions
   - **Best scores**: +30 (b1), +20 (a1, h1)
   - Rationale: Castled position is safest from center attacks

2. **Middle Game**: King stays on flanks, avoids center
   - **Risky zone**: -50 (d8, e8, d1, e1 for white - center files)
   - **Acceptable**: -20 to -30 (c, f files)
   - Rationale: Center exposes king to attacks

3. **End Game**: Different evaluation (noted as MG - MiddleGame)
   - This PST is optimized for middle game
   - In end game, king becomes more active and should move toward center

---

## Evaluation Function

### Complete Evaluation Process

```cpp
int evaluate(const BoardSnapshot &snap) {
    int score = 0;
    
    // Iterate through all 64 squares
    for (int i = 0; i < 64; i++) {
        uint8_t p = snap.bd[i];
        if (p == EMPTY) continue;
        
        // Material value + Positional value
        int val = pieceValueFast(p) + *pstFor(p, sqRow(i), sqCol(i));
        
        // Add if white piece, subtract if black
        score += pieceIsWhite(p) ? val : -val;
    }
    
    // Perspective: positive = good for current turn player
    return snap.whiteTurn ? score : -score;
}
```

### Material Values (Base Piece Values)

| Piece | Value (Centipawns) |
|-------|-------------------|
| Pawn  | 100               |
| Knight| 320               |
| Bishop| 330               |
| Rook  | 500               |
| Queen | 900               |
| King  | 20000             |

---

## King Safety Strategy

### 1. King Position Goals

**White King (Row 0 = home rank):**
- **Opening**: e1 (0 points) - ready to castle
- **After castling kingside**: g1 (+30 points)
- **After castling queenside**: c1 (+10 points)
- **Avoid**: d1, e1 in endgame (0 points, exposed)

**Black King (Row 7 = home rank):**
- **Opening**: e8 (0 points) - ready to castle
- **After castling kingside**: g8 (+30 points)
- **After castling queenside**: c8 (+10 points)

### 2. Safe vs Unsafe Squares

**Safest Squares** (PST +20 to +30):
- b1, b8 (queenside castled)
- g1, g8 (kingside castled)
- h1, h8 (corner)

**Dangerous Squares** (PST -40 to -50):
- d-file & e-file (d1-d8, e1-e8)
- Center squares where attacks converge

**Transition Zone** (PST -10 to -30):
- Side files (a-c, f-h)
- Allow king movement toward edges

### 3. Penalties by Location

| Location | PST Value | Interpretation |
|----------|-----------|-----------------|
| d1/e1 (white center) | 0 | Neutral, pre-castle |
| d8/e8 (black center) | -50 | Very dangerous, uncastled |
| a1/h1 (white corners) | +20 | Safe position |
| g1 (kingside castle) | +30 | Very safe, standard position |
| c1 (queenside castle) | +10 | Safe but less ideal |
| d4/e4 (center) | -50 | Extremely exposed |

---

## How King Safety Affects AI

### Example Evaluation Scenario

**Position 1: After Kingside Castling**
```
White king on g1
- Material: 0 (just evaluation)
- PST value: +30
- Bonus: King is in safe position
- Engine preference: ✓ Good
```

**Position 2: Uncastled, Center Exposed**
```
White king on e1
- Material: 0
- PST value: 0 (neutral)
- Weakness: Exposed to Qd1+ or Ba6 tactics
- Engine preference: ✗ Risky
```

**Position 3: Premature Center King**
```
White king on d4
- Material: 0
- PST value: -50
- Danger: Multiple attack vectors
- Engine preference: ✗ Very dangerous
```

### AI Decision Making

The engine uses king safety to:

1. **Prioritize Castling**: High search value on moves leading to castling
2. **Avoid Tactics**: Penalizes king moves to central squares
3. **Defend King**: Considers opponent's attacking chances
4. **Calculate Lines**: Tracks if king moves lead to checks

---

## Detailed PST Breakdown

### White King (Normal Orientation)

**Rank 8 (Opponent's Home):**
```
a8: -30  b8: -40  c8: -40  d8: -50  e8: -50  f8: -40  g8: -40  h8: -30
```
- **Risk**: Deep in opponent territory, vulnerable to back rank threats

**Rank 7-5 (Middle Ranks):**
```
Rank 7: -30, -40, -40, -50, -50, -40, -40, -30  (High risk)
Rank 6: -30, -40, -40, -50, -50, -40, -40, -30  (High risk)
Rank 5: -30, -40, -40, -50, -50, -40, -40, -30  (High risk)
```
- **Risk**: Still somewhat exposed, but drifting toward safety

**Rank 4 (Lower Center):**
```
a4: -20  b4: -30  c4: -30  d4: -40  e4: -40  f4: -30  g4: -30  h4: -20
```
- **Risk**: Moderate, files a/h are safer

**Rank 3 (Near Home):**
```
a3: -10  b3: -20  c3: -20  d3: -20  e3: -20  f3: -20  g3: -20  h3: -10
```
- **Safety**: Good, approaching safe zone

**Rank 2 (Defensive):**
```
a2: +20  b2: +20  c2:   0  d2:   0  e2:   0  f2:   0  g2: +20  h2: +20
```
- **Safety**: Very safe, protected by pawns

**Rank 1 (Home Rank):**
```
a1: +20  b1: +30  c1: +10  d1:   0  e1:   0  f1: +10  g1: +30  h1: +20
```
- **Safest**: Castled positions (b1/g1) are optimal
- **Neutral**: Center (d1/e1) before castling
- **Moderate**: Queenside castle (c1/f1)

---

## King Safety in Different Phases

### Opening Phase
- **Focus**: Get king to safety via castling
- **Preferred Moves**: Develop pieces, castle early
- **Penalty**: Uncastled kings with open center files

### Middle Game
- **Focus**: Keep king on flanks, away from attacks
- **Acceptable Squares**: b1-g1 for white (after castling)
- **Risky Squares**: Any center square

### End Game
- **Strategy Shift**: PST_KING_MG may not be optimal
- **King Activity**: Becomes asset, helps promote pawns
- **Note**: Engine uses MG table only, may need EG improvement

---

## Implementation Details

### PST Array Indexing

```cpp
// Piece-square table is indexed by (row, col)
// For white: row 0 = rank 1 (home rank)
// For black: row 0 = rank 8 (home rank)
// Function handles perspective automatically

const int *pstFor(uint8_t p, int row, int col) {
    bool isW = pieceIsWhite(p);
    int r = isW ? row : (7 - row);  // Flip for black pieces
    
    switch (pieceType(p)) {
        // ... returns appropriate PST
        case 6: return &PST_KING_MG[r][col];
    }
}
```

### Score Calculation

```cpp
// Total evaluation = Material + PST
int totalValue = pieceValueFast(piece) + pstValue;

// Example: White King on g1
// = 20000 (material) + 30 (PST) = 20030 (safer than e1: 20000)
```

---

## Potential Improvements

1. **Endgame King Position Table**: Create PST_KING_EG for pawn endgames
2. **King Shelter Evaluation**: Count pawns protecting king
3. **Open File Attacks**: Penalize king on files with enemy rooks
4. **Attack Proximity**: Factor in distance to attacking pieces
5. **Pawn Shield**: Evaluate f/g/h pawns (white) as protection

### Example Enhancement
```cpp
// Check king shelter (currently not implemented)
int kingShelter(const BoardSnapshot &snap, bool white) {
    // Count defending pawns around king
    // Bonus: +10 per protecting pawn
    // Penalty: -20 per open file next to king
}
```

---

## Testing & Verification

### How to Verify King Safety Logic

1. **Test Position 1**: Uncastled kings
   - Expected: Engine prefers castling moves
   - Score: ~+50 to +100 advantage for castled side

2. **Test Position 2**: King in center
   - Expected: Engine avoids center king moves
   - Penalty: ~30-50 points per central king move

3. **Test Position 3**: Exposed king
   - Expected: Engine calculates tactical threats
   - Result: Massive penalty if checks available

---

## Summary

King safety evaluation in this engine is based on:

✓ **Material values** - King worth 20000 centipawns
✓ **Position bonuses** - Castled positions +30, center -50
✓ **Square evaluation** - Each square has specific safety rating
✓ **Strategic guidance** - Encourages safe, defensive play
✗ **Limited by PST** - Only middle-game table, no endgame distinction

The system effectively guides the AI to play safely in the opening/middlegame but may benefit from endgame-specific king activity evaluation.

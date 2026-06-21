#pragma once
#include <vector>
#include <string>

// ─────────────────────────────────────────────────────────────────────────────
// Evaluation — material + piece-square-table static eval
// ─────────────────────────────────────────────────────────────────────────────

// Centipawn value of each piece type
int pieceValue(char p);

// Positional bonus for a piece at (x, y); white/black mirrored automatically
int pieceSquareBonus(char p, bool isWhite, int x, int y);

// Full static evaluation of the board (positive = White ahead)
int evaluate(const std::vector<std::vector<std::string>> &board);

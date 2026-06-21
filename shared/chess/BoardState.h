#pragma once
#include <vector>
#include <string>

// ─────────────────────────────────────────────────────────────────────────────
// Move — lightweight struct used by both MoveGen and Search
// ─────────────────────────────────────────────────────────────────────────────
struct Move {
    int  fromX, fromY;
    int  toX,   toY;
    char promotion; // '\0' = none, else 'q' 'r' 'b' 'n'
};

// ─────────────────────────────────────────────────────────────────────────────
// BoardSnapshot — everything needed to undo a move
// ─────────────────────────────────────────────────────────────────────────────
struct BoardSnapshot {
    std::vector<std::vector<std::string>> board;
    bool whiteTurn;
    bool whiteKingMoved, blackKingMoved;
    bool whiteRookAMoved, whiteRookHMoved;
    bool blackRookAMoved, blackRookHMoved;
    int  enPassantX, enPassantY;
};

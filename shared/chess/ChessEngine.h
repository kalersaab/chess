#pragma once
#include "BoardState.h"
#include <string>
#include <vector>

// ─────────────────────────────────────────────────────────────────────────────
// ChessEngine — game rules, board state, and public API
//
// AI search is delegated to Searcher (Search.h/.cpp).
// Move generation is delegated to MoveGen.h/.cpp.
// Evaluation is delegated to Evaluation.h/.cpp.
// ─────────────────────────────────────────────────────────────────────────────

class ChessEngine {
public:
    ChessEngine();

    // ── Board / game ─────────────────────────────────────────────────────────
    void reset();
    std::string makeMove(const std::string &move);
    std::string getTurn() const;
    std::vector<std::vector<std::string>> getBoard() const;
    std::vector<std::string> getValidMoves(const std::string &square);
    bool isCheckmate(bool white);

    // ── Timer ────────────────────────────────────────────────────────────────
    void resetTimer();
    int  getWhiteTime() const;
    int  getBlackTime() const;
    bool tick(bool white, int seconds = 1);

    // ── AI ───────────────────────────────────────────────────────────────────
    // Returns the best move in UCI notation ("e2e4").
    // depth 4 = strong amateur play; raise to 5 for harder (slower) play.
    std::string getBestMove(bool white, int depth = 4);

    // ── Rule helpers (used internally and by MoveGen / Search via callbacks) ─
    bool isValidPieceMove(const std::string &piece,
                          int fromX, int fromY, int toX, int toY) const;
    bool isPathClear(int fromX, int fromY, int toX, int toY) const;
    bool isInCheck(bool white) const;
    bool isSquareAttacked(int x, int y, bool byWhite) const;
    bool canCastle(bool white, bool kingSide) const;

private:
    BoardSnapshot snap; // all mutable game state lives here

    static constexpr int DEFAULT_TIME = 10 * 60;
    int whiteSeconds;
    int blackSeconds;
};

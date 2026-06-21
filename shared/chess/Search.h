#pragma once
#include "BoardState.h"
#include "MoveGen.h"
#include <string>
#include <vector>
#include <functional>

// ─────────────────────────────────────────────────────────────────────────────
// Searcher — alpha-beta + quiescence search
//
// Operates on a BoardSnapshot reference so the engine stays in control
// of the actual board state; Search only borrows and restores it.
// ─────────────────────────────────────────────────────────────────────────────

class Searcher {
public:
    // 'state' is the live engine state that Search will mutate and restore.
    // 'isInCheckFn' / 'isValidMoveFn' / 'canCastleFn' are callbacks into
    // ChessEngine so Search does not duplicate rule logic.
    explicit Searcher(
        BoardSnapshot                                               &state,
        std::function<bool(bool white)>                             isInCheckFn,
        std::function<bool(const std::string &, int, int, int, int)> isValidMoveFn,
        std::function<bool(bool, bool)>                             canCastleFn
    );

    // Returns UCI string of the best move for 'white' at the given depth.
    std::string getBestMove(bool white, int depth);

private:
    BoardSnapshot &state;

    std::function<bool(bool)>                                        isInCheck;
    std::function<bool(const std::string &, int, int, int, int)>     isValidMove;
    std::function<bool(bool, bool)>                                   canCastle;

    MoveGenContext makeCtx() const;

    // Apply move onto state.board; returns false if move leaves own king in check
    bool applyMove(const Move &m);
    void undoMove(const BoardSnapshot &saved);

    // Quiescence search — resolves captures at leaf nodes to avoid horizon effect
    int quiescence(int alpha, int beta, bool maximizing);

    // Alpha-beta with quiescence at depth == 0
    int alphaBeta(int depth, int alpha, int beta, bool maximizing);
};

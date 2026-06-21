#pragma once
#include "BoardState.h"
#include <vector>
#include <string>
#include <functional>

// ─────────────────────────────────────────────────────────────────────────────
// MoveGen — move generation helpers
//
// These are free functions that operate on the board through a small set of
// callbacks supplied by ChessEngine, keeping MoveGen free from engine state.
// ─────────────────────────────────────────────────────────────────────────────

// Callbacks the move generator needs from the engine
struct MoveGenContext {
    const std::vector<std::vector<std::string>> &board;
    bool   whiteTurn;
    int    enPassantX;
    int    enPassantY;

    // Predicate: can 'white' side castle king/queen side right now?
    std::function<bool(bool white, bool kingSide)> canCastle;
    // Predicate: is piece move geometrically valid (does not check legality)?
    std::function<bool(const std::string &piece,
                       int fx, int fy, int tx, int ty)> isValidPieceMove;
    // Predicate: is 'white' king currently in check?
    std::function<bool(bool white)> isInCheck;
};

// All pseudo-legal moves for the given side (captures + quiet)
std::vector<Move> generateAllMoves(const MoveGenContext &ctx, bool white);

// Capture-only moves (+ en passant + promotions) for quiescence search.
// If the side is in check, returns all moves instead (to find escapes).
std::vector<Move> generateCaptureMoves(const MoveGenContext &ctx, bool white);

// Sort moves: captures first, then by victim value (MVV-LVA order)
void orderMoves(std::vector<Move> &moves,
                const std::vector<std::vector<std::string>> &board);

// Convert an internal Move to UCI notation ("e2e4", "a7a8q", …)
std::string moveToUCI(const Move &m);

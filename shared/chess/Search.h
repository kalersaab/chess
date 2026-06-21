#pragma once
#include "BoardState.h"
#include "MoveGen.h"
#include "TranspositionTable.h"
#include <string>
#include <vector>
#include <array>
#include <functional>

static constexpr int MAX_PLY = 64;
static constexpr int KILLERS_PER_PLY = 2;

class Searcher {
public:
    explicit Searcher(
        BoardSnapshot                                                &state,
        std::function<bool(bool)>                                    isInCheckFn,
        std::function<bool(const std::string &, int, int, int, int)> isValidMoveFn,
        std::function<bool(bool, bool)>                              canCastleFn
    );

    std::string getBestMove(bool white, int maxDepth);

private:
    BoardSnapshot &state;

    std::function<bool(bool)>                                        isInCheck;
    std::function<bool(const std::string &, int, int, int, int)>     isValidMove;
    std::function<bool(bool, bool)>                                   canCastle;

    TranspositionTable tt;

    std::array<std::array<Move, KILLERS_PER_PLY>, MAX_PLY> killers;

    int history[2][64][64];

    MoveGenContext makeCtx() const;
    bool applyMove(const Move &m);
    void undoMove(const BoardSnapshot &saved);

    void orderMovesEx(std::vector<Move> &moves,
                      const Move &ttBest,
                      int ply) const;

    void storeKiller(int ply, const Move &m);

    int quiescence(int alpha, int beta, bool maximizing);
    int alphaBeta(int depth, int ply, int alpha, int beta, bool maximizing);
};

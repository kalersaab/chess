#pragma once
#include "BoardState.h"
#include "MoveGen.h"
#include "TranspositionTable.h"
#include <string>
#include <vector>
#include <array>

static constexpr int MAX_PLY         = 64;
static constexpr int KILLERS_PER_PLY = 2;

class Searcher {
public:
    explicit Searcher(BoardSnapshot &state);
    std::string getBestMove(bool white, int maxDepth);

private:
    BoardSnapshot &state;
    TranspositionTable tt;
    std::array<std::array<Move, KILLERS_PER_PLY>, MAX_PLY> killers;
    int history[2][64][64];

    bool applyMove(const Move &m);
    void undoMove(const BoardSnapshot &saved);
    void orderMovesEx(std::vector<Move> &moves, const Move &ttBest, int ply) const;
    void storeKiller(int ply, const Move &m);
    int  quiescence(int alpha, int beta, bool maximizing);
    int  alphaBeta(int depth, int ply, int alpha, int beta, bool maximizing);
};

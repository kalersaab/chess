#pragma once
#include "BoardState.h"
#include <array>
#include <cstdint>
#include <vector>
#include <string>

struct ZobristKeys {
    uint64_t piece[12][8][8];   // [pieceIdx][row][col]
    uint64_t sideToMove;        // XOR when it is Black's turn
    uint64_t castling[4];       // WK, WQ, BK, BQ rights
    uint64_t enPassant[8];      // en-passant file (column)

    ZobristKeys();
};

const ZobristKeys &zobristKeys();

uint64_t computeZobrist(const BoardSnapshot &snap);

enum class TTFlag : uint8_t {
    EXACT = 0,
    LOWER = 1,
    UPPER = 2,
};

struct TTEntry {
    uint64_t key   = 0;
    int      score = 0;
    int      depth = -1;
    TTFlag   flag  = TTFlag::EXACT;
    Move     best  = Move::null();
};

class TranspositionTable {
public:
    explicit TranspositionTable(size_t size = 1 << 20);

    void store(uint64_t key, int score, int depth, TTFlag flag, Move best);

    const TTEntry *probe(uint64_t key) const;

    void clear();

private:
    std::vector<TTEntry> table;
    size_t               mask;
};

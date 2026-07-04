#include "TranspositionTable.h"
#include <stdexcept>

static uint64_t splitmix64(uint64_t &state) {
    state += 0x9e3779b97f4a7c15ULL;
    uint64_t z = state;
    z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9ULL;
    z = (z ^ (z >> 27)) * 0x94d049bb133111ebULL;
    return z ^ (z >> 31);
}

ZobristKeys::ZobristKeys() {
    uint64_t seed = 0xDEADBEEFCAFEBABEULL;
    for (int p = 0; p < 12; p++)
        for (int x = 0; x < 8; x++)
            for (int y = 0; y < 8; y++)
                piece[p][x][y] = splitmix64(seed);
    sideToMove = splitmix64(seed);
    for (int i = 0; i < 4; i++) castling[i]  = splitmix64(seed);
    for (int i = 0; i < 8; i++) enPassant[i] = splitmix64(seed);
}

const ZobristKeys &zobristKeys() {
    static ZobristKeys keys;
    return keys;
}

uint64_t computeZobrist(const BoardSnapshot &snap) {
    const auto &z = zobristKeys();
    uint64_t h = 0;
    for (int i = 0; i < 64; i++) {
        uint8_t p = snap.bd[i];
        if (p == EMPTY) continue;
        int idx = pieceIsWhite(p) ? pieceType(p) - 1 : pieceType(p) - 1 + 6;
        h ^= z.piece[idx][sqRow(i)][sqCol(i)];
    }
    if (!snap.whiteTurn) h ^= z.sideToMove;
    if (!snap.whiteKingMoved  && !snap.whiteRookHMoved) h ^= z.castling[0];
    if (!snap.whiteKingMoved  && !snap.whiteRookAMoved) h ^= z.castling[1];
    if (!snap.blackKingMoved  && !snap.blackRookHMoved) h ^= z.castling[2];
    if (!snap.blackKingMoved  && !snap.blackRookAMoved) h ^= z.castling[3];
    if (snap.enPassantY >= 0 && snap.enPassantY < 8)
        h ^= z.enPassant[snap.enPassantY];
    return h;
}

TranspositionTable::TranspositionTable(size_t size)
    : table(size), mask(size - 1) {
    if ((size & mask) != 0)
        throw std::invalid_argument("TT size must be a power of two");
}

void TranspositionTable::store(uint64_t key, int score, int depth, TTFlag flag, Move best) {
    table[key & mask] = {key, score, depth, flag, best};
}

const TTEntry *TranspositionTable::probe(uint64_t key) const {
    const TTEntry &e = table[key & mask];
    if (e.depth >= 0 && e.key == key) return &e;
    return nullptr;
}

void TranspositionTable::clear() {
    for (auto &e : table) e = TTEntry{};
}

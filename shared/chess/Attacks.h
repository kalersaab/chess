#pragma once
#include <cstdint>

enum Piece : uint8_t {
    EMPTY  = 0,
    W_PAWN = 1, W_KNIGHT, W_BISHOP, W_ROOK, W_QUEEN, W_KING,
    B_PAWN = 9, B_KNIGHT, B_BISHOP, B_ROOK, B_QUEEN, B_KING,
};

inline bool    pieceIsWhite(uint8_t p) { return p != EMPTY && !(p & 8); }
inline bool    pieceIsBlack(uint8_t p) { return p >= B_PAWN; }
inline uint8_t pieceType(uint8_t p)    { return p & 7; }

inline int sq(int row, int col) { return row * 8 + col; }
inline int sqRow(int s)         { return s >> 3; }
inline int sqCol(int s)         { return s & 7; }

extern int KNIGHT_ATTACKS[64][9];
extern int KING_ATTACKS[64][9];

inline uint64_t hyperbola(uint64_t occ, int s, uint64_t mask) {
    uint64_t slider  = uint64_t(1) << s;
    uint64_t forward = (occ & mask) - 2 * slider;
    uint64_t reverse = __builtin_bswap64(
                           __builtin_bswap64(occ & mask) -
                           2 * __builtin_bswap64(slider));
    return (forward ^ reverse) & mask;
}

static inline uint64_t rankAttacks(uint64_t occ, int s) {
    int     shift    = (s >> 3) * 8;
    uint8_t o        = (uint8_t)(occ >> shift);
    uint8_t slider8  = (uint8_t)(1u << (s & 7));
    uint8_t forward8 = o - 2 * slider8;
    auto rev8 = [](uint8_t b) -> uint8_t {
        b = (uint8_t)(((b & 0xF0u) >> 4) | ((b & 0x0Fu) << 4));
        b = (uint8_t)(((b & 0xCCu) >> 2) | ((b & 0x33u) << 2));
        b = (uint8_t)(((b & 0xAAu) >> 1) | ((b & 0x55u) << 1));
        return b;
    };
    uint8_t oRev     = rev8(o);
    uint8_t sRev     = rev8(slider8);
    uint8_t reverse8 = rev8(oRev - 2 * sRev);
    uint8_t attacks8 = ((forward8 ^ reverse8) & 0xFFu) & ~slider8;
    return (uint64_t)attacks8 << shift;
}

struct RayMasks {
    uint64_t rank[64];
    uint64_t file[64];
    uint64_t diag[64];
    uint64_t anti[64];
};

extern RayMasks RAYS;

inline uint64_t rookAttacks(uint64_t occ, int s) {
    return rankAttacks(occ, s) | hyperbola(occ, s, RAYS.file[s]);
}

inline uint64_t bishopAttacks(uint64_t occ, int s) {
    return hyperbola(occ, s, RAYS.diag[s]) | hyperbola(occ, s, RAYS.anti[s]);
}

inline uint64_t queenAttacks(uint64_t occ, int s) {
    return rookAttacks(occ, s) | bishopAttacks(occ, s);
}

#include "Perft.h"
#include "MoveGen.h"
#include <cstdlib>
#include <android/log.h>

static void applyPerft(BoardSnapshot &snap, const Move &m) {
    uint8_t *bd   = snap.sq;
    uint8_t  piece = bd[sq(m.fromX, m.fromY)];
    bool     isW   = pieceIsWhite(piece);
    uint8_t  tp    = pieceType(piece);

    bool isCastle = (tp == 6 && std::abs(m.toY - m.fromY) == 2 && m.fromX == m.toX);
    bool isEP     = (tp == 1 && std::abs(m.toY - m.fromY) == 1 &&
                     bd[sq(m.toX, m.toY)] == EMPTY &&
                     m.toX == snap.enPassantX && m.toY == snap.enPassantY);

    if (isCastle) {
        bd[sq(m.toX, m.toY)]    = piece;
        bd[sq(m.fromX, m.fromY)] = EMPTY;
        bool ks = (m.toY == 6);
        int rf = ks ? 7 : 0, rt = ks ? 5 : 3;
        bd[sq(m.toX, rt)] = bd[sq(m.toX, rf)];
        bd[sq(m.toX, rf)] = EMPTY;
    } else {
        bd[sq(m.toX, m.toY)]    = piece;
        bd[sq(m.fromX, m.fromY)] = EMPTY;
        if (isEP) bd[sq(m.fromX, m.toY)] = EMPTY;
        if (m.promotion != '\0') {
            uint8_t pp;
            switch (m.promotion) {
                case 'q': pp = isW ? W_QUEEN  : B_QUEEN;  break;
                case 'r': pp = isW ? W_ROOK   : B_ROOK;   break;
                case 'b': pp = isW ? W_BISHOP : B_BISHOP; break;
                default:  pp = isW ? W_KNIGHT : B_KNIGHT; break;
            }
            bd[sq(m.toX, m.toY)] = pp;
        }
    }

    if (piece == W_KING) snap.whiteKingMoved  = true;
    if (piece == B_KING) snap.blackKingMoved  = true;
    if (m.fromX == 7 && m.fromY == 0) snap.whiteRookAMoved = true;
    if (m.fromX == 7 && m.fromY == 7) snap.whiteRookHMoved = true;
    if (m.fromX == 0 && m.fromY == 0) snap.blackRookAMoved = true;
    if (m.fromX == 0 && m.fromY == 7) snap.blackRookHMoved = true;

    snap.enPassantX = snap.enPassantY = -1;
    if (tp == 1 && std::abs(m.toX - m.fromX) == 2) {
        snap.enPassantX = (m.fromX + m.toX) / 2;
        snap.enPassantY = m.fromY;
    }

    snap.whiteTurn = !snap.whiteTurn;
    snap.syncOccupancy();
}

uint64_t perft(BoardSnapshot &snap, int depth) {
    if (depth == 0) return 1;

    bool side = snap.whiteTurn;
    auto moves = generateAllMoves(snap, side);
    uint64_t nodes = 0;

    for (const auto &m : moves) {
        BoardSnapshot saved = snap;
        applyPerft(snap, m);

        if (!isInCheck(snap, side)) {
            nodes += perft(snap, depth - 1);
        }

        snap = saved;
    }
    return nodes;
}

void perftSuite(BoardSnapshot &snap) {
    struct Case { int depth; uint64_t expected; };
    static const Case cases[] = {
        {1,        20ULL},
        {2,       400ULL},
        {3,      8902ULL},
        {4,    197281ULL},
        {5,   4865609ULL},
    };

    for (const auto &c : cases) {
        uint64_t got = perft(snap, c.depth);
        bool pass = (got == c.expected);
        __android_log_print(
            pass ? ANDROID_LOG_INFO : ANDROID_LOG_ERROR,
            "Perft",
            "depth %d: expected %llu got %llu  [%s]",
            c.depth,
            (unsigned long long)c.expected,
            (unsigned long long)got,
            pass ? "PASS" : "FAIL"
        );
    }
}

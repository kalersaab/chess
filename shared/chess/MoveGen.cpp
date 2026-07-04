#include "MoveGen.h"
#include "Evaluation.h"
#include <algorithm>
#include <cstdlib>

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
static inline void push(std::vector<Move> &moves,
                        int fr, int fc, int tr, int tc, char promo = '\0') {
    moves.push_back({fr, fc, tr, tc, promo});
}
static inline void pushPromo(std::vector<Move> &moves,
                              int fr, int fc, int tr, int tc) {
    for (char p : {'q','r','b','n'})
        moves.push_back({fr, fc, tr, tc, p});
}

// ─────────────────────────────────────────────────────────────────────────────
// isAttacked
// ─────────────────────────────────────────────────────────────────────────────
bool isAttacked(const BoardSnapshot &snap, int s, bool byWhite) {
    const uint8_t *bd  = snap.bd;
    uint64_t       occ = snap.occ;

    uint8_t ePawn   = byWhite ? W_PAWN   : B_PAWN;
    uint8_t eKnight = byWhite ? W_KNIGHT : B_KNIGHT;
    uint8_t eBishop = byWhite ? W_BISHOP : B_BISHOP;
    uint8_t eRook   = byWhite ? W_ROOK   : B_ROOK;
    uint8_t eQueen  = byWhite ? W_QUEEN  : B_QUEEN;
    uint8_t eKing   = byWhite ? W_KING   : B_KING;

    int r = sqRow(s), c = sqCol(s);
    // White pawns stand one row below their target; black pawns one row above
    int pawnRow = byWhite ? r + 1 : r - 1;
    if (pawnRow >= 0 && pawnRow < 8) {
        if (c > 0 && bd[sq(pawnRow, c-1)] == ePawn) return true;
        if (c < 7 && bd[sq(pawnRow, c+1)] == ePawn) return true;
    }

    int cnt = KNIGHT_ATTACKS[s][0];
    for (int i = 1; i <= cnt; i++)
        if (bd[KNIGHT_ATTACKS[s][i]] == eKnight) return true;

    cnt = KING_ATTACKS[s][0];
    for (int i = 1; i <= cnt; i++)
        if (bd[KING_ATTACKS[s][i]] == eKing) return true;

    uint64_t rAtk = rookAttacks(occ, s);
    uint64_t bAtk = bishopAttacks(occ, s);

    uint64_t tmp = rAtk;
    while (tmp) {
        int t = __builtin_ctzll(tmp); tmp &= tmp - 1;
        if (bd[t] == eRook || bd[t] == eQueen) return true;
    }
    tmp = bAtk;
    while (tmp) {
        int t = __builtin_ctzll(tmp); tmp &= tmp - 1;
        if (bd[t] == eBishop || bd[t] == eQueen) return true;
    }
    return false;
}

bool isInCheck(const BoardSnapshot &snap, bool white) {
    uint8_t king = white ? W_KING : B_KING;
    for (int i = 0; i < 64; i++)
        if (snap.bd[i] == king)
            return isAttacked(snap, i, !white);
    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// generateAllMoves
// ─────────────────────────────────────────────────────────────────────────────
std::vector<Move> generateAllMoves(const BoardSnapshot &snap, bool white) {
    std::vector<Move> moves;
    moves.reserve(80);

    const uint8_t *bd = snap.bd;

    for (int s = 0; s < 64; s++) {
        uint8_t p = bd[s];
        if (p == EMPTY) continue;
        if (pieceIsWhite(p) != white) continue;

        int r = sqRow(s), c = sqCol(s);
        uint8_t type = pieceType(p);

        switch (type) {

        // ── Pawn ─────────────────────────────────────────────────────────────
        case 1: {
            int dir      = white ? -1 :  1;
            int startRow = white ?  6 :  1;
            int promoRow = white ?  0 :  7;
            int nr = r + dir;
            if (nr >= 0 && nr < 8 && bd[sq(nr, c)] == EMPTY) {
                if (nr == promoRow) pushPromo(moves, r, c, nr, c);
                else                push(moves, r, c, nr, c);
                int nr2 = r + 2*dir;
                if (r == startRow && bd[sq(nr2, c)] == EMPTY)
                    push(moves, r, c, nr2, c);
            }
            for (int dc : {-1, 1}) {
                int nc = c + dc;
                if (nc < 0 || nc > 7) continue;
                int ts = sq(nr, nc);
                if (bd[ts] != EMPTY && pieceIsWhite(bd[ts]) != white) {
                    if (nr == promoRow) pushPromo(moves, r, c, nr, nc);
                    else                push(moves, r, c, nr, nc);
                } else if (bd[ts] == EMPTY &&
                           nr == snap.enPassantX && nc == snap.enPassantY) {
                    push(moves, r, c, nr, nc);
                }
            }
            break;
        }

        // ── Knight ───────────────────────────────────────────────────────────
        case 2: {
            int cnt = KNIGHT_ATTACKS[s][0];
            for (int i = 1; i <= cnt; i++) {
                int t = KNIGHT_ATTACKS[s][i];
                if (bd[t] == EMPTY || pieceIsWhite(bd[t]) != white)
                    push(moves, r, c, sqRow(t), sqCol(t));
            }
            break;
        }

        // ── Bishop ───────────────────────────────────────────────────────────
        case 3: {
            uint64_t atk = bishopAttacks(snap.occ, s);
            while (atk) {
                int t = __builtin_ctzll(atk); atk &= atk-1;
                if (bd[t] == EMPTY || pieceIsWhite(bd[t]) != white)
                    push(moves, r, c, sqRow(t), sqCol(t));
            }
            break;
        }

        // ── Rook ─────────────────────────────────────────────────────────────
        case 4: {
            uint64_t atk = rookAttacks(snap.occ, s);
            while (atk) {
                int t = __builtin_ctzll(atk); atk &= atk-1;
                if (bd[t] == EMPTY || pieceIsWhite(bd[t]) != white)
                    push(moves, r, c, sqRow(t), sqCol(t));
            }
            break;
        }

        // ── Queen ────────────────────────────────────────────────────────────
        case 5: {
            uint64_t atk = queenAttacks(snap.occ, s);
            while (atk) {
                int t = __builtin_ctzll(atk); atk &= atk-1;
                if (bd[t] == EMPTY || pieceIsWhite(bd[t]) != white)
                    push(moves, r, c, sqRow(t), sqCol(t));
            }
            break;
        }

        // ── King ─────────────────────────────────────────────────────────────
        case 6: {
            int cnt = KING_ATTACKS[s][0];
            for (int i = 1; i <= cnt; i++) {
                int t = KING_ATTACKS[s][i];
                if (bd[t] == EMPTY || pieceIsWhite(bd[t]) != white)
                    push(moves, r, c, sqRow(t), sqCol(t));
            }
            int backRank = white ? 7 : 0;
            if (r == backRank && c == 4) {
                bool ksOk = white ? (!snap.whiteKingMoved && !snap.whiteRookHMoved)
                                  : (!snap.blackKingMoved && !snap.blackRookHMoved);
                if (ksOk &&
                    bd[sq(r,5)] == EMPTY && bd[sq(r,6)] == EMPTY &&
                    bd[sq(r,7)] == (white ? W_ROOK : B_ROOK) &&
                    !isAttacked(snap, sq(r,4), !white) &&
                    !isAttacked(snap, sq(r,5), !white) &&
                    !isAttacked(snap, sq(r,6), !white))
                    push(moves, r, c, r, 6);

                bool qsOk = white ? (!snap.whiteKingMoved && !snap.whiteRookAMoved)
                                  : (!snap.blackKingMoved && !snap.blackRookAMoved);
                if (qsOk &&
                    bd[sq(r,3)] == EMPTY && bd[sq(r,2)] == EMPTY && bd[sq(r,1)] == EMPTY &&
                    bd[sq(r,0)] == (white ? W_ROOK : B_ROOK) &&
                    !isAttacked(snap, sq(r,4), !white) &&
                    !isAttacked(snap, sq(r,3), !white) &&
                    !isAttacked(snap, sq(r,2), !white))
                    push(moves, r, c, r, 2);
            }
            break;
        }

        default: break;
        }
    }
    return moves;
}

// ─────────────────────────────────────────────────────────────────────────────
// generateCaptureMoves
// ─────────────────────────────────────────────────────────────────────────────
std::vector<Move> generateCaptureMoves(const BoardSnapshot &snap, bool white) {
    if (isInCheck(snap, white))
        return generateAllMoves(snap, white);

    std::vector<Move> captures;
    captures.reserve(32);
    for (const auto &m : generateAllMoves(snap, white)) {
        int ts = sq(m.toX, m.toY);
        bool isCapture = snap.bd[ts] != EMPTY;
        bool isEP      = !isCapture &&
                         pieceType(snap.bd[sq(m.fromX, m.fromY)]) == 1 &&
                         std::abs(m.toY - m.fromY) == 1 &&
                         m.toX == snap.enPassantX && m.toY == snap.enPassantY;
        if (isCapture || isEP || m.promotion != '\0')
            captures.push_back(m);
    }
    return captures;
}

// ─────────────────────────────────────────────────────────────────────────────
// orderMoves — MVV-LVA
// ─────────────────────────────────────────────────────────────────────────────
void orderMoves(std::vector<Move> &moves, const BoardSnapshot &snap) {
    static const int vals[7] = {0,100,320,330,500,900,20000};
    auto score = [&](const Move &m) -> int {
        int ts = sq(m.toX, m.toY);
        int s  = 0;
        if (snap.bd[ts] != EMPTY)
            s += vals[pieceType(snap.bd[ts])] * 10
               - vals[pieceType(snap.bd[sq(m.fromX, m.fromY)])];
        if (m.promotion != '\0')
            s += pieceValue(m.promotion) - 100;
        return s;
    };
    std::sort(moves.begin(), moves.end(),
              [&](const Move &a, const Move &b){ return score(a) > score(b); });
}

// ─────────────────────────────────────────────────────────────────────────────
// moveToUCI
// ─────────────────────────────────────────────────────────────────────────────
std::string moveToUCI(const Move &m) {
    std::string s;
    s += (char)('a' + m.fromY);
    s += (char)('0' + (8 - m.fromX));
    s += (char)('a' + m.toY);
    s += (char)('0' + (8 - m.toX));
    if (m.promotion != '\0') s += m.promotion;
    return s;
}

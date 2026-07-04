#include "Search.h"
#include "Evaluation.h"
#include <algorithm>
#include <limits>
#include <cstring>
#include <cstdlib>

static constexpr int INF = std::numeric_limits<int>::max() - 1;

Searcher::Searcher(BoardSnapshot &state)
    : state(state), tt(1 << 20) {
    for (auto &row : killers) row.fill(Move::null());
    std::memset(history, 0, sizeof(history));
}

bool Searcher::applyMove(const Move &m, UndoRecord &undo) {
    uint8_t *bd    = state.bd;
    uint8_t  piece = bd[sq(m.fromX, m.fromY)];
    if (piece == EMPTY) return false;

    bool    isW = pieceIsWhite(piece);
    uint8_t tp  = pieceType(piece);

    bool isCastle = (tp == 6 && std::abs(m.toY - m.fromY) == 2 && m.fromX == m.toX);
    bool isEP     = (tp == 1 && std::abs(m.toY - m.fromY) == 1 &&
                     bd[sq(m.toX, m.toY)] == EMPTY &&
                     m.toX == state.enPassantX && m.toY == state.enPassantY);

    undo.whiteTurn      = state.whiteTurn;
    undo.whiteKingMoved = state.whiteKingMoved;
    undo.blackKingMoved = state.blackKingMoved;
    undo.whiteRookAMoved = state.whiteRookAMoved;
    undo.whiteRookHMoved = state.whiteRookHMoved;
    undo.blackRookAMoved = state.blackRookAMoved;
    undo.blackRookHMoved = state.blackRookHMoved;
    undo.enPassantX     = state.enPassantX;
    undo.enPassantY     = state.enPassantY;
    undo.occ            = state.occ;
    undo.deltaCount     = 0;

    auto recordDelta = [&](uint8_t idx) {
        undo.deltas[undo.deltaCount++] = {idx, bd[idx]};
    };

    if (isCastle) {
        bool ks = (m.toY == 6);
        int rf = ks ? 7 : 0, rt = ks ? 5 : 3;
        uint8_t fromSq = sq(m.fromX, m.fromY);
        uint8_t toSq   = sq(m.toX,   m.toY);
        uint8_t rfSq   = sq(m.toX,   rf);
        uint8_t rtSq   = sq(m.toX,   rt);
        recordDelta(fromSq); recordDelta(toSq);
        recordDelta(rfSq);   recordDelta(rtSq);
        bd[toSq]   = piece;
        bd[fromSq] = EMPTY;
        bd[rtSq]   = bd[rfSq];
        bd[rfSq]   = EMPTY;
    } else {
        uint8_t fromSq = sq(m.fromX, m.fromY);
        uint8_t toSq   = sq(m.toX,   m.toY);
        recordDelta(fromSq);
        recordDelta(toSq);
        if (isEP) {
            uint8_t epSq = sq(m.fromX, m.toY);
            recordDelta(epSq);
            bd[epSq] = EMPTY;
        }
        bd[toSq]   = piece;
        bd[fromSq] = EMPTY;
        if (m.promotion != '\0') {
            uint8_t pp;
            switch (m.promotion) {
                case 'q': pp = isW ? W_QUEEN  : B_QUEEN;  break;
                case 'r': pp = isW ? W_ROOK   : B_ROOK;   break;
                case 'b': pp = isW ? W_BISHOP : B_BISHOP; break;
                default:  pp = isW ? W_KNIGHT : B_KNIGHT; break;
            }
            bd[toSq] = pp;
        }
    }

    if (piece == W_KING) state.whiteKingMoved  = true;
    if (piece == B_KING) state.blackKingMoved  = true;
    if (m.fromX == 7 && m.fromY == 0) state.whiteRookAMoved = true;
    if (m.fromX == 7 && m.fromY == 7) state.whiteRookHMoved = true;
    if (m.fromX == 0 && m.fromY == 0) state.blackRookAMoved = true;
    if (m.fromX == 0 && m.fromY == 7) state.blackRookHMoved = true;

    state.enPassantX = state.enPassantY = -1;
    if (tp == 1 && std::abs(m.toX - m.fromX) == 2) {
        state.enPassantX = (m.fromX + m.toX) / 2;
        state.enPassantY = m.fromY;
    }

    state.whiteTurn = !state.whiteTurn;
    state.syncOccupancy();

    if (isInCheck(state, isW)) {
        undoMove(undo);
        return false;
    }
    return true;
}

void Searcher::undoMove(const UndoRecord &undo) {
    for (int i = undo.deltaCount - 1; i >= 0; i--)
        state.bd[undo.deltas[i].idx] = undo.deltas[i].before;

    state.whiteTurn      = undo.whiteTurn;
    state.whiteKingMoved = undo.whiteKingMoved;
    state.blackKingMoved = undo.blackKingMoved;
    state.whiteRookAMoved = undo.whiteRookAMoved;
    state.whiteRookHMoved = undo.whiteRookHMoved;
    state.blackRookAMoved = undo.blackRookAMoved;
    state.blackRookHMoved = undo.blackRookHMoved;
    state.enPassantX     = undo.enPassantX;
    state.enPassantY     = undo.enPassantY;
    state.occ            = undo.occ;
}

void Searcher::storeKiller(int ply, const Move &m) {
    if (ply >= MAX_PLY) return;
    if (state.bd[sq(m.toX, m.toY)] != EMPTY) return;
    if (!(killers[ply][0] == m)) {
        killers[ply][1] = killers[ply][0];
        killers[ply][0] = m;
    }
}

void Searcher::orderMovesEx(std::vector<Move> &moves, const Move &ttBest, int ply) const {
    int side = state.whiteTurn ? 0 : 1;
    auto score = [&](const Move &m) -> int {
        if (!ttBest.isNull() && m == ttBest) return 2000000;
        uint8_t victim   = state.bd[sq(m.toX, m.toY)];
        uint8_t attacker = state.bd[sq(m.fromX, m.fromY)];
        if (victim != EMPTY) {
            static const int vals[7] = {0,100,320,330,500,900,20000};
            return 900000 + vals[pieceType(victim)] * 10 - vals[pieceType(attacker)];
        }
        if (pieceType(attacker) == 1 &&
            std::abs(m.toY - m.fromY) == 1 &&
            m.toX == state.enPassantX && m.toY == state.enPassantY)
            return 900000;
        if (m.promotion != '\0')
            return 850000 + pieceValue(m.promotion);
        if (ply < MAX_PLY) {
            if (!killers[ply][0].isNull() && m == killers[ply][0]) return 800000;
            if (!killers[ply][1].isNull() && m == killers[ply][1]) return 700000;
        }
        return history[side][m.fromX*8+m.fromY][m.toX*8+m.toY];
    };
    std::sort(moves.begin(), moves.end(),
              [&](const Move &a, const Move &b){ return score(a) > score(b); });
}

int Searcher::quiescence(int alpha, int beta) {
    int standPat = evaluate(state);
    if (standPat >= beta)  return beta;
    if (standPat > alpha)  alpha = standPat;

    auto moves = generateCaptureMoves(state, state.whiteTurn);
    std::sort(moves.begin(), moves.end(), [&](const Move &a, const Move &b) {
        static const int vals[7] = {0,100,320,330,500,900,20000};
        uint8_t va = state.bd[sq(a.toX, a.toY)];
        uint8_t vb = state.bd[sq(b.toX, b.toY)];
        return vals[pieceType(va ? va : (uint8_t)1)] >
               vals[pieceType(vb ? vb : (uint8_t)1)];
    });

    for (const auto &m : moves) {
        UndoRecord undo;
        if (!applyMove(m, undo)) continue;
        int score = -quiescence(-beta, -alpha);
        undoMove(undo);
        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
    }
    return alpha;
}

int Searcher::alphaBeta(int depth, int ply, int alpha, int beta) {
    int      origAlpha = alpha;
    uint64_t hash      = computeZobrist(state);
    Move     ttBest    = Move::null();

    const TTEntry *entry = tt.probe(hash);
    if (entry && entry->depth >= depth) {
        int s = entry->score;
        switch (entry->flag) {
            case TTFlag::EXACT: return s;
            case TTFlag::LOWER: if (s > alpha) alpha = s; break;
            case TTFlag::UPPER: if (s < beta)  beta  = s; break;
        }
        if (alpha >= beta) return entry->score;
        ttBest = entry->best;
    } else if (entry) {
        ttBest = entry->best;
    }

    if (depth == 0) return quiescence(alpha, beta);

    auto moves = generateAllMoves(state, state.whiteTurn);
    orderMovesEx(moves, ttBest, ply);

    bool anyLegal = false;
    int  best     = -INF;
    Move bestMove = Move::null();
    int  moveIdx  = 0;

    for (const auto &m : moves) {
        UndoRecord undo;
        if (!applyMove(m, undo)) continue;
        anyLegal = true;

        int score;
        if (moveIdx == 0) {
            score = -alphaBeta(depth-1, ply+1, -beta, -alpha);
        } else {
            score = -alphaBeta(depth-1, ply+1, -alpha-1, -alpha);
            if (score > alpha && score < beta)
                score = -alphaBeta(depth-1, ply+1, -beta, -alpha);
        }

        undoMove(undo);
        ++moveIdx;

        if (score > best) { best = score; bestMove = m; }
        if (best > alpha)   alpha = best;

        if (alpha >= beta) {
            storeKiller(ply, m);
            if (state.bd[sq(m.toX, m.toY)] == EMPTY && m.promotion == '\0') {
                int side = undo.whiteTurn ? 0 : 1;
                history[side][m.fromX*8+m.fromY][m.toX*8+m.toY] += depth * depth;
            }
            break;
        }
    }

    if (!anyLegal)
        return isInCheck(state, state.whiteTurn) ? -INF + ply : 0;

    TTFlag flag;
    if      (best <= origAlpha) flag = TTFlag::UPPER;
    else if (best >= beta)      flag = TTFlag::LOWER;
    else                        flag = TTFlag::EXACT;

    tt.store(hash, best, depth, flag, bestMove);
    return best;
}

std::string Searcher::getBestMove(bool white, int maxDepth) {
    for (auto &row : killers) row.fill(Move::null());
    std::memset(history, 0, sizeof(history));

    std::string bestUCI;
    Move        bestMove = Move::null();

    for (int depth = 1; depth <= maxDepth; depth++) {
        auto moves = generateAllMoves(state, white);
        if (moves.empty()) break;

        orderMovesEx(moves, bestMove, 0);

        int  iterBest  = -INF;
        Move iterBestM = Move::null();
        int  alpha = -INF, beta = INF;
        int  moveIdx = 0;

        for (const auto &m : moves) {
            UndoRecord undo;
            if (!applyMove(m, undo)) continue;

            int score;
            if (moveIdx == 0) {
                score = -alphaBeta(depth-1, 1, -beta, -alpha);
            } else {
                score = -alphaBeta(depth-1, 1, -alpha-1, -alpha);
                if (score > alpha && score < beta)
                    score = -alphaBeta(depth-1, 1, -beta, -alpha);
            }

            undoMove(undo);
            ++moveIdx;

            if (score > iterBest) {
                iterBest  = score;
                iterBestM = m;
                if (score > alpha) alpha = score;
            }
        }

        if (!iterBestM.isNull()) {
            bestMove = iterBestM;
            bestUCI  = moveToUCI(bestMove);
            tt.store(computeZobrist(state), iterBest, depth, TTFlag::EXACT, bestMove);
        }
    }
    return bestUCI;
}

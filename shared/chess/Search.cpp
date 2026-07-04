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

bool Searcher::applyMove(const Move &m) {
    uint8_t *board = state.sq;
    uint8_t  piece = board[sq(m.fromX, m.fromY)];
    if (piece == EMPTY) return false;

    bool    isW = pieceIsWhite(piece);
    uint8_t tp  = pieceType(piece);

    bool isCastle = (tp == 6 && std::abs(m.toY - m.fromY) == 2 && m.fromX == m.toX);
    bool isEP     = (tp == 1 && std::abs(m.toY - m.fromY) == 1 &&
                     board[sq(m.toX, m.toY)] == EMPTY &&
                     m.toX == state.enPassantX && m.toY == state.enPassantY);

    if (isCastle) {
        board[sq(m.toX, m.toY)]    = piece;
        board[sq(m.fromX, m.fromY)] = EMPTY;
        bool ks = (m.toY == 6);
        int rf = ks ? 7 : 0, rt = ks ? 5 : 3;
        board[sq(m.toX, rt)] = board[sq(m.toX, rf)];
        board[sq(m.toX, rf)] = EMPTY;
    } else {
        board[sq(m.toX, m.toY)]    = piece;
        board[sq(m.fromX, m.fromY)] = EMPTY;
        if (isEP) board[sq(m.fromX, m.toY)] = EMPTY;
        if (m.promotion != '\0') {
            uint8_t pp;
            switch (m.promotion) {
                case 'q': pp = isW ? W_QUEEN  : B_QUEEN;  break;
                case 'r': pp = isW ? W_ROOK   : B_ROOK;   break;
                case 'b': pp = isW ? W_BISHOP : B_BISHOP; break;
                default:  pp = isW ? W_KNIGHT : B_KNIGHT; break;
            }
            board[sq(m.toX, m.toY)] = pp;
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

    state.syncOccupancy();
    if (isInCheck(state, isW)) return false;
    return true;
}

void Searcher::undoMove(const BoardSnapshot &saved) {
    state = saved;
}

void Searcher::storeKiller(int ply, const Move &m) {
    if (ply >= MAX_PLY) return;
    if (state.sq[sq(m.toX, m.toY)] != EMPTY) return;
    if (!(killers[ply][0] == m)) {
        killers[ply][1] = killers[ply][0];
        killers[ply][0] = m;
    }
}

void Searcher::orderMovesEx(std::vector<Move> &moves, const Move &ttBest, int ply) const {
    int side = state.whiteTurn ? 0 : 1;
    auto score = [&](const Move &m) -> int {
        if (!ttBest.isNull() && m == ttBest) return 2000000;
        uint8_t victim   = state.sq[sq(m.toX, m.toY)];
        uint8_t attacker = state.sq[sq(m.fromX, m.fromY)];
        if (victim != EMPTY) {
            static const int vals[7] = {0,100,320,330,500,900,20000};
            return 900000 + vals[pieceType(victim)] * 10 - vals[pieceType(attacker)];
        }
        if (pieceType(attacker) == 1 &&
            std::abs(m.toY - m.fromY) == 1 &&
            m.toX == state.enPassantX && m.toY == state.enPassantY)
            return 900000 + 100 * 10 - 100;
        if (m.promotion != '\0')
            return 850000 + pieceValue(m.promotion);
        if (ply < MAX_PLY) {
            if (!killers[ply][0].isNull() && m == killers[ply][0]) return 800000;
            if (!killers[ply][1].isNull() && m == killers[ply][1]) return 700000;
        }
        int from = m.fromX * 8 + m.fromY;
        int to   = m.toX   * 8 + m.toY;
        return history[side][from][to];
    };
    std::sort(moves.begin(), moves.end(),
              [&](const Move &a, const Move &b){ return score(a) > score(b); });
}

int Searcher::quiescence(int alpha, int beta, bool maximizing) {
    int standPat = evaluate(state);
    if (maximizing) {
        if (standPat >= beta)  return beta;
        if (standPat > alpha)  alpha = standPat;
    } else {
        if (standPat <= alpha) return alpha;
        if (standPat < beta)   beta  = standPat;
    }
    auto moves = generateCaptureMoves(state, maximizing);
    if (moves.empty()) return standPat;
    std::sort(moves.begin(), moves.end(), [&](const Move &a, const Move &b) {
        static const int vals[7] = {0,100,320,330,500,900,20000};
        int va = state.sq[sq(a.toX,a.toY)] != EMPTY ? vals[pieceType(state.sq[sq(a.toX,a.toY)])] : 100;
        int vb = state.sq[sq(b.toX,b.toY)] != EMPTY ? vals[pieceType(state.sq[sq(b.toX,b.toY)])] : 100;
        return va > vb;
    });
    if (maximizing) {
        int best = -INF;
        for (const auto &m : moves) {
            BoardSnapshot saved = state;
            state.whiteTurn = true;
            if (!applyMove(m)) { undoMove(saved); continue; }
            state.whiteTurn = false;
            int score = quiescence(alpha, beta, false);
            undoMove(saved);
            if (score > best) best = score;
            if (best > alpha) alpha = best;
            if (alpha >= beta) break;
        }
        return (best == -INF) ? standPat : best;
    } else {
        int best = INF;
        for (const auto &m : moves) {
            BoardSnapshot saved = state;
            state.whiteTurn = false;
            if (!applyMove(m)) { undoMove(saved); continue; }
            state.whiteTurn = true;
            int score = quiescence(alpha, beta, true);
            undoMove(saved);
            if (score < best) best = score;
            if (best < beta)  beta  = best;
            if (alpha >= beta) break;
        }
        return (best == INF) ? standPat : best;
    }
}

int Searcher::alphaBeta(int depth, int ply, int alpha, int beta, bool maximizing) {
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

    if (depth == 0) return quiescence(alpha, beta, maximizing);

    auto moves = generateAllMoves(state, maximizing);
    orderMovesEx(moves, ttBest, ply);

    bool anyLegal = false;
    int  best     = maximizing ? -INF : INF;
    Move bestMove = Move::null();
    int  moveIdx  = 0;

    for (const auto &m : moves) {
        BoardSnapshot saved = state;
        state.whiteTurn = maximizing;
        if (!applyMove(m)) { undoMove(saved); continue; }
        anyLegal        = true;
        state.whiteTurn = !maximizing;

        int score;
        if (moveIdx == 0) {
            score = alphaBeta(depth-1, ply+1, alpha, beta, !maximizing);
        } else {
            if (maximizing) {
                score = alphaBeta(depth-1, ply+1, alpha, alpha+1, false);
                if (score > alpha && score < beta)
                    score = alphaBeta(depth-1, ply+1, alpha, beta, false);
            } else {
                score = alphaBeta(depth-1, ply+1, beta-1, beta, true);
                if (score < beta && score > alpha)
                    score = alphaBeta(depth-1, ply+1, alpha, beta, true);
            }
        }

        undoMove(saved);
        ++moveIdx;

        if (maximizing) {
            if (score > best) { best = score; bestMove = m; }
            if (best > alpha)   alpha = best;
        } else {
            if (score < best) { best = score; bestMove = m; }
            if (best < beta)    beta  = best;
        }

        if (alpha >= beta) {
            storeKiller(ply, m);
            if (state.sq[sq(m.toX,m.toY)] == EMPTY && m.promotion == '\0') {
                int si   = maximizing ? 0 : 1;
                int from = m.fromX * 8 + m.fromY;
                int to   = m.toX   * 8 + m.toY;
                history[si][from][to] += depth * depth;
            }
            break;
        }
    }

    if (!anyLegal)
        return isInCheck(state, maximizing)
                   ? (maximizing ? -INF + ply : INF - ply)
                   : 0;

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

        int  iterBest  = white ? -INF : INF;
        Move iterBestM = Move::null();
        int  alpha = -INF, beta = INF;
        int  moveIdx = 0;

        for (const auto &m : moves) {
            BoardSnapshot saved = state;
            state.whiteTurn = white;
            if (!applyMove(m)) { undoMove(saved); continue; }
            state.whiteTurn = !white;

            int score;
            if (moveIdx == 0) {
                score = alphaBeta(depth-1, 1, alpha, beta, !white);
            } else {
                if (white) {
                    score = alphaBeta(depth-1, 1, alpha, alpha+1, false);
                    if (score > alpha && score < beta)
                        score = alphaBeta(depth-1, 1, alpha, beta, false);
                } else {
                    score = alphaBeta(depth-1, 1, beta-1, beta, true);
                    if (score < beta && score > alpha)
                        score = alphaBeta(depth-1, 1, alpha, beta, true);
                }
            }

            undoMove(saved);
            ++moveIdx;

            if (white ? (score > iterBest) : (score < iterBest)) {
                iterBest  = score;
                iterBestM = m;
                if (white) alpha = std::max(alpha, iterBest);
                else        beta  = std::min(beta,  iterBest);
            }
        }

        if (!iterBestM.isNull()) {
            bestMove = iterBestM;
            bestUCI  = moveToUCI(bestMove);
            uint64_t h = computeZobrist(state);
            tt.store(h, iterBest, depth, TTFlag::EXACT, bestMove);
        }
    }
    return bestUCI;
}

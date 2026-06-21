#include "Search.h"
#include "Evaluation.h"
#include <algorithm>
#include <limits>
#include <cctype>
#include <cstring>

static constexpr int INF = std::numeric_limits<int>::max() - 1;

Searcher::Searcher(
    BoardSnapshot                                                &state,
    std::function<bool(bool)>                                    isInCheckFn,
    std::function<bool(const std::string &, int, int, int, int)> isValidMoveFn,
    std::function<bool(bool, bool)>                              canCastleFn)
    : state(state),
      isInCheck(std::move(isInCheckFn)),
      isValidMove(std::move(isValidMoveFn)),
      canCastle(std::move(canCastleFn)),
      tt(1 << 20)   // 1 M entries
{
    for (auto &row : killers)
        row.fill(Move::null());
    std::memset(history, 0, sizeof(history));
}

MoveGenContext Searcher::makeCtx() const {
    return MoveGenContext{
        state.board,
        state.whiteTurn,
        state.enPassantX,
        state.enPassantY,
        canCastle,
        isValidMove,
        isInCheck,
    };
}

bool Searcher::applyMove(const Move &m) {
    auto &board = state.board;
    const std::string piece = board[m.fromX][m.fromY];
    if (piece.empty()) return false;

    bool isWhite = isupper(piece[0]) != 0;
    char p       = (char)tolower(piece[0]);

    bool isCastling = (p == 'k' && abs(m.toY - m.fromY) == 2 && m.fromX == m.toX);
    bool isEP       = (p == 'p' &&
                       abs(m.toY - m.fromY) == 1 &&
                       board[m.toX][m.toY].empty() &&
                       m.toX == state.enPassantX &&
                       m.toY == state.enPassantY);

    if (isCastling) {
        board[m.toX][m.toY]     = piece;
        board[m.fromX][m.fromY] = "";
        bool ks = (m.toY == 6);
        int  rf = ks ? 7 : 0, rt = ks ? 5 : 3;
        board[m.toX][rt] = board[m.toX][rf];
        board[m.toX][rf] = "";
    } else {
        board[m.toX][m.toY]     = piece;
        board[m.fromX][m.fromY] = "";
        if (isEP) board[m.fromX][m.toY] = "";
        if (m.promotion != '\0') {
            char pc = isWhite ? (char)toupper(m.promotion) : m.promotion;
            board[m.toX][m.toY] = std::string(1, pc);
        }
    }

    state.enPassantX = -1;
    state.enPassantY = -1;
    if (p == 'p' && abs(m.toX - m.fromX) == 2) {
        state.enPassantX = (m.fromX + m.toX) / 2;
        state.enPassantY = m.fromY;
    }

    if (piece == "K") state.whiteKingMoved  = true;
    if (piece == "k") state.blackKingMoved  = true;
    if (m.fromX == 7 && m.fromY == 0) state.whiteRookAMoved = true;
    if (m.fromX == 7 && m.fromY == 7) state.whiteRookHMoved = true;
    if (m.fromX == 0 && m.fromY == 0) state.blackRookAMoved = true;
    if (m.fromX == 0 && m.fromY == 7) state.blackRookHMoved = true;

    if (isInCheck(isWhite)) return false;
    return true;
}

void Searcher::undoMove(const BoardSnapshot &saved) {
    state = saved;
}

void Searcher::storeKiller(int ply, const Move &m) {
    if (ply >= MAX_PLY) return;
    // Only store quiet moves (captures are already ordered by MVV-LVA)
    if (!state.board[m.toX][m.toY].empty()) return;
    // Shift: slot 1 ← slot 0, slot 0 ← new
    if (!(killers[ply][0] == m)) {
        killers[ply][1] = killers[ply][0];
        killers[ply][0] = m;
    }
}

void Searcher::orderMovesEx(std::vector<Move> &moves,
                             const Move        &ttBest,
                             int                ply) const {
    bool white = state.whiteTurn;
    int  side  = white ? 0 : 1;

    auto score = [&](const Move &m) -> int {
        if (!ttBest.isNull() && m == ttBest) return 2000000;

        const auto &board = state.board;

        if (!board[m.toX][m.toY].empty()) {
            int victim   = pieceValue(tolower(board[m.toX][m.toY][0]));
            int attacker = pieceValue(tolower(board[m.fromX][m.fromY][0]));
            return 900000 + victim * 10 - attacker;
        }

        {
            const std::string &p = board[m.fromX][m.fromY];
            bool isPawn = !p.empty() && tolower(p[0]) == 'p';
            bool isEP   = isPawn &&
                          abs(m.toY - m.fromY) == 1 &&
                          m.toX == state.enPassantX &&
                          m.toY == state.enPassantY;
            if (isEP) return 900000 + pieceValue('p') * 10 - pieceValue('p');
        }

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
              [&](const Move &a, const Move &b) {
                  return score(a) > score(b);
              });
}

int Searcher::quiescence(int alpha, int beta, bool maximizing) {
    int standPat = evaluate(state.board);

    if (maximizing) {
        if (standPat >= beta)  return beta;
        if (standPat > alpha)  alpha = standPat;
    } else {
        if (standPat <= alpha) return alpha;
        if (standPat < beta)   beta = standPat;
    }

    auto moves = generateCaptureMoves(makeCtx(), maximizing);
    if (moves.empty()) return standPat;

    std::sort(moves.begin(), moves.end(), [&](const Move &a, const Move &b) {
        auto victimVal = [&](const Move &mv) -> int {
            if (!state.board[mv.toX][mv.toY].empty())
                return pieceValue(tolower(state.board[mv.toX][mv.toY][0]));
            if (mv.promotion != '\0')
                return pieceValue(mv.promotion) - pieceValue('p');
            return pieceValue('p');
        };
        return victimVal(a) > victimVal(b);
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
            if (best < beta)  beta = best;
            if (alpha >= beta) break;
        }
        return (best == INF) ? standPat : best;
    }
}

int Searcher::alphaBeta(int depth, int ply, int alpha, int beta, bool maximizing) {
    int origAlpha = alpha;

    // ── Transposition table probe ─────────────────────────────────────────────
    uint64_t hash   = computeZobrist(state);
    Move     ttBest = Move::null();

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
        ttBest = entry->best;   // shallower entry — still useful for ordering
    }

    // ── Leaf: drop into quiescence ────────────────────────────────────────────
    if (depth == 0)
        return quiescence(alpha, beta, maximizing);

    // ── Generate and order moves ──────────────────────────────────────────────
    bool side  = maximizing;
    auto moves = generateAllMoves(makeCtx(), side);
    orderMovesEx(moves, ttBest, ply);

    bool anyLegal = false;
    int  best     = maximizing ? -INF : INF;
    Move bestMove = Move::null();
    int  moveIdx  = 0;          // counts legal moves searched so far

    for (const auto &m : moves) {
        BoardSnapshot saved = state;
        state.whiteTurn     = side;
        if (!applyMove(m)) { undoMove(saved); continue; }
        anyLegal        = true;
        state.whiteTurn = !side;

        int score;

        if (moveIdx == 0) {
            // ── First move: full-window search (PV candidate) ─────────────────
            score = alphaBeta(depth - 1, ply + 1, alpha, beta, !maximizing);
        } else {
            // ── Subsequent moves: null-window search ──────────────────────────
            // We assume these moves are worse than the PV.  Search with a
            // window of width 1 — if the score stays ≤ alpha we discard it
            // cheaply.  Only re-search with the full window if it beats alpha,
            // meaning our move ordering was wrong and this might be the PV.
            if (maximizing) {
                score = alphaBeta(depth - 1, ply + 1, alpha, alpha + 1, false);
                if (score > alpha && score < beta)
                    score = alphaBeta(depth - 1, ply + 1, alpha, beta, false);
            } else {
                score = alphaBeta(depth - 1, ply + 1, beta - 1, beta, true);
                if (score < beta && score > alpha)
                    score = alphaBeta(depth - 1, ply + 1, alpha, beta, true);
            }
        }

        undoMove(saved);
        ++moveIdx;

        if (maximizing) {
            if (score > best) { best = score; bestMove = m; }
            if (best > alpha)   alpha = best;
        } else {
            if (score < best) { best = score; bestMove = m; }
            if (best < beta)    beta = best;
        }

        if (alpha >= beta) {
            // β-cutoff: update killers and history for quiet moves
            storeKiller(ply, m);
            if (state.board[m.toX][m.toY].empty() && m.promotion == '\0') {
                int side_i = maximizing ? 0 : 1;
                int from   = m.fromX * 8 + m.fromY;
                int to     = m.toX   * 8 + m.toY;
                history[side_i][from][to] += depth * depth;
            }
            break;
        }
    }

    // ── Terminal detection ────────────────────────────────────────────────────
    if (!anyLegal)
        return isInCheck(side)
                   ? (maximizing ? -INF + ply : INF - ply)  // checkmate (favour shorter mate)
                   : 0;                                       // stalemate

    // ── TT store ─────────────────────────────────────────────────────────────
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
        auto moves = generateAllMoves(makeCtx(), white);
        if (moves.empty()) break;

        // Best move from the previous iteration goes first (TT ordering)
        orderMovesEx(moves, bestMove, 0);

        int  iterBest  = white ? -INF : INF;
        Move iterBestM = Move::null();
        int  alpha     = -INF;
        int  beta      =  INF;
        int  moveIdx   = 0;

        for (const auto &m : moves) {
            BoardSnapshot saved = state;
            state.whiteTurn     = white;
            if (!applyMove(m)) { undoMove(saved); continue; }
            state.whiteTurn = !white;

            int score;

            if (moveIdx == 0) {
                // First move at root — always full window
                score = alphaBeta(depth - 1, 1, alpha, beta, !white);
            } else {
                // Null-window probe
                if (white) {
                    score = alphaBeta(depth - 1, 1, alpha, alpha + 1, false);
                    if (score > alpha && score < beta)
                        score = alphaBeta(depth - 1, 1, alpha, beta, false);
                } else {
                    score = alphaBeta(depth - 1, 1, beta - 1, beta, true);
                    if (score < beta && score > alpha)
                        score = alphaBeta(depth - 1, 1, alpha, beta, true);
                }
            }

            undoMove(saved);
            ++moveIdx;

            if (white ? (score > iterBest) : (score < iterBest)) {
                iterBest  = score;
                iterBestM = m;
                if (white) alpha = std::max(alpha, iterBest);
                else       beta  = std::min(beta,  iterBest);
            }
        }

        if (!iterBestM.isNull()) {
            bestMove = iterBestM;
            bestUCI  = moveToUCI(bestMove);

            // Store root result in TT so next iteration's ordering is primed
            uint64_t hash = computeZobrist(state);
            tt.store(hash, iterBest, depth, TTFlag::EXACT, bestMove);
        }
    }
    return bestUCI;
}

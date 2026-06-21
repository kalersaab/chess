#include "Search.h"
#include "Evaluation.h"
#include <algorithm>
#include <limits>
#include <cctype>

// ─────────────────────────────────────────────────────────────────────────────

Searcher::Searcher(
    BoardSnapshot                                               &state,
    std::function<bool(bool)>                                   isInCheckFn,
    std::function<bool(const std::string &, int, int, int, int)> isValidMoveFn,
    std::function<bool(bool, bool)>                             canCastleFn)
    : state(state),
      isInCheck(std::move(isInCheckFn)),
      isValidMove(std::move(isValidMoveFn)),
      canCastle(std::move(canCastleFn)) {}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
    std::string piece = board[m.fromX][m.fromY];
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
        board[m.toX][m.toY]   = piece;
        board[m.fromX][m.fromY] = "";
        bool ks    = (m.toY == 6);
        int  rfrom = ks ? 7 : 0;
        int  rto   = ks ? 5 : 3;
        board[m.toX][rto]   = board[m.toX][rfrom];
        board[m.toX][rfrom] = "";
    } else {
        board[m.toX][m.toY]    = piece;
        board[m.fromX][m.fromY] = "";
        if (isEP) board[m.fromX][m.toY] = "";
        if (m.promotion != '\0') {
            char pc = isWhite ? (char)toupper(m.promotion) : m.promotion;
            board[m.toX][m.toY] = std::string(1, pc);
        }
    }

    // Update en-passant target square
    state.enPassantX = -1;
    state.enPassantY = -1;
    if (p == 'p' && abs(m.toX - m.fromX) == 2) {
        state.enPassantX = (m.fromX + m.toX) / 2;
        state.enPassantY = m.fromY;
    }

    // Update castling rights
    if (piece == "K") state.whiteKingMoved  = true;
    if (piece == "k") state.blackKingMoved  = true;
    if (m.fromX == 7 && m.fromY == 0) state.whiteRookAMoved = true;
    if (m.fromX == 7 && m.fromY == 7) state.whiteRookHMoved = true;
    if (m.fromX == 0 && m.fromY == 0) state.blackRookAMoved = true;
    if (m.fromX == 0 && m.fromY == 7) state.blackRookHMoved = true;

    // Reject move if it leaves own king in check
    if (isInCheck(isWhite)) return false;

    return true;
}

void Searcher::undoMove(const BoardSnapshot &saved) {
    state = saved;
}

// ── Quiescence search ─────────────────────────────────────────────────────────
//
// Called at depth == 0. Keeps searching captures (and check evasions) until
// the position is "quiet", then returns the static evaluation.  This prevents
// the horizon effect where the engine misjudges a position by stopping just
// before a capture.

int Searcher::quiescence(int alpha, int beta, bool maximizing) {
    // Stand-pat: assume we can always choose not to capture
    int standPat = evaluate(state.board);

    if (maximizing) {
        if (standPat >= beta) return beta;   // β cut-off
        if (standPat > alpha) alpha = standPat;
    } else {
        if (standPat <= alpha) return alpha; // α cut-off
        if (standPat < beta)   beta = standPat;
    }

    auto moves = generateCaptureMoves(makeCtx(), maximizing);
    if (moves.empty()) return standPat;

    // Order by victim value (MVV) so best captures are searched first
    std::sort(moves.begin(), moves.end(), [&](const Move &a, const Move &b) {
        auto victimVal = [&](const Move &mv) {
            int v = 0;
            if (!state.board[mv.toX][mv.toY].empty())
                v = pieceValue(tolower(state.board[mv.toX][mv.toY][0]));
            if (mv.promotion != '\0')
                v += pieceValue(mv.promotion) - pieceValue('p');
            return v;
        };
        return victimVal(a) > victimVal(b);
    });

    if (maximizing) {
        int best = std::numeric_limits<int>::min();
        for (const auto &m : moves) {
            BoardSnapshot saved = state;
            state.whiteTurn     = maximizing;
            if (!applyMove(m)) { undoMove(saved); continue; }
            state.whiteTurn = !maximizing;

            int score = quiescence(alpha, beta, false);
            undoMove(saved);

            best  = std::max(best, score);
            alpha = std::max(alpha, best);
            if (beta <= alpha) break;
        }
        return (best == std::numeric_limits<int>::min()) ? standPat : best;
    } else {
        int best = std::numeric_limits<int>::max();
        for (const auto &m : moves) {
            BoardSnapshot saved = state;
            state.whiteTurn     = maximizing;
            if (!applyMove(m)) { undoMove(saved); continue; }
            state.whiteTurn = !maximizing;

            int score = quiescence(alpha, beta, true);
            undoMove(saved);

            best = std::min(best, score);
            beta = std::min(beta, best);
            if (beta <= alpha) break;
        }
        return (best == std::numeric_limits<int>::max()) ? standPat : best;
    }
}

// ── Alpha-beta search ─────────────────────────────────────────────────────────

int Searcher::alphaBeta(int depth, int alpha, int beta, bool maximizing) {
    if (depth == 0)
        return quiescence(alpha, beta, maximizing);

    bool side  = maximizing;
    auto moves = generateAllMoves(makeCtx(), side);

    // MVV-LVA ordering at every interior node
    orderMoves(moves, state.board);

    bool anyLegal = false;

    if (maximizing) {
        int best = std::numeric_limits<int>::min();
        for (const auto &m : moves) {
            BoardSnapshot saved = state;
            state.whiteTurn     = side;
            if (!applyMove(m)) { undoMove(saved); continue; }
            anyLegal        = true;
            state.whiteTurn = !side;

            int score = alphaBeta(depth - 1, alpha, beta, false);
            undoMove(saved);

            best  = std::max(best, score);
            alpha = std::max(alpha, best);
            if (beta <= alpha) break; // β cut-off
        }
        if (!anyLegal)
            return isInCheck(side)
                       ? (std::numeric_limits<int>::min() + 1) // checkmate
                       : 0;                                     // stalemate
        return best;
    } else {
        int best = std::numeric_limits<int>::max();
        for (const auto &m : moves) {
            BoardSnapshot saved = state;
            state.whiteTurn     = side;
            if (!applyMove(m)) { undoMove(saved); continue; }
            anyLegal        = true;
            state.whiteTurn = !side;

            int score = alphaBeta(depth - 1, alpha, beta, true);
            undoMove(saved);

            best = std::min(best, score);
            beta = std::min(beta, best);
            if (beta <= alpha) break; // α cut-off
        }
        if (!anyLegal)
            return isInCheck(side)
                       ? (std::numeric_limits<int>::max() - 1)
                       : 0;
        return best;
    }
}

// ── Root search ───────────────────────────────────────────────────────────────

std::string Searcher::getBestMove(bool white, int depth) {
    auto moves = generateAllMoves(makeCtx(), white);
    if (moves.empty()) return "";

    orderMoves(moves, state.board);

    std::string bestUCI;
    int bestScore = white ? std::numeric_limits<int>::min()
                          : std::numeric_limits<int>::max();
    int alpha = std::numeric_limits<int>::min();
    int beta  = std::numeric_limits<int>::max();

    for (const auto &m : moves) {
        BoardSnapshot saved = state;
        state.whiteTurn     = white;
        if (!applyMove(m)) { undoMove(saved); continue; }
        state.whiteTurn = !white;

        int score = alphaBeta(depth - 1, alpha, beta, !white);
        undoMove(saved);

        if (white ? (score > bestScore) : (score < bestScore)) {
            bestScore = score;
            bestUCI   = moveToUCI(m);
            if (white) alpha = std::max(alpha, bestScore);
            else       beta  = std::min(beta,  bestScore);
        }
    }
    return bestUCI;
}

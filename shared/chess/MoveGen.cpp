#include "MoveGen.h"
#include "Evaluation.h"
#include <algorithm>
#include <cctype>

// ─────────────────────────────────────────────────────────────────────────────

std::vector<Move> generateAllMoves(const MoveGenContext &ctx, bool white) {
    std::vector<Move> moves;
    moves.reserve(80);

    const auto &board = ctx.board;

    for (int fx = 0; fx < 8; fx++) {
        for (int fy = 0; fy < 8; fy++) {
            const std::string &cell = board[fx][fy];
            if (cell.empty()) continue;
            if ((isupper(cell[0]) != 0) != white) continue;

            char p = (char)tolower(cell[0]);

            for (int tx = 0; tx < 8; tx++) {
                for (int ty = 0; ty < 8; ty++) {
                    if (tx == fx && ty == fy) continue;

                    // ── Castling ─────────────────────────────────────────────
                    if (p == 'k' && fy == 4 && tx == fx && abs(ty - fy) == 2) {
                        bool ks = (ty == 6);
                        if (ctx.canCastle(white, ks))
                            moves.push_back({fx, fy, tx, ty, '\0'});
                        continue;
                    }

                    // ── Normal + en-passant + push ────────────────────────────
                    if (!ctx.isValidPieceMove(cell, fx, fy, tx, ty)) continue;
                    if (!board[tx][ty].empty() &&
                        (isupper(board[tx][ty][0]) != 0) == white)
                        continue;

                    // ── Pawn promotion (expand into 4 choices) ────────────────
                    if (p == 'p') {
                        int promoRow = white ? 0 : 7;
                        if (tx == promoRow) {
                            for (char pr : {'q', 'r', 'b', 'n'})
                                moves.push_back({fx, fy, tx, ty, pr});
                            continue;
                        }
                    }

                    moves.push_back({fx, fy, tx, ty, '\0'});
                }
            }
        }
    }
    return moves;
}

// ─────────────────────────────────────────────────────────────────────────────

std::vector<Move> generateCaptureMoves(const MoveGenContext &ctx, bool white) {
    // If in check, return all moves so the engine can find escapes
    if (ctx.isInCheck(white))
        return generateAllMoves(ctx, white);

    const auto &board = ctx.board;
    auto all = generateAllMoves(ctx, white);

    std::vector<Move> captures;
    captures.reserve(all.size());

    for (const auto &m : all) {
        const std::string &piece = board[m.fromX][m.fromY];
        bool isPawn = tolower(piece[0]) == 'p';
        bool isEP   = isPawn &&
                      abs(m.toY - m.fromY) == 1 &&
                      board[m.toX][m.toY].empty() &&
                      m.toX == ctx.enPassantX &&
                      m.toY == ctx.enPassantY;

        if (!board[m.toX][m.toY].empty() || isEP || m.promotion != '\0')
            captures.push_back(m);
    }
    return captures;
}

// ─────────────────────────────────────────────────────────────────────────────
// MVV-LVA: Most Valuable Victim – Least Valuable Aggressor ordering.
// Captures of a queen with a pawn rank highest; quiet moves go last.

void orderMoves(std::vector<Move> &moves,
                const std::vector<std::vector<std::string>> &board) {
    auto score = [&](const Move &m) -> int {
        int s = 0;
        if (!board[m.toX][m.toY].empty())
            s += pieceValue(tolower(board[m.toX][m.toY][0])) * 10 -
                 pieceValue(tolower(board[m.fromX][m.fromY][0]));
        if (m.promotion != '\0')
            s += pieceValue(m.promotion) - pieceValue('p');
        return s;
    };
    std::sort(moves.begin(), moves.end(),
              [&](const Move &a, const Move &b) {
                  return score(a) > score(b);
              });
}

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

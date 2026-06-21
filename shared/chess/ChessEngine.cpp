#include "ChessEngine.h"
#include "MoveGen.h"
#include "Search.h"
#include <algorithm>
#include <cctype>
#include <cstdlib>

ChessEngine::ChessEngine() {
    whiteSeconds = DEFAULT_TIME;
    blackSeconds = DEFAULT_TIME;
    reset();
}

void ChessEngine::reset() {
    snap.board = {
        {"r","n","b","q","k","b","n","r"},
        {"p","p","p","p","p","p","p","p"},
        {"","","","","","","",""},
        {"","","","","","","",""},
        {"","","","","","","",""},
        {"","","","","","","",""},
        {"P","P","P","P","P","P","P","P"},
        {"R","N","B","Q","K","B","N","R"},
    };
    snap.whiteTurn      = true;
    snap.whiteKingMoved = snap.blackKingMoved  = false;
    snap.whiteRookAMoved= snap.whiteRookHMoved = false;
    snap.blackRookAMoved= snap.blackRookHMoved = false;
    snap.enPassantX     = snap.enPassantY      = -1;
    resetTimer();
}

void ChessEngine::resetTimer() {
    whiteSeconds = DEFAULT_TIME;
    blackSeconds = DEFAULT_TIME;
}

int ChessEngine::getWhiteTime() const { return whiteSeconds; }
int ChessEngine::getBlackTime() const { return blackSeconds; }

bool ChessEngine::tick(bool white, int seconds) {
    if (white) {
        whiteSeconds = std::max(0, whiteSeconds - seconds);
        return whiteSeconds > 0;
    }
    blackSeconds = std::max(0, blackSeconds - seconds);
    return blackSeconds > 0;
}

std::vector<std::vector<std::string>> ChessEngine::getBoard() const {
    return snap.board;
}

std::string ChessEngine::getTurn() const {
    return snap.whiteTurn ? "white" : "black";
}

bool ChessEngine::isPathClear(int fromX, int fromY, int toX, int toY) const {
    int stepX = toX == fromX ? 0 : (toX - fromX) / std::abs(toX - fromX);
    int stepY = toY == fromY ? 0 : (toY - fromY) / std::abs(toY - fromY);
    int x = fromX + stepX, y = fromY + stepY;
    while (x != toX || y != toY) {
        if (!snap.board[x][y].empty()) return false;
        x += stepX; y += stepY;
    }
    return true;
}

bool ChessEngine::isValidPieceMove(const std::string &piece,
                                   int fromX, int fromY,
                                   int toX,   int toY) const {
    bool isWhitePiece = isupper(piece[0]) != 0;
    char p  = (char)tolower(piece[0]);
    int  dx = toX - fromX;
    int  dy = toY - fromY;

    switch (p) {
    case 'p': {
        int dir      = isWhitePiece ? -1 : 1;
        int startRow = isWhitePiece ?  6 :  1;

        if (dy == 0 && snap.board[toX][toY].empty()) {
            if (dx == dir) return true;
            if (fromX == startRow && dx == 2 * dir &&
                snap.board[fromX + dir][fromY].empty())
                return true;
        }
        if (std::abs(dy) == 1 && dx == dir) {
            if (!snap.board[toX][toY].empty() &&
                (isupper(snap.board[toX][toY][0]) != 0) != isWhitePiece)
                return true;
            if (snap.board[toX][toY].empty() &&
                toX == snap.enPassantX && toY == snap.enPassantY)
                return true;
        }
        return false;
    }
    case 'r':
        return (dx == 0 || dy == 0) && isPathClear(fromX, fromY, toX, toY);
    case 'b':
        return std::abs(dx) == std::abs(dy) &&
               isPathClear(fromX, fromY, toX, toY);
    case 'q':
        return ((dx == 0 || dy == 0) || std::abs(dx) == std::abs(dy)) &&
               isPathClear(fromX, fromY, toX, toY);
    case 'n':
        return (std::abs(dx) == 2 && std::abs(dy) == 1) ||
               (std::abs(dx) == 1 && std::abs(dy) == 2);
    case 'k':
        return std::abs(dx) <= 1 && std::abs(dy) <= 1;
    default:
        return false;
    }
}

bool ChessEngine::isSquareAttacked(int x, int y, bool byWhite) const {
    for (int i = 0; i < 8; i++)
        for (int j = 0; j < 8; j++) {
            const auto &cell = snap.board[i][j];
            if (!cell.empty() && (isupper(cell[0]) != 0) == byWhite)
                if (isValidPieceMove(cell, i, j, x, y))
                    return true;
        }
    return false;
}

bool ChessEngine::isInCheck(bool white) const {
    char king = white ? 'K' : 'k';
    for (int x = 0; x < 8; x++)
        for (int y = 0; y < 8; y++)
            if (snap.board[x][y] == std::string(1, king))
                return isSquareAttacked(x, y, !white);
    return false;
}

bool ChessEngine::canCastle(bool white, bool kingSide) const {
    if (white  &&  snap.whiteKingMoved)  return false;
    if (!white &&  snap.blackKingMoved)  return false;
    if (white  &&  kingSide && snap.whiteRookHMoved) return false;
    if (white  && !kingSide && snap.whiteRookAMoved) return false;
    if (!white &&  kingSide && snap.blackRookHMoved) return false;
    if (!white && !kingSide && snap.blackRookAMoved) return false;

    int row = white ? 7 : 0;
    std::string rook = white ? "R" : "r";
    if (snap.board[row][kingSide ? 7 : 0] != rook) return false;

    if (kingSide) {
        if (!snap.board[row][5].empty() || !snap.board[row][6].empty())
            return false;
    } else {
        if (!snap.board[row][1].empty() ||
            !snap.board[row][2].empty() ||
            !snap.board[row][3].empty())
            return false;
    }

    bool att = !white;
    int  p1  = kingSide ? 5 : 3;
    int  p2  = kingSide ? 6 : 2;
    return !isSquareAttacked(row, 4, att) &&
           !isSquareAttacked(row, p1, att) &&
           !isSquareAttacked(row, p2, att);
}

bool ChessEngine::isCheckmate(bool white) {
    if (!isInCheck(white)) return false;

    MoveGenContext ctx{
        snap.board, snap.whiteTurn,
        snap.enPassantX, snap.enPassantY,
        [this](bool w, bool ks) { return canCastle(w, ks); },
        [this](const std::string &p, int fx, int fy, int tx, int ty) {
            return isValidPieceMove(p, fx, fy, tx, ty);
        },
        [this](bool w) { return isInCheck(w); },
    };

    for (const auto &m : generateAllMoves(ctx, white)) {
        BoardSnapshot saved = snap;
        snap.board[m.toX][m.toY]     = snap.board[m.fromX][m.fromY];
        snap.board[m.fromX][m.fromY] = "";
        bool simEP = (tolower(snap.board[m.toX][m.toY][0]) == 'p' &&
                      std::abs(m.toY - m.fromY) == 1 &&
                      snap.board[m.toX][m.toY].empty() == false &&
                      m.toX == saved.enPassantX && m.toY == saved.enPassantY);
        if (simEP) snap.board[m.fromX][m.toY] = "";
        snap.enPassantX = snap.enPassantY = -1;

        bool still = isInCheck(white);
        snap = saved;
        if (!still) return false;
    }
    return true;
}

std::string ChessEngine::makeMove(const std::string &move) {
    if (move.length() != 4 && move.length() != 5) return "invalid";

    int fromX = 8 - (move[1] - '0'), fromY = move[0] - 'a';
    int toX   = 8 - (move[3] - '0'), toY   = move[2] - 'a';

    if (fromX < 0 || fromX > 7 || fromY < 0 || fromY > 7 ||
        toX   < 0 || toX   > 7 || toY   < 0 || toY   > 7)
        return "invalid";

    std::string piece = snap.board[fromX][fromY];
    if (piece.empty()) return "invalid";

    bool isWhitePiece = isupper(piece[0]) != 0;
    if (snap.whiteTurn != isWhitePiece) return "invalid";

    bool isPawn         = tolower(piece[0]) == 'p';
    int  promoRow       = isWhitePiece ? 0 : 7;
    bool reachesPromo   = isPawn && toX == promoRow;
    char promotionPiece = 'q';

    if (reachesPromo) {
        if (move.length() != 5) return "invalid";
        char raw = (char)tolower(move[4]);
        if (raw != 'q' && raw != 'r' && raw != 'b' && raw != 'n') return "invalid";
        promotionPiece = raw;
    } else {
        if (move.length() == 5) return "invalid";
    }

    bool isCastling = false, castleKS = false;
    if (tolower(piece[0]) == 'k' && fromY == 4 &&
        std::abs(toY - fromY) == 2 && fromX == toX) {
        castleKS = (toY == 6);
        if (!canCastle(isWhitePiece, castleKS)) return "invalid";
        isCastling = true;
    }

    if (!isCastling) {
        if (!isValidPieceMove(piece, fromX, fromY, toX, toY)) return "invalid";
        if (!snap.board[toX][toY].empty() &&
            (isupper(snap.board[toX][toY][0]) != 0) == isWhitePiece)
            return "invalid";
    }

    BoardSnapshot saved = snap;

    bool isEP = isPawn && std::abs(toY - fromY) == 1 &&
                snap.board[toX][toY].empty() &&
                toX == snap.enPassantX && toY == snap.enPassantY;

    if (isCastling) {
        snap.board[toX][toY]   = piece;
        snap.board[fromX][fromY] = "";
        int rf = castleKS ? 7 : 0, rt = castleKS ? 5 : 3;
        snap.board[toX][rt] = snap.board[toX][rf];
        snap.board[toX][rf] = "";
    } else {
        snap.board[toX][toY]   = piece;
        snap.board[fromX][fromY] = "";
        if (isEP) snap.board[fromX][toY] = "";
        if (reachesPromo) {
            char pc = isWhitePiece ? (char)toupper(promotionPiece) : promotionPiece;
            snap.board[toX][toY] = std::string(1, pc);
        }
    }

    snap.enPassantX = snap.enPassantY = -1;
    if (piece == "K") snap.whiteKingMoved  = true;
    if (piece == "k") snap.blackKingMoved  = true;
    if (fromX == 7 && fromY == 0) snap.whiteRookAMoved = true;
    if (fromX == 7 && fromY == 7) snap.whiteRookHMoved = true;
    if (fromX == 0 && fromY == 0) snap.blackRookAMoved = true;
    if (fromX == 0 && fromY == 7) snap.blackRookHMoved = true;

    if (isInCheck(isWhitePiece)) { snap = saved; return "false"; }

    snap.whiteTurn = !snap.whiteTurn;

    if (isInCheck(!isWhitePiece))
        return isCheckmate(!isWhitePiece) ? "checkmate" : "check";

    return "valid";
}

std::vector<std::string> ChessEngine::getValidMoves(const std::string &square) {
    std::vector<std::string> result;
    if (square.length() != 2) return result;

    int fromY = square[0] - 'a';
    int fromX = 8 - (square[1] - '0');
    if (fromX < 0 || fromX > 7 || fromY < 0 || fromY > 7) return result;

    std::string piece = snap.board[fromX][fromY];
    if (piece.empty()) return result;
    if ((isupper(piece[0]) != 0) != snap.whiteTurn) return result;

    MoveGenContext ctx{
        snap.board, snap.whiteTurn,
        snap.enPassantX, snap.enPassantY,
        [this](bool w, bool ks) { return canCastle(w, ks); },
        [this](const std::string &p, int fx, int fy, int tx, int ty) {
            return isValidPieceMove(p, fx, fy, tx, ty);
        },
        [this](bool w) { return isInCheck(w); },
    };

    bool isWhitePiece = isupper(piece[0]) != 0;

    auto squareName = [](int x, int y) {
        return std::string(1, (char)('a' + y)) +
               std::string(1, (char)('0' + (8 - x)));
    };

    for (const auto &m : generateAllMoves(ctx, isWhitePiece)) {
        if (m.fromX != fromX || m.fromY != fromY) continue;

        BoardSnapshot saved = snap;
        bool isCastling = (tolower(piece[0]) == 'k' &&
                           std::abs(m.toY - m.fromY) == 2 &&
                           m.fromX == m.toX);
        bool simEP = (!isCastling && tolower(piece[0]) == 'p' &&
                      std::abs(m.toY - m.fromY) == 1 &&
                      snap.board[m.toX][m.toY].empty() &&
                      m.toX == snap.enPassantX && m.toY == snap.enPassantY);

        if (isCastling) {
            snap.board[m.toX][m.toY]   = piece;
            snap.board[m.fromX][m.fromY] = "";
            bool ks = (m.toY == 6);
            int  rf = ks ? 7 : 0, rt = ks ? 5 : 3;
            snap.board[m.toX][rt] = snap.board[m.toX][rf];
            snap.board[m.toX][rf] = "";
        } else {
            snap.board[m.toX][m.toY]    = piece;
            snap.board[m.fromX][m.fromY] = "";
            if (simEP) snap.board[m.fromX][m.toY] = "";
            if (tolower(piece[0]) == 'p') {
                int pr = isWhitePiece ? 0 : 7;
                if (m.toX == pr)
                    snap.board[m.toX][m.toY] = isWhitePiece ? "Q" : "q";
            }
        }
        snap.enPassantX = snap.enPassantY = -1;

        bool inCheck = isInCheck(isWhitePiece);
        snap = saved;

        if (!inCheck) {
            bool isPromoSq = (tolower(piece[0]) == 'p') &&
                             (m.toX == (isWhitePiece ? 0 : 7));
            std::string sq = squareName(m.toX, m.toY);
            result.push_back(isPromoSq ? sq + "=" : sq);
        }
    }
    return result;
}

std::string ChessEngine::getBestMove(bool white, int depth) {
    Searcher searcher(
        snap,
        [this](bool w)                            { return isInCheck(w); },
        [this](const std::string &p, int fx, int fy, int tx, int ty) {
            return isValidPieceMove(p, fx, fy, tx, ty);
        },
        [this](bool w, bool ks)                   { return canCastle(w, ks); }
    );
    return searcher.getBestMove(white, depth);
}

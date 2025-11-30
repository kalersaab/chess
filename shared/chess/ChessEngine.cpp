#include "ChessEngine.h"

ChessEngine::ChessEngine() { reset(); }

void ChessEngine::reset()
{
    board = {
        {"r", "n", "b", "q", "k", "b", "n", "r"},
        {"p", "p", "p", "p", "p", "p", "p", "p"},
        {"", "", "", "", "", "", "", ""},
        {"", "", "", "", "", "", "", ""},
        {"", "", "", "", "", "", "", ""},
        {"", "", "", "", "", "", "", ""},
        {"P", "P", "P", "P", "P", "P", "P", "P"},
        {"R", "N", "B", "Q", "K", "B", "N", "R"}};
    whiteTurn = true;
}
std::vector<std::vector<std::string>> ChessEngine::getBoard() const
{
    return board;
}
std::string ChessEngine::makeMove(const std::string &move) {
    if (move.length() != 4 && move.length() != 5) return "invalid";

    bool isPromotion = move.length() == 5;
    char promotionPiece = isPromotion ? move[4] : '\0';
    int fromX = 8 - (move[1] - '0');
    int fromY = move[0] - 'a';
    int toX = 8 - (move[3] - '0');
    int toY = move[2] - 'a';

    std::string piece = board[fromX][fromY];
    if (piece.empty()) return "invalid";

    bool isWhitePiece = isupper(piece[0]);
    if (whiteTurn != isWhitePiece) return "invalid";

    if (!isValidPieceMove(piece, fromX, fromY, toX, toY)) return "invalid";
    if (!board[toX][toY].empty() && isupper(board[toX][toY][0]) == isWhitePiece) return "invalid";

    auto oldBoard = board;
    bool oldTurn = whiteTurn;

    board[toX][toY] = piece;
    board[fromX][fromY] = "";

    if (isPromotion && tolower(piece[0]) == 'p' && (toX == 0 || toX == 7)) {
        char promoChar = isWhitePiece ? toupper(promotionPiece)
                                      : tolower(promotionPiece);
        board[toX][toY] = std::string(1, promoChar);
    }

    if (isInCheck(isWhitePiece)) {
        board = oldBoard;
        whiteTurn = oldTurn;
        return "false";
    }

    whiteTurn = !whiteTurn;
    
    if (isInCheck(!isWhitePiece)) {
        if (isCheckmate(!isWhitePiece))
            return "checkmate";
        return "check";
    }

    return "valid";
}

bool ChessEngine::isInCheck(bool white) const {
    int kingX = -1, kingY = -1;
    char kingChar = white ? 'K' : 'k';

    for (int x = 0; x < 8; x++) {
        for (int y = 0; y < 8; y++) {
            if (board[x][y] == std::string(1, kingChar)) {
                kingX = x; kingY = y;
                break;
            }
        }
    }

    if (kingX == -1) return false;
    return isSquareAttacked(kingX, kingY, !white);
}

bool ChessEngine::isSquareAttacked(int x, int y, bool byWhite) const {
    for (int i = 0; i < 8; i++) {
        for (int j = 0; j < 8; j++) {
            if (!board[i][j].empty() && (isupper(board[i][j][0]) == byWhite)) {
                if (isValidPieceMove(board[i][j], i, j, x, y)) {
                    return true;
                }
            }
        }
    }
    return false;
}

bool ChessEngine::isValidPieceMove(const std::string &piece, int fromX, int fromY, int toX, int toY) const
{
    bool isWhitePiece = isupper(piece[0]);
    char p = tolower(piece[0]);
    int dx = toX - fromX;
    int dy = toY - fromY;

    switch (p)
    {
    case 'p':
    {
        int direction = isWhitePiece ? -1 : 1;
        int startRow = isWhitePiece ? 6 : 1;
        int promotionRow = isWhitePiece ? 0 : 7;

        if (dy == 0 && board[toX][toY].empty())
        {
            if (dx == direction)
            {
                if (toX == promotionRow)
                    return true;
                return true;
            }
            if (fromX == startRow && dx == 2 * direction &&
                board[fromX + direction][fromY].empty())
            {
                return true;
            }
        }

        if (abs(dy) == 1 && dx == direction && !board[toX][toY].empty())
        {
            bool targetIsWhite = isupper(board[toX][toY][0]);
            if (targetIsWhite != isWhitePiece)
            {
                if (toX == promotionRow)
                    return true;
                return true;
            }
        }

        return false;
    }

    case 'r':
        return (dx == 0 || dy == 0) && isPathClear(fromX, fromY, toX, toY);
    case 'b':
        return abs(dx) == abs(dy) && isPathClear(fromX, fromY, toX, toY);
    case 'q':
        return ((dx == 0 || dy == 0) || abs(dx) == abs(dy)) && isPathClear(fromX, fromY, toX, toY);
    case 'n':
        return (abs(dx) == 2 && abs(dy) == 1) || (abs(dx) == 1 && abs(dy) == 2);
    case 'k':
        return abs(dx) <= 1 && abs(dy) <= 1;

    default:
        return false;
    }
}

bool ChessEngine::isPathClear(int fromX, int fromY, int toX, int toY) const
{
    int stepX = (toX - fromX) == 0 ? 0 : (toX - fromX) / abs(toX - fromX);
    int stepY = (toY - fromY) == 0 ? 0 : (toY - fromY) / abs(toY - fromY);

    int x = fromX + stepX;
    int y = fromY + stepY;

    while (x != toX || y != toY)
    {
        if (!board[x][y].empty())
            return false;
        x += stepX;
        y += stepY;
    }
    return true;
}

bool ChessEngine::isCheckmate(bool isWhiteTurnPlayer) {
    if (!isInCheck(isWhiteTurnPlayer))
        return false;

    for (int fromX = 0; fromX < 8; fromX++) {
        for (int fromY = 0; fromY < 8; fromY++) {
            std::string piece = board[fromX][fromY];
            if (piece.empty()) continue;

            bool isWhitePiece = isupper(piece[0]);
            if (isWhitePiece != isWhiteTurnPlayer) continue;

            for (int toX = 0; toX < 8; toX++) {
                for (int toY = 0; toY < 8; toY++) {

                    if (!isValidPieceMove(piece, fromX, fromY, toX, toY)) continue;
                    if (!board[toX][toY].empty() &&
                        isupper(board[toX][toY][0]) == isWhitePiece)
                        continue;
                    auto originalBoard = board;
                    bool originalWhiteTurn = whiteTurn;

                    board[toX][toY] = piece;
                    board[fromX][fromY] = "";

                    bool stillInCheck = isInCheck(isWhiteTurnPlayer);

                    board = originalBoard;
                    whiteTurn = originalWhiteTurn;

                    if (!stillInCheck)
                        return false;
                }
            }
        }
    }
    return true;
}

std::string ChessEngine::getTurn() const
{
    return whiteTurn ? "white" : "black";
}

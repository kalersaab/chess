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
bool ChessEngine::makeMove(const std::string &move)
{
    if (move.length() != 4 && move.length() != 5)
        return false;
    bool isPromotion = (move.length() == 5);
    char promotionPiece = isPromotion ? move[4] : '\0';
    int fromX = 8 - (move[1] - '0');
    int fromY = move[0] - 'a';
    int toX = 8 - (move[3] - '0');
    int toY = move[2] - 'a';
    if (fromX < 0 || fromX >= 8 || fromY < 0 || fromY >= 8 ||
        toX < 0 || toX >= 8 || toY < 0 || toY >= 8)
    {
        return false;
    }
    std::string piece = board[fromX][fromY];
    if (piece.empty())
        return false;

    bool isWhitePiece = isupper(piece[0]);
    if (whiteTurn != isWhitePiece)
        return false;
    if (!isValidPieceMove(piece, fromX, fromY, toX, toY))
        return false;
    if (!board[toX][toY].empty() && isupper(board[toX][toY][0]) == isWhitePiece)
    {
        return false;
    }

    board[toX][toY] = piece;
    board[fromX][fromY] = "";
    if (isPromotion && tolower(piece[0]) == 'p' && (toX == 0 || toX == 7))
    {
        char promoChar = isWhitePiece ? toupper(promotionPiece) : tolower(promotionPiece);
        board[toX][toY] = std::string(1, promoChar);
    }
    else
    {
        board[toX][toY] = piece;
    }

    whiteTurn = !whiteTurn;
    return true;
}
bool ChessEngine::isValidPieceMove(const std::string &piece, int fromX, int fromY, int toX, int toY)
{
    bool isWhitePiece = isupper(piece[0]); // FIXED
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

bool ChessEngine::isPathClear(int fromX, int fromY, int toX, int toY)
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
std::string ChessEngine::getTurn() const
{
    return whiteTurn ? "white" : "black";
}

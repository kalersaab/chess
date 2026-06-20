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
    whiteKingMoved = false;
    blackKingMoved = false;
    whiteRookAMoved = false;
    whiteRookHMoved = false;
    blackRookAMoved = false;
    blackRookHMoved = false;
    enPassantX = -1;
    enPassantY = -1;
}
std::vector<std::vector<std::string>> ChessEngine::getBoard() const
{
    return board;
}
std::string ChessEngine::makeMove(const std::string &move) {
    if (move.length() != 4 && move.length() != 5) return "invalid";

    int fromX = 8 - (move[1] - '0');
    int fromY = move[0] - 'a';
    int toX = 8 - (move[3] - '0');
    int toY = move[2] - 'a';
    if (fromX < 0 || fromX >= 8 || fromY < 0 || fromY >= 8 ||
        toX < 0 || toX >= 8 || toY < 0 || toY >= 8) {
        return "invalid";
    }
    std::string piece = board[fromX][fromY];
    if (piece.empty()) return "invalid";

    bool isWhitePiece = isupper(piece[0]);
    if (whiteTurn != isWhitePiece) return "invalid";
    int promotionRow = isWhitePiece ? 0 : 7;
    bool isPawnMove = (tolower(piece[0]) == 'p');
    bool reachesPromotionRow = isPawnMove && (toX == promotionRow);

    bool isPromotion = false;
    char promotionPiece = 'q'; 
    if (reachesPromotionRow) {
        if (move.length() != 5) return "invalid";
        char raw = tolower(move[4]);
        if (raw != 'q' && raw != 'r' && raw != 'b' && raw != 'n') return "invalid";
        isPromotion = true;
        promotionPiece = raw;
    } else {
        if (move.length() == 5) return "invalid";
    }

    bool isCastling = false;
    bool castleKingSide = false;
    if (tolower(piece[0]) == 'k' && fromY == 4 && abs(toY - fromY) == 2 && fromX == toX) {
        castleKingSide = (toY == 6);
        if (!canCastle(isWhitePiece, castleKingSide)) return "invalid";
        isCastling = true;
    }

    if (!isCastling) {
        if (!isValidPieceMove(piece, fromX, fromY, toX, toY)) return "invalid";
        if (!board[toX][toY].empty() && isupper(board[toX][toY][0]) == isWhitePiece) return "invalid";
    }

    auto oldBoard = board;
    bool oldTurn = whiteTurn;
    bool oldWhiteKingMoved  = whiteKingMoved;
    bool oldBlackKingMoved  = blackKingMoved;
    bool oldWhiteRookAMoved = whiteRookAMoved;
    bool oldWhiteRookHMoved = whiteRookHMoved;
    bool oldBlackRookAMoved = blackRookAMoved;
    bool oldBlackRookHMoved = blackRookHMoved;
    int oldEnPassantX = enPassantX;
    int oldEnPassantY = enPassantY;

    bool isEnPassant = false;
    int capturedPawnX = -1, capturedPawnY = -1;
    if (tolower(piece[0]) == 'p' && abs(toY - fromY) == 1 &&
        board[toX][toY].empty() && toX == enPassantX && toY == enPassantY)
    {
        isEnPassant = true;
        capturedPawnX = fromX;
        capturedPawnY = toY;
    }

    if (isCastling) {
        board[toX][toY] = piece;
        board[fromX][fromY] = "";
        int rookFromY = castleKingSide ? 7 : 0;
        int rookToY   = castleKingSide ? 5 : 3;
        board[toX][rookToY] = board[toX][rookFromY];
        board[toX][rookFromY] = "";
    } else {
        board[toX][toY] = piece;
        board[fromX][fromY] = "";

        if (isEnPassant) {
            board[capturedPawnX][capturedPawnY] = "";
        }

        if (isPromotion) {
            char promoChar = isWhitePiece ? toupper(promotionPiece)
                                          : tolower(promotionPiece);
            board[toX][toY] = std::string(1, promoChar);
        }
    }

    enPassantX = -1;
    enPassantY = -1;
    if (tolower(piece[0]) == 'p' && abs(toX - fromX) == 2) {
        enPassantX = (fromX + toX) / 2;
        enPassantY = fromY;
    }

    if (piece == "K") whiteKingMoved = true;
    if (piece == "k") blackKingMoved = true;
    if (fromX == 7 && fromY == 0) whiteRookAMoved = true;
    if (fromX == 7 && fromY == 7) whiteRookHMoved = true;
    if (fromX == 0 && fromY == 0) blackRookAMoved = true;
    if (fromX == 0 && fromY == 7) blackRookHMoved = true;

    if (isInCheck(isWhitePiece)) {
        board = oldBoard;
        whiteTurn = oldTurn;
        whiteKingMoved  = oldWhiteKingMoved;
        blackKingMoved  = oldBlackKingMoved;
        whiteRookAMoved = oldWhiteRookAMoved;
        whiteRookHMoved = oldWhiteRookHMoved;
        blackRookAMoved = oldBlackRookAMoved;
        blackRookHMoved = oldBlackRookHMoved;
        enPassantX = oldEnPassantX;
        enPassantY = oldEnPassantY;
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

        if (abs(dy) == 1 && dx == direction &&
            board[toX][toY].empty() &&
            toX == enPassantX && toY == enPassantY)
        {
            return true;
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
                    int savedEpX = enPassantX;
                    int savedEpY = enPassantY;

                    bool simEP = (tolower(piece[0]) == 'p' && abs(toY - fromY) == 1 &&
                                  board[toX][toY].empty() &&
                                  toX == enPassantX && toY == enPassantY);

                    board[toX][toY] = piece;
                    board[fromX][fromY] = "";
                    if (simEP) {
                        board[fromX][toY] = "";
                    }

                    if (tolower(piece[0]) == 'p') {
                        int promoRow = isWhitePiece ? 0 : 7;
                        if (toX == promoRow) {
                            board[toX][toY] = isWhitePiece ? "Q" : "q";
                        }
                    }
                    enPassantX = -1;
                    enPassantY = -1;

                    bool stillInCheck = isInCheck(isWhiteTurnPlayer);

                    board = originalBoard;
                    whiteTurn = originalWhiteTurn;
                    enPassantX = savedEpX;
                    enPassantY = savedEpY;

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

bool ChessEngine::canCastle(bool white, bool kingSide) const
{
    if (white && whiteKingMoved) return false;
    if (!white && blackKingMoved) return false;

    if (white  &&  kingSide && whiteRookHMoved) return false;
    if (white  && !kingSide && whiteRookAMoved) return false;
    if (!white &&  kingSide && blackRookHMoved) return false;
    if (!white && !kingSide && blackRookAMoved) return false;

    int row = white ? 7 : 0;

    std::string expectedRook = white ? "R" : "r";
    int rookCol = kingSide ? 7 : 0;
    if (board[row][rookCol] != expectedRook) return false;
    if (kingSide) {
        if (!board[row][5].empty() || !board[row][6].empty()) return false;
    } else {
        if (!board[row][1].empty() || !board[row][2].empty() || !board[row][3].empty()) return false;
    }

    bool byWhiteAttacker = !white;
    int kingPassY1 = kingSide ? 5 : 3;
    int kingDestY  = kingSide ? 6 : 2;

    if (isSquareAttacked(row, 4,        byWhiteAttacker)) return false;
    if (isSquareAttacked(row, kingPassY1, byWhiteAttacker)) return false;
    if (isSquareAttacked(row, kingDestY,  byWhiteAttacker)) return false;

    return true;
}

std::vector<std::string> ChessEngine::getValidMoves(const std::string &square)
{
    std::vector<std::string> moves;
    if (square.length() != 2) return moves;

    int fromY = square[0] - 'a';
    int fromX = 8 - (square[1] - '0');
    if (fromX < 0 || fromX >= 8 || fromY < 0 || fromY >= 8) return moves;

    std::string piece = board[fromX][fromY];
    if (piece.empty()) return moves;

    bool isWhitePiece = isupper(piece[0]);
    if (whiteTurn != isWhitePiece) return moves;

    auto squareName = [](int x, int y) -> std::string {
        return std::string(1, 'a' + y) + std::string(1, '0' + (8 - x));
    };

    for (int toX = 0; toX < 8; toX++) {
        for (int toY = 0; toY < 8; toY++) {
            if (toX == fromX && toY == fromY) continue;

            bool isCastling = false;
            bool castleKingSide = false;
            if (tolower(piece[0]) == 'k' && fromY == 4 && abs(toY - fromY) == 2 && fromX == toX) {
                castleKingSide = (toY == 6);
                if (canCastle(isWhitePiece, castleKingSide)) {
                    isCastling = true;
                } else {
                    continue;
                }
            }

            if (!isCastling) {
                if (!isValidPieceMove(piece, fromX, fromY, toX, toY)) continue;
                if (!board[toX][toY].empty() && isupper(board[toX][toY][0]) == isWhitePiece) continue;
            }

            // Simulate the move and check if it leaves own king in check
            auto savedBoard = board;
            int savedEpX = enPassantX;
            int savedEpY = enPassantY;

            bool simEP = (tolower(piece[0]) == 'p' && abs(toY - fromY) == 1 &&
                          board[toX][toY].empty() &&
                          toX == enPassantX && toY == enPassantY);

            if (isCastling) {
                board[toX][toY] = piece;
                board[fromX][fromY] = "";
                int rookFromY = castleKingSide ? 7 : 0;
                int rookToY   = castleKingSide ? 5 : 3;
                board[toX][rookToY] = board[toX][rookFromY];
                board[toX][rookFromY] = "";
            } else {
                board[toX][toY] = piece;
                board[fromX][fromY] = "";
                if (simEP) {
                    board[fromX][toY] = "";
                }
                if (tolower(piece[0]) == 'p') {
                    int promoRow = isWhitePiece ? 0 : 7;
                    if (toX == promoRow) {
                        board[toX][toY] = isWhitePiece ? "Q" : "q";
                    }
                }
            }
            enPassantX = -1;
            enPassantY = -1;

            bool inCheck = isInCheck(isWhitePiece);
            board = savedBoard;
            enPassantX = savedEpX;
            enPassantY = savedEpY;

            if (!inCheck) {
                bool isPromoSquare = (tolower(piece[0]) == 'p') &&
                                     (toX == (isWhitePiece ? 0 : 7));
                std::string sq = squareName(toX, toY);
                moves.push_back(isPromoSquare ? sq + "=" : sq);
            }
        }
    }
    return moves;
}

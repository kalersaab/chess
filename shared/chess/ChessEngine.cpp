#include "ChessEngine.h"
#include <iostream>
ChessEngine::ChessEngine() { reset(); }

void ChessEngine::reset() {
    board = {
        {"r","n","b","q","k","b","n","r"},
        {"p","p","p","p","p","p","p","p"},
        {"","","","","","","",""},
        {"","","","","","","",""},
        {"","","","","","","",""},
        {"","","","","","","",""},
        {"P","P","P","P","P","P","P","P"},
        {"R","N","B","Q","K","B","N","R"}
    };
    whiteTurn = true;
}
std::vector<std::vector<std::string>> ChessEngine::getBoard() const{
    return board;
}
bool ChessEngine::makeMove(const std::string &move) {
    if (move.length() != 4) return false;

    int fromX = 8 - (move[1] - '0');
    int fromY = move[0] - 'a';
    int toX = 8 - (move[3] - '0');
    int toY = move[2] - 'a';

    // Validate board limits
    if (fromX < 0 || fromX >= 8 || fromY < 0 || fromY >= 8 ||
        toX < 0 || toX >= 8 || toY < 0 || toY >= 8) {
        return false;
    }

    std::string piece = board[fromX][fromY];

    // No piece at from position
    if (piece.empty()) return false;

    // You can add basic turn logic (optional)
    bool isWhitePiece = isupper(piece[0]);
    if (whiteTurn != isWhitePiece) return false;

    // (Optional) prevent moving if same color occupies target
    if (!board[toX][toY].empty() && isupper(board[toX][toY][0]) == isWhitePiece) {
        return false;  // cannot capture own piece
    }

    // Apply move
    board[toX][toY] = piece;
    board[fromX][fromY] = "";
    
    whiteTurn = !whiteTurn;
    return true;
}

std::string ChessEngine::getTurn() {
    return whiteTurn ? "white" : "black";
}

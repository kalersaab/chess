#pragma once
#include <string>
#include <vector>

class ChessEngine {
public:
    ChessEngine();
    void reset();
    std::string makeMove(const std::string &move);
    std::string getTurn() const;
    std::vector<std::vector<std::string>> getBoard() const;
    bool isValidPieceMove(const std::string &piece, int fromX, int fromY, int toX, int toY) const;
    bool isPathClear(int fromX, int fromY, int toX, int toY)const;
    bool isInCheck(bool white) const;
    bool isSquareAttacked(int x, int y, bool byWhite) const;
    bool isCheckmate(bool white);

private:
    std::vector<std::vector<std::string>> board;
    bool whiteTurn;
};

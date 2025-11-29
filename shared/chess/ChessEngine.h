#pragma once
#include <string>
#include <vector>

class ChessEngine {
public:
    ChessEngine();
    void reset();
    bool makeMove(const std::string &move);
    std::string getTurn() const;
    std::vector<std::vector<std::string>> getBoard() const;
    bool isValidPieceMove(const std::string &piece, int fromX, int fromY, int toX, int toY);
    bool isPathClear(int fromX, int fromY, int toX, int toY);

private:
    std::vector<std::vector<std::string>> board;
    bool whiteTurn;
};

#pragma once
#include <string>
#include <vector>

class ChessEngine {
public:
    ChessEngine();
    void reset();
    bool makeMove(const std::string &move);
    std::string getTurn();
    std::vector<std::vector<std::string>> getBoard() const;

private:
    std::vector<std::vector<std::string>> board;
    bool whiteTurn;
};

#pragma once
#include "BoardState.h"
#include <string>
#include <vector>

class ChessEngine {
public:
    ChessEngine();
    void reset();
    std::string makeMove(const std::string &move);
    std::string getTurn() const;
    std::vector<std::vector<std::string>> getBoard() const;
    std::vector<std::string> getValidMoves(const std::string &square);
    bool isCheckmate(bool white);
    void resetTimer();
    int  getWhiteTime() const;
    int  getBlackTime() const;
    bool tick(bool white, int seconds = 1);
    std::string getBestMove(bool white, int depth = 4);

private:
    BoardSnapshot snap;
    static constexpr int DEFAULT_TIME = 10 * 60;
    int whiteSeconds;
    int blackSeconds;
    bool isInCheck(bool white) const;
};

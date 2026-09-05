#pragma once
#include "BoardState.h"
#include <string>
#include <vector>
#include <map>

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

    std::string getFEN() const;
    bool        loadFEN(const std::string &fen);
    std::string getPGN() const;
    bool        loadPGN(const std::string &pgn);
    bool        goToMove(int index);
    void        recordMove(const std::string &uci, const std::string &san);
    BoardSnapshot getBoardSnapshot() const;

    bool isThreefoldRepetition() const;
    void recordPosition();
    void clearPositionHistory();

private:
    BoardSnapshot snap;
    static constexpr int DEFAULT_TIME = 10 * 60;
    int whiteSeconds;
    int blackSeconds;
    bool isInCheck(bool white) const;

    std::vector<std::string> pgnMoves;
    int fullMoveNumber;

    std::map<std::string, int> positionHistory;
    std::string getPositionKey() const;
};

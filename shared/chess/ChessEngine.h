#pragma once
#include <string>
#include <vector>
#include <limits>

class ChessEngine {
public:
    ChessEngine();
    void reset();
    void resetTimer();
    int getWhiteTime() const;
    int getBlackTime() const;
    bool tick(bool white, int seconds = 1);
    std::string makeMove(const std::string &move);
    std::string getTurn() const;
    std::vector<std::vector<std::string>> getBoard() const;
    bool isValidPieceMove(const std::string &piece, int fromX, int fromY, int toX, int toY) const;
    bool isPathClear(int fromX, int fromY, int toX, int toY) const;
    bool isInCheck(bool white) const;
    bool isSquareAttacked(int x, int y, bool byWhite) const;
    bool isCheckmate(bool white);
    bool canCastle(bool white, bool kingSide) const;
    std::vector<std::string> getValidMoves(const std::string &square);

    std::string getBestMove(bool white, int depth = 4);

private:
    std::vector<std::vector<std::string>> board;
    bool whiteTurn;
    int whiteSeconds;
    int blackSeconds;

    bool whiteKingMoved;
    bool blackKingMoved;
    bool whiteRookAMoved;
    bool whiteRookHMoved;
    bool blackRookAMoved;
    bool blackRookHMoved;
    int enPassantX;
    int enPassantY;

    struct Move {
        int fromX, fromY, toX, toY;
        char promotion;
    };

    std::vector<Move> generateAllMoves(bool white) const;
    std::vector<Move> generateAllCaptureMoves(bool white) const;
    int quiescence(int alpha, int beta, bool maximizing);
    std::string moveToUCI(const Move &m) const;
    bool applyMove(const Move &m);
    void undoMove(const Move &m,
                  const std::vector<std::vector<std::string>> &savedBoard,
                  bool savedWhiteTurn,
                  bool savedWKM, bool savedBKM,
                  bool savedWRAM, bool savedWRHM,
                  bool savedBRAM, bool savedBRHM,
                  int savedEpX, int savedEpY);

    int evaluate() const;
    int pieceValue(char p) const;
    int pieceSquareBonus(char p, bool isWhite, int x, int y) const;

    int alphaBeta(int depth, int alpha, int beta, bool maximizing);
};

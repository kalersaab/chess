#pragma once
#include <vector>
#include <string>
#include <cstdint>

struct Move {
    int  fromX, fromY;
    int  toX,   toY;
    char promotion; // '\0' = none, else 'q' 'r' 'b' 'n'

    bool operator==(const Move &o) const {
        return fromX == o.fromX && fromY == o.fromY &&
               toX  == o.toX   && toY  == o.toY   &&
               promotion == o.promotion;
    }
    bool isNull() const { return fromX == -1; }
    static Move null() { return {-1,-1,-1,-1,'\0'}; }
};

struct BoardSnapshot {
    std::vector<std::vector<std::string>> board;
    bool whiteTurn;
    bool whiteKingMoved, blackKingMoved;
    bool whiteRookAMoved, whiteRookHMoved;
    bool blackRookAMoved, blackRookHMoved;
    int  enPassantX, enPassantY;
};

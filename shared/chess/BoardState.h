#pragma once
#include "Attacks.h"
#include <vector>
#include <string>
#include <cstdint>
#include <cstring>
#include <cctype>

struct Move {
    int  fromX, fromY;
    int  toX,   toY;
    char promotion;

    bool operator==(const Move &o) const {
        return fromX == o.fromX && fromY == o.fromY &&
               toX  == o.toX   && toY  == o.toY   &&
               promotion == o.promotion;
    }
    bool isNull() const { return fromX == -1; }
    static Move null() { return {-1,-1,-1,-1,'\0'}; }
};

struct SquareDelta {
    uint8_t idx;
    uint8_t before;
};

struct UndoRecord {
    SquareDelta deltas[4];
    uint8_t     deltaCount;
    bool whiteTurn;
    bool whiteKingMoved, blackKingMoved;
    bool whiteRookAMoved, whiteRookHMoved;
    bool blackRookAMoved, blackRookHMoved;
    int  enPassantX, enPassantY;
    uint64_t occ;
};

struct BoardSnapshot {
    uint8_t  bd[64];
    std::vector<std::vector<std::string>> board;
    bool whiteTurn;
    bool whiteKingMoved, blackKingMoved;
    bool whiteRookAMoved, whiteRookHMoved;
    bool blackRookAMoved, blackRookHMoved;
    int  enPassantX, enPassantY;
    uint64_t occ;

    void syncOccupancy() {
        occ = 0;
        for (int i = 0; i < 64; i++)
            if (bd[i] != EMPTY) occ |= uint64_t(1) << i;
    }

    void syncFromString() {
        memset(bd, EMPTY, 64);
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                const std::string &cell = board[r][c];
                if (cell.empty()) { bd[r*8+c] = EMPTY; continue; }
                char ch = cell[0];
                bool w  = isupper(ch) != 0;
                uint8_t p = EMPTY;
                switch (tolower(ch)) {
                    case 'p': p = w ? W_PAWN   : B_PAWN;   break;
                    case 'n': p = w ? W_KNIGHT : B_KNIGHT; break;
                    case 'b': p = w ? W_BISHOP : B_BISHOP; break;
                    case 'r': p = w ? W_ROOK   : B_ROOK;   break;
                    case 'q': p = w ? W_QUEEN  : B_QUEEN;  break;
                    case 'k': p = w ? W_KING   : B_KING;   break;
                }
                bd[r*8+c] = p;
            }
        }
        syncOccupancy();
    }

    void syncToString() {
        static const char pieceChar[15] = {
            '\0', 'P', 'N', 'B', 'R', 'Q', 'K', '\0',
            '\0', 'p', 'n', 'b', 'r', 'q', 'k'
        };
        for (int r = 0; r < 8; r++)
            for (int c = 0; c < 8; c++) {
                uint8_t p = bd[r*8+c];
                board[r][c] = p == EMPTY ? "" : std::string(1, pieceChar[p]);
            }
    }
};

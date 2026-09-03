#pragma once
#include "BoardState.h"
#include <string>

bool openingBookLoad(const char *path);
std::string openingBookProbe(const BoardSnapshot &snap);

struct BookMoveInfo {
    std::string move;
    uint16_t weight;
    uint32_t totalWeight;
    bool isFromBook;
};

BookMoveInfo getLastBookMoveInfo();

bool hasBookMoves(const BoardSnapshot &snap);

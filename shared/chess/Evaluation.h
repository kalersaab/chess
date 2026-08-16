#pragma once
#include "BoardState.h"
#include <vector>
#include <string>

int pieceValue(char p);
int evaluate(const BoardSnapshot &snap);
int evaluate(const std::vector<std::vector<std::string>> &board);

int evaluateEndgame(const BoardSnapshot &snap);
int evaluatePassedPawns(const BoardSnapshot &snap);
bool isEndgame(const BoardSnapshot &snap);
int countPieces(const BoardSnapshot &snap, uint8_t piece);

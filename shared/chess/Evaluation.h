#pragma once
#include "BoardState.h"
#include <vector>
#include <string>

int pieceValue(char p);
int evaluate(const BoardSnapshot &snap);
int evaluate(const std::vector<std::vector<std::string>> &board);

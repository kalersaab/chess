#pragma once
#include "BoardState.h"
#include <string>

bool openingBookLoad(const char *path);
std::string openingBookProbe(const BoardSnapshot &snap);

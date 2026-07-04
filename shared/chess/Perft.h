#pragma once
#include "BoardState.h"
#include <cstdint>

uint64_t perft(BoardSnapshot &snap, int depth);
void     perftSuite(BoardSnapshot &snap);

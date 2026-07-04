#pragma once
#include "BoardState.h"
#include <vector>
#include <string>

std::vector<Move> generateAllMoves(const BoardSnapshot &snap, bool white);
std::vector<Move> generateCaptureMoves(const BoardSnapshot &snap, bool white);
bool isAttacked(const BoardSnapshot &snap, int s, bool byWhite);
bool isInCheck(const BoardSnapshot &snap, bool white);
std::string moveToUCI(const Move &m);
void orderMoves(std::vector<Move> &moves, const BoardSnapshot &snap);

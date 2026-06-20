#include "NativeChessModule.h"

namespace facebook::react {

NativeChessModule::NativeChessModule(std::shared_ptr<CallInvoker> jsInvoker)
    : NativeChessModuleCxxSpec(std::move(jsInvoker)) {
  engine = std::make_unique<ChessEngine>();
}
jsi::Array NativeChessModule::getBoard(jsi::Runtime &rt) {
  auto board = engine->getBoard();
  size_t rows = board.size();
  jsi::Array jsBoard(rt, rows);

  for (size_t i = 0; i < rows; i++) {
    size_t cols = board[i].size();
    jsi::Array jsRow(rt, cols);

    for (size_t j = 0; j < cols; j++) {
      jsRow.setValueAtIndex(rt, j, jsi::String::createFromUtf8(rt, board[i][j]));
    }

    jsBoard.setValueAtIndex(rt, i, jsRow);
  }

  return jsBoard;
}
void NativeChessModule::reset(jsi::Runtime &rt) {
  engine->reset();
}

std::string NativeChessModule::makeMove(jsi::Runtime &rt, std::string move) {
  return engine->makeMove(move);
}

int NativeChessModule::getWhiteTime(jsi::Runtime &rt) {
  return engine->getWhiteTime();
}

int NativeChessModule::getBlackTime(jsi::Runtime &rt) {
  return engine->getBlackTime();
}

bool NativeChessModule::tick(jsi::Runtime &rt, bool white) {
  return engine->tick(white);
}

void NativeChessModule::resetTimer(jsi::Runtime &rt) {
  engine->resetTimer();
}

std::string NativeChessModule::getTurn(jsi::Runtime &rt) {
  return engine->getTurn();
}

bool NativeChessModule::isCheckmate(jsi::Runtime &rt, bool white) {
  return engine->isCheckmate(white);
}

jsi::Array NativeChessModule::getValidMoves(jsi::Runtime &rt, std::string square) {
  auto moves = engine->getValidMoves(square);
  jsi::Array jsArray(rt, moves.size());
  for (size_t i = 0; i < moves.size(); i++) {
    jsArray.setValueAtIndex(rt, i, jsi::String::createFromUtf8(rt, moves[i]));
  }
  return jsArray;
}

std::string NativeChessModule::getBestMove(jsi::Runtime &rt, bool white, int depth) {
  return engine->getBestMove(white, depth);
}
} 

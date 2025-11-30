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

std::string NativeChessModule::getTurn(jsi::Runtime &rt) {
  return engine->getTurn();
}
bool NativeChessModule::isCheckmate(jsi::Runtime &rt, bool white) {
  return engine->isCheckmate(white);
}
} 

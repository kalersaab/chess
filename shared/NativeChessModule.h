#pragma once

#include <ChessSpecsJSI.h>
#include <memory>
#include <string>
#include <vector>
#include "ChessEngine.h"

namespace facebook::react
{

  class NativeChessModule : public NativeChessModuleCxxSpec<NativeChessModule>
  {
  public:
    NativeChessModule(std::shared_ptr<CallInvoker> jsInvoker);

    void reset(jsi::Runtime &rt);
    void resetTimer(jsi::Runtime &rt);
    int getWhiteTime(jsi::Runtime &rt);
    int getBlackTime(jsi::Runtime &rt);
    bool tick(jsi::Runtime &rt, bool white);
    std::string makeMove(jsi::Runtime &rt, std::string move);
    std::string getTurn(jsi::Runtime &rt);
    jsi::Array getBoard(jsi::Runtime &rt);
    bool isCheckmate(jsi::Runtime &rt, bool white);
    jsi::Array getValidMoves(jsi::Runtime &rt, std::string square);
    std::string getBestMove(jsi::Runtime &rt, bool white, int depth);

  private:
    std::unique_ptr<ChessEngine> engine;
  };

}

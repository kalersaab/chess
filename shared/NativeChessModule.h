#pragma once

#include <ChessSpecsJSI.h>
#include <ReactCommon/TurboModule.h>
#include <react/bridging/Bridging.h>
#include <memory>
#include <string>
#include <vector>
#include "ChessEngine.h"

namespace facebook::react {

class NativeChessModule : public NativeChessModuleCxxSpec<NativeChessModule> {
public:
    NativeChessModule(std::shared_ptr<CallInvoker> jsInvoker);

    void         reset(jsi::Runtime &rt);
    void         resetTimer(jsi::Runtime &rt);
    int          getWhiteTime(jsi::Runtime &rt);
    int          getBlackTime(jsi::Runtime &rt);
    bool         tick(jsi::Runtime &rt, bool white);
    jsi::Value   makeMove(jsi::Runtime &rt, std::string move);
    jsi::Value   isCheckmate(jsi::Runtime &rt, bool white);
    std::string  getTurn(jsi::Runtime &rt);
    jsi::Array   getBoard(jsi::Runtime &rt);
    jsi::Array   getValidMoves(jsi::Runtime &rt, std::string square);
    jsi::Value   getBestMove(jsi::Runtime &rt, bool white, int depth);
    std::string  getFEN(jsi::Runtime &rt);
    bool         loadFEN(jsi::Runtime &rt, std::string fen);
    std::string  getPGN(jsi::Runtime &rt);

private:
    std::unique_ptr<ChessEngine> engine;
};

}

#include "NativeChessModule.h"
#include <thread>

namespace facebook::react {

NativeChessModule::NativeChessModule(std::shared_ptr<CallInvoker> jsInvoker)
    : NativeChessModuleCxxSpec(std::move(jsInvoker)) {
    engine = std::make_unique<ChessEngine>();
}

jsi::Array NativeChessModule::getBoard(jsi::Runtime &rt) {
    auto board = engine->getBoard();
    jsi::Array jsBoard(rt, board.size());
    for (size_t i = 0; i < board.size(); i++) {
        jsi::Array jsRow(rt, board[i].size());
        for (size_t j = 0; j < board[i].size(); j++)
            jsRow.setValueAtIndex(rt, j, jsi::String::createFromUtf8(rt, board[i][j]));
        jsBoard.setValueAtIndex(rt, i, jsRow);
    }
    return jsBoard;
}

void NativeChessModule::reset(jsi::Runtime &rt) { engine->reset(); }

jsi::Value NativeChessModule::makeMove(jsi::Runtime &rt, std::string move) {
    std::string result = engine->makeMove(move);
    auto Promise = rt.global().getPropertyAsFunction(rt, "Promise");
    auto executor = jsi::Function::createFromHostFunction(rt,
        jsi::PropNameID::forAscii(rt, "executor"), 2,
        [result](jsi::Runtime &rt2, const jsi::Value &, const jsi::Value *args, size_t) -> jsi::Value {
            args[0].asObject(rt2).asFunction(rt2).call(rt2, jsi::String::createFromUtf8(rt2, result));
            return jsi::Value::undefined();
        });
    return Promise.callAsConstructor(rt, executor);
}

jsi::Value NativeChessModule::isCheckmate(jsi::Runtime &rt, bool white) {
    bool result = engine->isCheckmate(white);
    auto Promise = rt.global().getPropertyAsFunction(rt, "Promise");
    auto executor = jsi::Function::createFromHostFunction(rt,
        jsi::PropNameID::forAscii(rt, "executor"), 2,
        [result](jsi::Runtime &rt2, const jsi::Value &, const jsi::Value *args, size_t) -> jsi::Value {
            args[0].asObject(rt2).asFunction(rt2).call(rt2, jsi::Value(result));
            return jsi::Value::undefined();
        });
    return Promise.callAsConstructor(rt, executor);
}

int         NativeChessModule::getWhiteTime(jsi::Runtime &rt) { return engine->getWhiteTime(); }
int         NativeChessModule::getBlackTime(jsi::Runtime &rt) { return engine->getBlackTime(); }
bool        NativeChessModule::tick(jsi::Runtime &rt, bool white) { return engine->tick(white); }
void        NativeChessModule::resetTimer(jsi::Runtime &rt) { engine->resetTimer(); }
std::string NativeChessModule::getTurn(jsi::Runtime &rt) { return engine->getTurn(); }

jsi::Array NativeChessModule::getValidMoves(jsi::Runtime &rt, std::string square) {
    auto moves = engine->getValidMoves(square);
    jsi::Array jsArray(rt, moves.size());
    for (size_t i = 0; i < moves.size(); i++)
        jsArray.setValueAtIndex(rt, i, jsi::String::createFromUtf8(rt, moves[i]));
    return jsArray;
}

jsi::Value NativeChessModule::getBestMove(jsi::Runtime &rt, bool white, int depth) {
    auto Promise    = rt.global().getPropertyAsFunction(rt, "Promise");
    auto *enginePtr = engine.get();
    auto invoker    = jsInvoker_;
    auto executor = jsi::Function::createFromHostFunction(rt,
        jsi::PropNameID::forAscii(rt, "executor"), 2,
        [enginePtr, invoker, white, depth](
            jsi::Runtime &rt2, const jsi::Value &, const jsi::Value *args, size_t) -> jsi::Value {
            auto resolveVal = std::make_shared<jsi::Value>(rt2, args[0]);
            auto result     = std::make_shared<std::string>();
            std::thread([enginePtr, invoker, white, depth, resolveVal, result]() mutable {
                *result = enginePtr->getBestMove(white, depth);
                invoker->invokeAsync([resolveVal, result](jsi::Runtime &rt3) {
                    resolveVal->asObject(rt3).asFunction(rt3)
                        .call(rt3, jsi::String::createFromUtf8(rt3, *result));
                });
            }).detach();
            return jsi::Value::undefined();
        });
    return Promise.callAsConstructor(rt, executor);
}

}

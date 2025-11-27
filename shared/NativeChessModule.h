            #pragma once

            #include <ChessSpecsJSI.h> 
            #include <memory>
            #include <string>
            #include <vector>
            #include "ChessEngine.h"

            namespace facebook::react {

            class NativeChessModule : public NativeChessModuleCxxSpec<NativeChessModule> {
            public:
              NativeChessModule(std::shared_ptr<CallInvoker> jsInvoker);

              void reset(jsi::Runtime &rt);
              bool makeMove(jsi::Runtime &rt, std::string move);
              std::string getTurn(jsi::Runtime &rt);
              jsi::Array getBoard(jsi::Runtime &rt);

            private:
              std::unique_ptr<ChessEngine> engine;
            };

            } // namespace facebook::react

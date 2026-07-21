# ♟️ React Native Chess

A chess application built with React Native's New Architecture (TurboModules) and a custom C++ chess engine. The C++ engine handles all game logic natively via JSI bindings, giving performance comparable to desktop engines on a mobile device.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React Native 0.85.3 |
| Language | TypeScript + C++17 |
| Bridge | TurboModule (JSI) |
| Gesture | react-native-gesture-handler |
| Animation | react-native-reanimated |
| Build (Android) | CMake + Gradle |
| Build (iOS) | CMake + Xcode |

---

## Features

- Custom C++ chess engine with alpha-beta search
- Iterative deepening with aspiration windows
- Transposition table (Zobrist hashing)
- Killer move and history heuristics
- Quiescence search
- Piece-square table evaluation
- Polyglot opening book support
- FEN import/export
- PGN import and move-by-move navigation
- Clock with per-side countdown
- Computer opponent (configurable depth)
- Two-player local mode

---

## Chess Engine

### Architecture

The engine lives in `shared/chess/` and is compiled as a C++ shared library loaded via TurboModule at app startup. All game state is owned by the C++ side; the JS layer only sends commands and reads results.

```
shared/chess/
├── Attacks.h          # Piece enums, bitboard helpers, ray masks
├── BoardState.h       # BoardSnapshot struct, Move, UndoRecord
├── MoveGen.cpp/.h     # Legal move generation, check detection
├── Evaluation.cpp/.h  # Static evaluation (material + PST)
├── Search.cpp/.h      # Alpha-beta, iterative deepening, TT
├── TranspositionTable.cpp/.h
├── OpeningBook.cpp/.h # Polyglot .bin probe
├── PolyKeys.h         # 781 Zobrist keys for Polyglot hashing
├── ChessEngine.cpp/.h # Public API used by TurboModule
└── Perft.cpp/.h       # Move generation correctness tests
```

### Board Representation

The board is a flat `uint8_t bd[64]` array indexed as `row * 8 + col`.

- Row 0 = rank 8 (black back rank), Row 7 = rank 1 (white back rank)
- Col 0 = file a, Col 7 = file h

Piece values are defined as an enum:

```cpp
enum Piece : uint8_t {
    EMPTY  = 0,
    W_PAWN = 1, W_KNIGHT, W_BISHOP, W_ROOK, W_QUEEN, W_KING,   // 1–6
    B_PAWN = 9, B_KNIGHT, B_BISHOP, B_ROOK, B_QUEEN, B_KING,   // 9–14
};
```

Bit 3 is the color flag: white pieces are 1–6 (bit 3 clear), black pieces are 9–14 (bit 3 set). `pieceType(p) = p & 7` strips the color. `pieceIsWhite(p) = p != EMPTY && !(p & 8)`.

### Move Generation

`generateAllMoves(snap, white)` returns all pseudo-legal moves for the side to move. Legality (king not left in check) is verified before each move is used in search or returned to the caller.

Sliding piece attacks use the **Hyperbola Quintessence** algorithm with precomputed ray masks for files, ranks, diagonals, and anti-diagonals. This avoids lookup tables while staying branchless.

Special moves handled:
- Castling (kingside and queenside, rights tracked per rook)
- En passant (target square stored as row/col in `BoardSnapshot`)
- Promotion (queen, rook, bishop, knight)

### Search

`Searcher::getBestMove(white, maxDepth)` runs **iterative deepening alpha-beta** with the following enhancements:

**Principal Variation Search (PVS)** — the first move at each node is searched with a full window; subsequent moves use a null window `[-alpha-1, -alpha]` and only re-search with the full window if they beat alpha.

**Transposition Table** — 1M entry Zobrist hash table stores the best move, score, depth, and bound type (EXACT / LOWER / UPPER) for each position. TT hits at sufficient depth return immediately.

**Move ordering** (in priority order):
1. TT best move from previous iteration
2. Captures ordered by MVV-LVA (Most Valuable Victim – Least Valuable Attacker)
3. En passant captures
4. Promotions
5. Killer moves (2 per ply)
6. History heuristic scores

**Quiescence search** — at depth 0 the search continues capturing moves only until the position is quiet, preventing the horizon effect. Stand-pat pruning exits early when the static evaluation already beats beta.

### Evaluation

`evaluate(snap)` returns a score in centipawns from the perspective of the side to move (positive = good for the mover).

```
score = Σ (material + PST bonus) for each white piece
      - Σ (material + PST bonus) for each black piece
```

Piece values:

| Piece  | Value |
|--------|-------|
| Pawn   | 100   |
| Knight | 320   |
| Bishop | 330   |
| Rook   | 500   |
| Queen  | 900   |
| King   | 20000 |

Each piece type has an 8×8 piece-square table (PST) that rewards good squares (e.g. knights in the centre, rooks on open files, king safety in the middlegame). Black PSTs are mirrored vertically from white.

### Opening Book

The engine loads a **Polyglot** format `.bin` book file (`performance.bin`) from Android assets on startup. Positions are hashed using 781 precomputed Zobrist keys matching the Polyglot standard. The known starting position hash `0x463b96181691fc9c` is verified at load time and logged.

Key correctness fix: the en passant file key is only XORed into the hash when an enemy pawn is actually adjacent and can capture — matching the Polyglot spec. Simply having a double-pawn push does not trigger the en passant key.

A weighted-random move is chosen from all book candidates proportional to their weights.

### FEN / PGN

**FEN** — `getFEN()` serialises the current position to standard FEN. `loadFEN(fen)` parses piece placement, side to move, castling rights, en passant square, and move number.

**PGN** — `loadPGN(pgn)` strips header tags and comments, then converts each SAN token to UCI using `sanToUci()`. SAN resolution generates all legal moves and pattern-matches piece type, destination square, and disambiguation prefix. Supported: normal moves, captures (`x`), castling (`O-O`, `O-O-O`), promotions (`e8=Q`), check/checkmate suffixes.

**Move navigation** — `goToMove(index)` replays the stored UCI move list from the starting position up to `index`, preserving the full list so forward navigation works without reloading.

### TurboModule API

All engine calls go through `NativeChessModule` which implements `NativeChessModuleCxxSpec` (generated from `specs/NativeChessModule.ts` by React Native Codegen).

| Method | Description |
|--------|-------------|
| `getBoard()` | Returns current board as `string[][]` |
| `makeMove(uci)` | Applies a move, returns `"valid"` / `"check"` / `"checkmate"` / `"invalid"` |
| `getTurn()` | Returns `"white"` or `"black"` |
| `getValidMoves(square)` | Returns legal destination squares for a piece |
| `getBestMove(white, depth)` | Async — runs search on a detached thread |
| `getFEN()` | Returns FEN string of current position |
| `loadFEN(fen)` | Loads position from FEN, returns success |
| `getPGN()` | Returns PGN of recorded moves |
| `loadPGN(pgn)` | Parses and replays a PGN game |
| `goToMove(index)` | Jumps board to position after move at index |
| `reset()` | Resets to starting position |
| `tick(white)` | Decrements clock for given side, returns `false` on timeout |

---

## Project Structure

```
chess/
├── shared/
│   ├── chess/          # C++ engine source
│   ├── NativeChessModule.h/.cpp   # TurboModule implementation
│   └── NativeChessModule.h
├── specs/
│   └── NativeChessModule.ts       # Codegen spec (TS interface)
├── screen/
│   ├── board/          # Main game screen
│   ├── Home/           # Mode selection
│   ├── clock/          # Per-side countdown display
│   ├── pieces/         # Piece rendering
│   ├── MoveHighlights/ # Legal move overlays
│   └── Background/     # Board grid
├── context/            # Selection state (selected square, highlights)
├── helper/             # Enums (PIECE_COLOR, CHECK_STATUS)
├── interface/          # TypeScript prop interfaces
└── android/
    └── app/src/main/
        ├── java/com/android/chess/   # MainActivity, MainApplication
        └── jni/OnLoad.cpp            # JNI asset manager init
```

---

## Setup

```bash
# Install JS dependencies
npm install

# Android
cd android && ./gradlew clean && cd ..
npx react-native run-android

# iOS
cd ios && bundle exec pod install && cd ..
npx react-native run-ios
```

Requires Node ≥ 22.11.0, JDK 17+, Android NDK r26+, CMake 3.22+.

---

## Adding a PGN Game

Tap the **⊞** button in the header during a game. Paste a standard PGN (with or without headers). The engine parses SAN moves, replays the game, and shows the move list in the horizontal strip. Tap any move token to jump directly to that position.

---

## TurboModule Integration Guide

This section explains how the C++ chess engine is wired into React Native from scratch, so you can adapt the same pattern for any native C++ module.

### How TurboModules Work

A TurboModule is a native module that communicates with JavaScript through JSI (JavaScript Interface) — direct C++ function calls with no JSON serialization overhead. The flow is:

```
TypeScript (specs/NativeChessModule.ts)
        ↓  React Native Codegen
C++ spec base class (NativeChessModuleCxxSpec)
        ↓  your implementation
NativeChessModule.cpp  →  ChessEngine.cpp
```

### Step 1 — Write the TypeScript Spec

Create `specs/NativeChessModule.ts`. This is the single source of truth. Codegen reads it and generates the C++ abstract base class.

```ts
import { TurboModule, TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Synchronous methods return values directly
  getBoard(): string[][];
  getTurn(): string;
  reset(): void;
  getValidMoves(square: string): string[];
  getFEN(): string;
  loadFEN(fen: string): boolean;
  getPGN(): string;
  loadPGN(pgn: string): boolean;
  goToMove(index: number): boolean;
  resetTimer(): void;
  getWhiteTime(): number;
  getBlackTime(): number;
  tick(white: boolean): boolean;

  // Async methods return Promise — use for heavy work (search)
  makeMove(move: string): Promise<string>;
  isCheckmate(white: boolean): Promise<boolean>;
  getBestMove(white: boolean, depth: number): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeChessModule');
```

Rules for the spec:
- Only primitive types and arrays thereof are supported (`string`, `number`, `boolean`, `string[]`, `string[][]`)
- Methods that do heavy work must return `Promise<T>` so they don't block the JS thread
- The string passed to `getEnforcing` must match the name registered on the C++ side

### Step 2 — Configure Codegen

In `package.json`, tell Codegen where to find the spec and what Java package to use:

```json
"codegenConfig": {
  "name": "ChessSpecs",
  "type": "modules",
  "jsSrcsDir": "specs",
  "android": {
    "javaPackageName": "com.android.chess"
  }
}
```

Codegen runs automatically during the Gradle build and generates `ChessSpecsJSI.h` in your build directory. You never edit this file.

### Step 3 — Write the C++ Implementation

**Header** (`shared/NativeChessModule.h`):

```cpp
#pragma once
#include <ChessSpecsJSI.h>           // generated by Codegen
#include <ReactCommon/TurboModule.h>
#include <react/bridging/Bridging.h>
#include <memory>
#include "chess/ChessEngine.h"

namespace facebook::react {

class NativeChessModule
    : public NativeChessModuleCxxSpec<NativeChessModule> {
public:
    NativeChessModule(std::shared_ptr<CallInvoker> jsInvoker);

    // One method per entry in the TS spec, prefixed with jsi::Runtime &rt
    jsi::Array  getBoard(jsi::Runtime &rt);
    std::string getTurn(jsi::Runtime &rt);
    void        reset(jsi::Runtime &rt);
    // ... all other methods

private:
    std::unique_ptr<ChessEngine> engine;
};

} // namespace facebook::react
```

The class must inherit from `NativeChessModuleCxxSpec<YourClass>` (CRTP). Every method in the TS spec maps to a C++ method with an extra `jsi::Runtime &rt` first parameter.

**Implementation** (`shared/NativeChessModule.cpp`):

```cpp
#include "NativeChessModule.h"
#include <thread>

namespace facebook::react {

NativeChessModule::NativeChessModule(
    std::shared_ptr<CallInvoker> jsInvoker)
    : NativeChessModuleCxxSpec(std::move(jsInvoker)) {
    engine = std::make_unique<ChessEngine>();
}

// Synchronous — return value directly
std::string NativeChessModule::getTurn(jsi::Runtime &) {
    return engine->getTurn();
}

// Returning an array — must build jsi::Array
jsi::Array NativeChessModule::getBoard(jsi::Runtime &rt) {
    auto board = engine->getBoard();          // vector<vector<string>>
    jsi::Array jsBoard(rt, board.size());
    for (size_t i = 0; i < board.size(); i++) {
        jsi::Array row(rt, board[i].size());
        for (size_t j = 0; j < board[i].size(); j++)
            row.setValueAtIndex(rt, j,
                jsi::String::createFromUtf8(rt, board[i][j]));
        jsBoard.setValueAtIndex(rt, i, row);
    }
    return jsBoard;
}

// Async — wrap result in a Promise resolved on the calling thread
jsi::Value NativeChessModule::makeMove(
    jsi::Runtime &rt, std::string move) {
    std::string result = engine->makeMove(move);
    auto Promise = rt.global().getPropertyAsFunction(rt, "Promise");
    auto executor = jsi::Function::createFromHostFunction(rt,
        jsi::PropNameID::forAscii(rt, "executor"), 2,
        [result](jsi::Runtime &rt2, const jsi::Value &,
                 const jsi::Value *args, size_t) -> jsi::Value {
            args[0].asObject(rt2).asFunction(rt2)
                .call(rt2, jsi::String::createFromUtf8(rt2, result));
            return jsi::Value::undefined();
        });
    return Promise.callAsConstructor(rt, executor);
}

// Async on a background thread — use jsInvoker_ to return to JS thread
jsi::Value NativeChessModule::getBestMove(
    jsi::Runtime &rt, bool white, int depth) {
    auto Promise    = rt.global().getPropertyAsFunction(rt, "Promise");
    auto *enginePtr = engine.get();
    auto invoker    = jsInvoker_;
    auto executor = jsi::Function::createFromHostFunction(rt,
        jsi::PropNameID::forAscii(rt, "executor"), 2,
        [enginePtr, invoker, white, depth](
            jsi::Runtime &rt2, const jsi::Value &,
            const jsi::Value *args, size_t) -> jsi::Value {
            auto resolve = std::make_shared<jsi::Value>(rt2, args[0]);
            auto result  = std::make_shared<std::string>();
            std::thread([enginePtr, invoker, white, depth,
                         resolve, result]() mutable {
                *result = enginePtr->getBestMove(white, depth);
                invoker->invokeAsync([resolve, result](jsi::Runtime &rt3) {
                    resolve->asObject(rt3).asFunction(rt3)
                        .call(rt3,
                            jsi::String::createFromUtf8(rt3, *result));
                });
            }).detach();
            return jsi::Value::undefined();
        });
    return Promise.callAsConstructor(rt, executor);
}

} // namespace facebook::react
```

Key points:
- Synchronous calls resolve immediately and return JSI values directly
- For background work, spin a `std::thread` and use `jsInvoker_->invokeAsync` to marshal the result back to the JS thread safely
- Never touch a `jsi::Runtime` from a background thread — only call into it via `invokeAsync`

### Step 4 — Register the Module (Android)

**`OnLoad.cpp`** (`android/app/src/main/jni/`):

```cpp
#include <fbjni/fbjni.h>
#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include "NativeChessModule.h"
#include <android/asset_manager_jni.h>

// Called once when the .so is loaded
extern "C" void setAssetManager(AAssetManager *mgr);

extern "C" JNIEXPORT void JNICALL
Java_com_android_chess_MainActivity_initAssetManager(
    JNIEnv *env, jobject, jobject assetManager) {
    AAssetManager *mgr = AAssetManager_fromJava(env, assetManager);
    setAssetManager(mgr);
}

// Register your TurboModule with the RN runtime
JSI_EXPORT
std::shared_ptr<facebook::react::TurboModule>
cxxModuleProvider(
    const std::string &name,
    const std::shared_ptr<facebook::react::CallInvoker> &jsInvoker) {
    if (name == "NativeChessModule")
        return std::make_shared<facebook::react::NativeChessModule>(jsInvoker);
    return nullptr;
}
```

The JNI function name must match your package: `Java_<package_underscored>_MainActivity_initAssetManager`.

**`MainActivity.kt`** — call `initAssetManager` on create so the C++ engine can open asset files:

```kotlin
package com.android.chess

import android.content.res.AssetManager
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
    external fun initAssetManager(assetManager: AssetManager)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        initAssetManager(assets)
    }

    override fun getMainComponentName(): String = "chess"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
```

### Step 5 — CMake

Add your shared sources to `android/app/src/main/jni/CMakeLists.txt`:

```cmake
cmake_minimum_required(VERSION 3.22)
project(chess)

# C++17 required
set(CMAKE_CXX_STANDARD 17)

# All engine sources
file(GLOB ENGINE_SOURCES
    "${CMAKE_SOURCE_DIR}/../../../../../shared/chess/*.cpp"
    "${CMAKE_SOURCE_DIR}/../../../../../shared/*.cpp"
)

add_library(chess SHARED
    OnLoad.cpp
    ${ENGINE_SOURCES}
)

target_include_directories(chess PRIVATE
    ${CMAKE_SOURCE_DIR}/../../../../../shared
    ${CMAKE_SOURCE_DIR}/../../../../../shared/chess
)

find_library(log-lib log)
find_library(android-lib android)

target_link_libraries(chess
    ${log-lib}
    ${android-lib}
    ReactAndroid::jsi
    ReactAndroid::reactnativejni
    fbjni::fbjni
)
```

### Step 6 — Use in TypeScript

Import the module and call it directly — no wrapping needed:

```ts
import NativeChessModule from '../specs/NativeChessModule';

// Synchronous
const board: string[][] = NativeChessModule.getBoard();
const turn: string      = NativeChessModule.getTurn();
const moves: string[]   = NativeChessModule.getValidMoves('e2');

// Returns boolean
const loaded = NativeChessModule.loadFEN(
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
);

// Async — must await or .then()
const result = await NativeChessModule.makeMove('e2e4');
// result: "valid" | "check" | "checkmate" | "invalid"

const best = await NativeChessModule.getBestMove(true, 4);
await NativeChessModule.makeMove(best);

// PGN round-trip
NativeChessModule.loadPGN('1.e4 e5 2.Nf3 Nc6 3.Bb5 *');
const pgn = NativeChessModule.getPGN();

// Jump to move 10 (0-indexed)
NativeChessModule.goToMove(9);
const boardAtMove10 = NativeChessModule.getBoard();
```

### Troubleshooting

**`UnsatisfiedLinkError: No implementation found for initAssetManager`**  
The JNI function name in `OnLoad.cpp` doesn't match the Java package. The name must be `Java_<package_with_underscores>_MainActivity_initAssetManager`. If your package is `com.android.chess` the function must be `Java_com_android_chess_MainActivity_initAssetManager`.

**`TurboModuleRegistry.getEnforcing` throws at runtime**  
The string in `getEnforcing('NativeChessModule')` must exactly match the name returned by `cxxModuleProvider`. Check capitalisation.

**Module loads but methods return wrong values**  
Codegen regenerates `ChessSpecsJSI.h` on every build. If you add or rename a method in the TS spec, clean the build (`./gradlew clean`) before rebuilding so the generated header is refreshed.

**Crash on background thread accessing `jsi::Runtime`**  
Never call any JSI method (`rt.global()`, `jsi::String::createFromUtf8`, etc.) from a `std::thread`. Use `jsInvoker_->invokeAsync` to hop back to the JS thread first.

♟️ React Native Chess – Powered by C++ Engine (TurboModule)

A high-performance cross-platform chess application built using React Native New Architecture (TurboModules) and a custom C++ chess engine. The project combines modern mobile UI with native-level computation, enabling fast move generation and real-time gameplay similar to Chess.com or Lichess.

🚀 Features

🔥 TurboModule Integration – Connects React Native JS with C++ engine via optimized JSI bindings.

⚙️ Native Chess Engine in C++ – Custom move generation, board logic, and turn handling.

📱 Cross-platform (Android & iOS) – Runs efficiently on both platforms.

🧠 Supports UCI-style move input ("e2e4" format).

♟️ Real-time piece movement and state updates.

🏎️ Ultra-fast performance compared to JavaScript-only logic.

🔧 Technical Stack
Layer	Technology
UI	React Native
State	TypeScript / React
Native Logic	C++
Bridge	TurboModule (JSI)
Build	CMake, Gradle (Android), Xcode (iOS)
📦 How It Works

The JS side sends a move using TurboModule:

ChessModule.makeMove("e2e4");


The TurboModule routes the request to the C++ engine.

C++ validates the move, updates board state, and returns the result.

UI updates instantly using React state.

🛠️ Setup & Installation
# Install dependencies
 npm install

# Enable New Architecture (Android)
cd android && ./gradlew clean

# Run application
npx react-native run-android
npx react-native run-ios

#include "ChessEngine.h"
#include "MoveGen.h"
#include "OpeningBook.h"
#include "Perft.h"
#include "Search.h"
#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <thread>
#include <atomic>
#include <mutex>

static std::atomic<bool> perftDone{false};
static std::mutex engineMutex;

ChessEngine::ChessEngine() {
    whiteSeconds = DEFAULT_TIME;
    blackSeconds = DEFAULT_TIME;
    reset();

    std::thread([]() {
        openingBookLoad("performance.bin");

        BoardSnapshot tmp;
        tmp.board = {
            {"r","n","b","q","k","b","n","r"},
            {"p","p","p","p","p","p","p","p"},
            {"","","","","","","",""},
            {"","","","","","","",""},
            {"","","","","","","",""},
            {"","","","","","","",""},
            {"P","P","P","P","P","P","P","P"},
            {"R","N","B","Q","K","B","N","R"},
        };
        tmp.whiteTurn       = true;
        tmp.whiteKingMoved  = tmp.blackKingMoved  = false;
        tmp.whiteRookAMoved = tmp.whiteRookHMoved = false;
        tmp.blackRookAMoved = tmp.blackRookHMoved = false;
        tmp.enPassantX      = tmp.enPassantY      = -1;
        tmp.syncFromString();
        perftSuite(tmp);
        perftDone = true;
    }).detach();
}

void ChessEngine::reset() {
    std::lock_guard<std::mutex> lock(engineMutex);
    snap.board = {
        {"r","n","b","q","k","b","n","r"},
        {"p","p","p","p","p","p","p","p"},
        {"","","","","","","",""},
        {"","","","","","","",""},
        {"","","","","","","",""},
        {"","","","","","","",""},
        {"P","P","P","P","P","P","P","P"},
        {"R","N","B","Q","K","B","N","R"},
    };
    snap.whiteTurn       = true;
    snap.whiteKingMoved  = snap.blackKingMoved  = false;
    snap.whiteRookAMoved = snap.whiteRookHMoved = false;
    snap.blackRookAMoved = snap.blackRookHMoved = false;
    snap.enPassantX      = snap.enPassantY      = -1;
    snap.syncFromString();
    pgnMoves.clear();
    fullMoveNumber = 1;
    resetTimer();
}

void ChessEngine::resetTimer() {
    whiteSeconds = DEFAULT_TIME;
    blackSeconds = DEFAULT_TIME;
}

int  ChessEngine::getWhiteTime() const { return whiteSeconds; }
int  ChessEngine::getBlackTime() const { return blackSeconds; }

bool ChessEngine::tick(bool white, int seconds) {
    if (white) { whiteSeconds = std::max(0, whiteSeconds - seconds); return whiteSeconds > 0; }
    blackSeconds = std::max(0, blackSeconds - seconds);
    return blackSeconds > 0;
}

std::vector<std::vector<std::string>> ChessEngine::getBoard() const { return snap.board; }
std::string ChessEngine::getTurn() const { return snap.whiteTurn ? "white" : "black"; }
bool ChessEngine::isInCheck(bool white) const { return ::isInCheck(snap, white); }

bool ChessEngine::isCheckmate(bool white) {
    if (!isInCheck(white)) return false;
    for (const auto &m : generateAllMoves(snap, white)) {
        BoardSnapshot saved = snap;
        uint8_t *s    = snap.bd;
        uint8_t piece = s[sq(m.fromX, m.fromY)];
        bool    isW   = pieceIsWhite(piece);
        uint8_t tp    = pieceType(piece);
        bool isCastle = (tp == 6 && std::abs(m.toY - m.fromY) == 2);
        bool isEP     = (tp == 1 && std::abs(m.toY - m.fromY) == 1 &&
                         s[sq(m.toX, m.toY)] == EMPTY &&
                         m.toX == snap.enPassantX && m.toY == snap.enPassantY);
        if (isCastle) {
            s[sq(m.toX, m.toY)]    = piece;
            s[sq(m.fromX, m.fromY)] = EMPTY;
            bool ks = (m.toY == 6);
            int rf = ks ? 7 : 0, rt = ks ? 5 : 3;
            s[sq(m.toX, rt)] = s[sq(m.toX, rf)];
            s[sq(m.toX, rf)] = EMPTY;
        } else {
            s[sq(m.toX, m.toY)]    = piece;
            s[sq(m.fromX, m.fromY)] = EMPTY;
            if (isEP) s[sq(m.fromX, m.toY)] = EMPTY;
            if (m.promotion != '\0') {
                uint8_t pp;
                switch (m.promotion) {
                    case 'q': pp = isW ? W_QUEEN  : B_QUEEN;  break;
                    case 'r': pp = isW ? W_ROOK   : B_ROOK;   break;
                    case 'b': pp = isW ? W_BISHOP : B_BISHOP; break;
                    default:  pp = isW ? W_KNIGHT : B_KNIGHT; break;
                }
                s[sq(m.toX, m.toY)] = pp;
            }
        }
        snap.syncOccupancy();
        bool stillCheck = ::isInCheck(snap, white);
        snap = saved;
        if (!stillCheck) return false;
    }
    return true;
}

std::string ChessEngine::makeMove(const std::string &move) {
    if (move.length() != 4 && move.length() != 5) return "invalid";

    int fromX = 8 - (move[1] - '0'), fromY = move[0] - 'a';
    int toX   = 8 - (move[3] - '0'), toY   = move[2] - 'a';

    if (fromX < 0 || fromX > 7 || fromY < 0 || fromY > 7 ||
        toX   < 0 || toX   > 7 || toY   < 0 || toY   > 7)
        return "invalid";

    uint8_t piece = snap.bd[sq(fromX, fromY)];
    if (piece == EMPTY) return "invalid";

    bool isW = pieceIsWhite(piece);
    if (snap.whiteTurn != isW) return "invalid";

    uint8_t tp           = pieceType(piece);
    bool    isPawn       = (tp == 1);
    int     promoRow     = isW ? 0 : 7;
    bool    reachesPromo = isPawn && toX == promoRow;
    char    promoPiece   = 'q';

    if (reachesPromo) {
        if (move.length() != 5) return "invalid";
        char raw = (char)tolower(move[4]);
        if (raw != 'q' && raw != 'r' && raw != 'b' && raw != 'n') return "invalid";
        promoPiece = raw;
    } else {
        if (move.length() == 5) return "invalid";
    }

    auto legal = generateAllMoves(snap, isW);
    bool found = false;
    for (const auto &m : legal) {
        if (m.fromX == fromX && m.fromY == fromY && m.toX == toX && m.toY == toY) {
            char mp = m.promotion;
            char rp = reachesPromo ? promoPiece : '\0';
            if (mp == rp || (reachesPromo && mp == '\0')) { found = true; break; }
        }
    }
    if (!found) return "invalid";

    BoardSnapshot saved = snap;
    uint8_t *s    = snap.bd;
    bool isCastle = (tp == 6 && std::abs(toY - fromY) == 2 && fromX == toX);
    bool isEP     = (isPawn && std::abs(toY - fromY) == 1 &&
                     s[sq(toX, toY)] == EMPTY &&
                     toX == snap.enPassantX && toY == snap.enPassantY);

    if (isCastle) {
        s[sq(toX, toY)]    = piece;
        s[sq(fromX, fromY)] = EMPTY;
        bool ks = (toY == 6);
        int rf = ks ? 7 : 0, rt = ks ? 5 : 3;
        s[sq(toX, rt)] = s[sq(toX, rf)];
        s[sq(toX, rf)] = EMPTY;
    } else {
        s[sq(toX, toY)]    = piece;
        s[sq(fromX, fromY)] = EMPTY;
        if (isEP) s[sq(fromX, toY)] = EMPTY;
        if (reachesPromo) {
            uint8_t pp;
            switch (promoPiece) {
                case 'q': pp = isW ? W_QUEEN  : B_QUEEN;  break;
                case 'r': pp = isW ? W_ROOK   : B_ROOK;   break;
                case 'b': pp = isW ? W_BISHOP : B_BISHOP; break;
                default:  pp = isW ? W_KNIGHT : B_KNIGHT; break;
            }
            s[sq(toX, toY)] = pp;
        }
    }

    snap.enPassantX = snap.enPassantY = -1;
    if (piece == W_KING) snap.whiteKingMoved  = true;
    if (piece == B_KING) snap.blackKingMoved  = true;
    if (fromX == 7 && fromY == 0) snap.whiteRookAMoved = true;
    if (fromX == 7 && fromY == 7) snap.whiteRookHMoved = true;
    if (fromX == 0 && fromY == 0) snap.blackRookAMoved = true;
    if (fromX == 0 && fromY == 7) snap.blackRookHMoved = true;
    if (isPawn && std::abs(toX - fromX) == 2) {
        snap.enPassantX = (fromX + toX) / 2;
        snap.enPassantY = fromY;
    }

    snap.syncOccupancy();
    if (::isInCheck(snap, isW)) { snap = saved; return "false"; }

    snap.whiteTurn = !snap.whiteTurn;
    snap.syncToString();

    bool wasWhite = isW;
    if (wasWhite) {
        std::string san = std::string(1, (char)('a' + fromY)) + std::string(1, (char)('0' + (8 - toX)));
        recordMove(move, san);
    } else {
        std::string san = std::string(1, (char)('a' + fromY)) + std::string(1, (char)('0' + (8 - toX)));
        recordMove(move, san);
        fullMoveNumber++;
    }

    if (::isInCheck(snap, !isW))
        return isCheckmate(!isW) ? "checkmate" : "check";

    return "valid";
}

std::vector<std::string> ChessEngine::getValidMoves(const std::string &square) {
    std::vector<std::string> result;
    if (square.length() != 2) return result;

    int fromY = square[0] - 'a';
    int fromX = 8 - (square[1] - '0');
    if (fromX < 0 || fromX > 7 || fromY < 0 || fromY > 7) return result;

    uint8_t piece = snap.bd[sq(fromX, fromY)];
    if (piece == EMPTY) return result;
    bool isW = pieceIsWhite(piece);
    if (snap.whiteTurn != isW) return result;

    auto squareName = [](int x, int y) -> std::string {
        return std::string(1, (char)('a' + y)) + std::string(1, (char)('0' + (8 - x)));
    };

    for (const auto &m : generateAllMoves(snap, isW)) {
        if (m.fromX != fromX || m.fromY != fromY) continue;

        BoardSnapshot saved = snap;
        uint8_t *s    = snap.bd;
        uint8_t  tp   = pieceType(piece);
        bool isCastle = (tp == 6 && std::abs(m.toY - m.fromY) == 2);
        bool isEP     = (tp == 1 && std::abs(m.toY - m.fromY) == 1 &&
                         s[sq(m.toX, m.toY)] == EMPTY &&
                         m.toX == snap.enPassantX && m.toY == snap.enPassantY);

        if (isCastle) {
            s[sq(m.toX, m.toY)]    = piece;
            s[sq(m.fromX, m.fromY)] = EMPTY;
            bool ks = (m.toY == 6);
            int rf = ks ? 7 : 0, rt = ks ? 5 : 3;
            s[sq(m.toX, rt)] = s[sq(m.toX, rf)];
            s[sq(m.toX, rf)] = EMPTY;
        } else {
            s[sq(m.toX, m.toY)]    = piece;
            s[sq(m.fromX, m.fromY)] = EMPTY;
            if (isEP) s[sq(m.fromX, m.toY)] = EMPTY;
            if (m.promotion != '\0')
                s[sq(m.toX, m.toY)] = isW ? W_QUEEN : B_QUEEN;
        }
        snap.syncOccupancy();

        bool inCheck = ::isInCheck(snap, isW);
        snap = saved;

        if (!inCheck) {
            bool isPromoSq = (tp == 1) && (m.toX == (isW ? 0 : 7));
            std::string entry = squareName(m.toX, m.toY) + (isPromoSq ? "=" : "");
            bool dup = false;
            for (const auto &r : result) if (r == entry) { dup = true; break; }
            if (!dup) result.push_back(entry);
        }
    }
    return result;
}

std::string ChessEngine::getBestMove(bool white, int depth) {
    std::lock_guard<std::mutex> lock(engineMutex);
    std::string bookMove = openingBookProbe(snap);
    if (!bookMove.empty()) return bookMove;
    Searcher searcher(snap);
    return searcher.getBestMove(white, depth);
}

void ChessEngine::recordMove(const std::string &uci, const std::string &) {
    pgnMoves.push_back(uci);
}

std::string ChessEngine::getFEN() const {
    std::string fen;

    static const char pieceChar[15] = {
        '\0', 'P', 'N', 'B', 'R', 'Q', 'K', '\0',
        '\0', 'p', 'n', 'b', 'r', 'q', 'k'
    };

    for (int row = 0; row < 8; row++) {
        int empty = 0;
        for (int col = 0; col < 8; col++) {
            uint8_t p = snap.bd[sq(row, col)];
            if (p == EMPTY) {
                empty++;
            } else {
                if (empty > 0) { fen += (char)('0' + empty); empty = 0; }
                fen += pieceChar[p];
            }
        }
        if (empty > 0) fen += (char)('0' + empty);
        if (row < 7) fen += '/';
    }

    fen += snap.whiteTurn ? " w " : " b ";

    std::string castling;
    if (!snap.whiteKingMoved && !snap.whiteRookHMoved) castling += 'K';
    if (!snap.whiteKingMoved && !snap.whiteRookAMoved) castling += 'Q';
    if (!snap.blackKingMoved && !snap.blackRookHMoved) castling += 'k';
    if (!snap.blackKingMoved && !snap.blackRookAMoved) castling += 'q';
    fen += castling.empty() ? "-" : castling;

    fen += ' ';
    if (snap.enPassantY >= 0 && snap.enPassantY < 8 && snap.enPassantX >= 0) {
        fen += (char)('a' + snap.enPassantY);
        fen += (char)('0' + (8 - snap.enPassantX));
    } else {
        fen += '-';
    }

    fen += " 0 " + std::to_string(fullMoveNumber);
    return fen;
}

bool ChessEngine::loadFEN(const std::string &fen) {
    std::lock_guard<std::mutex> lock(engineMutex);

    BoardSnapshot next;
    next.board.assign(8, std::vector<std::string>(8, ""));
    next.whiteKingMoved = next.blackKingMoved = false;
    next.whiteRookAMoved = next.whiteRookHMoved = false;
    next.blackRookAMoved = next.blackRookHMoved = false;
    next.enPassantX = next.enPassantY = -1;

    size_t pos = 0;

    int row = 0, col = 0;
    while (pos < fen.size() && fen[pos] != ' ') {
        char c = fen[pos++];
        if (c == '/') { row++; col = 0; continue; }
        if (c >= '1' && c <= '8') { col += (c - '0'); continue; }
        if (row > 7 || col > 7) return false;
        std::string cell(1, c);
        next.board[row][col] = cell;
        col++;
    }
    if (row != 7) return false;

    if (pos >= fen.size()) return false;
    pos++;
    if (pos >= fen.size()) return false;
    next.whiteTurn = (fen[pos] == 'w');
    pos++;

    if (pos >= fen.size() || fen[pos] != ' ') return false;
    pos++;

    bool wk = false, wq = false, bk = false, bq = false;
    while (pos < fen.size() && fen[pos] != ' ') {
        switch (fen[pos++]) {
            case 'K': wk = true; break;
            case 'Q': wq = true; break;
            case 'k': bk = true; break;
            case 'q': bq = true; break;
        }
    }
    next.whiteKingMoved  = !(wk || wq);
    next.whiteRookHMoved = !wk;
    next.whiteRookAMoved = !wq;
    next.blackKingMoved  = !(bk || bq);
    next.blackRookHMoved = !bk;
    next.blackRookAMoved = !bq;

    if (pos < fen.size()) pos++;
    if (pos < fen.size() && fen[pos] != '-') {
        int epCol = fen[pos] - 'a';
        int epRank = (pos + 1 < fen.size()) ? (fen[pos + 1] - '0') : -1;
        next.enPassantY = epCol;
        next.enPassantX = (epRank >= 1 && epRank <= 8) ? (8 - epRank) : -1;
        pos += 2;
    } else if (pos < fen.size()) {
        pos++;
    }

    while (pos < fen.size() && fen[pos] == ' ') pos++;
    while (pos < fen.size() && fen[pos] != ' ') pos++;
    while (pos < fen.size() && fen[pos] == ' ') pos++;
    fullMoveNumber = 1;
    if (pos < fen.size()) {
        fullMoveNumber = 0;
        while (pos < fen.size() && fen[pos] >= '0' && fen[pos] <= '9')
            fullMoveNumber = fullMoveNumber * 10 + (fen[pos++] - '0');
        if (fullMoveNumber < 1) fullMoveNumber = 1;
    }

    next.syncFromString();
    snap = next;
    pgnMoves.clear();
    return true;
}

std::string ChessEngine::getPGN() const {
    std::string pgn = "[Event \"Chess Game\"]\n[Site \"Chess App\"]\n[White \"White\"]\n[Black \"Black\"]\n\n";

    for (size_t i = 0; i < pgnMoves.size(); i++) {
        if (i % 2 == 0)
            pgn += std::to_string(i / 2 + 1) + ". ";
        pgn += pgnMoves[i] + " ";
    }

    if (!pgnMoves.empty()) pgn += "*";
    return pgn;
}

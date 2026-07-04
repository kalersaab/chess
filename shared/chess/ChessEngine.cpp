#include "ChessEngine.h"
#include "MoveGen.h"
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
    Searcher searcher(snap);
    return searcher.getBestMove(white, depth);
}

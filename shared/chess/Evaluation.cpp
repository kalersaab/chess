#include "Evaluation.h"
#include "Evaluation.h"
#include <cctype>
#include <algorithm>

static const int PST_PAWN[8][8] = {
    {  0,  0,  0,  0,  0,  0,  0,  0 },
    { 50, 50, 50, 50, 50, 50, 50, 50 },
    { 10, 10, 20, 30, 30, 20, 10, 10 },
    {  5,  5, 10, 27, 27, 10,  5,  5 },
    {  0,  0,  5, 25, 25,  5,  0,  0 },
    {  5, -5,-10,  0,  0,-10, -5,  5 },
    {  5, 10, 10,-20,-20, 10, 10,  5 },
    {  0,  0,  0,  0,  0,  0,  0,  0 },
};
static const int PST_KNIGHT[8][8] = {
    {-50,-40,-30,-30,-30,-30,-40,-50 },
    {-40,-20,  0,  0,  0,  0,-20,-40 },
    {-30,  0, 10, 15, 15, 10,  0,-30 },
    {-30,  5, 15, 20, 20, 15,  5,-30 },
    {-30,  0, 15, 20, 20, 15,  0,-30 },
    {-30,  5, 10, 15, 15, 10,  5,-30 },
    {-40,-20,  0,  5,  5,  0,-20,-40 },
    {-50,-40,-30,-30,-30,-30,-40,-50 },
};
static const int PST_BISHOP[8][8] = {
    {-20,-10,-10,-10,-10,-10,-10,-20 },
    {-10,  0,  0,  0,  0,  0,  0,-10 },
    {-10,  0,  5, 10, 10,  5,  0,-10 },
    {-10,  5,  5, 10, 10,  5,  5,-10 },
    {-10,  0, 10, 10, 10, 10,  0,-10 },
    {-10, 10, 10, 10, 10, 10, 10,-10 },
    {-10,  5,  0,  0,  0,  0,  5,-10 },
    {-20,-10,-10,-10,-10,-10,-10,-20 },
};
static const int PST_ROOK[8][8] = {
    {  0,  0,  0,  0,  0,  0,  0,  0 },
    {  5, 10, 10, 10, 10, 10, 10,  5 },
    { -5,  0,  0,  0,  0,  0,  0, -5 },
    { -5,  0,  0,  0,  0,  0,  0, -5 },
    { -5,  0,  0,  0,  0,  0,  0, -5 },
    { -5,  0,  0,  0,  0,  0,  0, -5 },
    { -5,  0,  0,  0,  0,  0,  0, -5 },
    {  0,  0,  0,  5,  5,  0,  0,  0 },
};
static const int PST_QUEEN[8][8] = {
    {-20,-10,-10, -5, -5,-10,-10,-20 },
    {-10,  0,  0,  0,  0,  0,  0,-10 },
    {-10,  0,  5,  5,  5,  5,  0,-10 },
    { -5,  0,  5,  5,  5,  5,  0, -5 },
    {  0,  0,  5,  5,  5,  5,  0, -5 },
    {-10,  5,  5,  5,  5,  5,  0,-10 },
    {-10,  0,  5,  0,  0,  0,  0,-10 },
    {-20,-10,-10, -5, -5,-10,-10,-20 },
};
static const int PST_KING_MG[8][8] = {
    {-30,-40,-40,-50,-50,-40,-40,-30 },
    {-30,-40,-40,-50,-50,-40,-40,-30 },
    {-30,-40,-40,-50,-50,-40,-40,-30 },
    {-30,-40,-40,-50,-50,-40,-40,-30 },
    {-20,-30,-30,-40,-40,-30,-30,-20 },
    {-10,-20,-20,-20,-20,-20,-20,-10 },
    { 20, 20,  0,  0,  0,  0, 20, 20 },
    { 20, 30, 10,  0,  0, 10, 30, 20 },
};

static const int PST_KING_EG[8][8] = {
    {-50,-40,-30,-20,-20,-30,-40,-50 },
    {-40,-30,-20,-10,-10,-20,-30,-40 },
    {-30,-20,-10,  0,  0,-10,-20,-30 },
    {-20,-10,  0, 10, 10,  0,-10,-20 },
    {-20,-10,  0, 10, 10,  0,-10,-20 },
    {-30,-20,-10,  0,  0,-10,-20,-30 },
    {-40,-30,-20,-10,-10,-20,-30,-40 },
    {-50,-40,-30,-20,-20,-30,-40,-50 },
};

static const int PASSED_PAWN_BONUS[8] = {
    0,
    0,
    20,
    40,
    80,
    150,
    250,
    0 
};

static const int *pstFor(uint8_t p, int row, int col, bool isEndgame = false) {
    bool isW = pieceIsWhite(p);
    int  r   = isW ? row : (7 - row);
    switch (pieceType(p)) {
        case 1: return &PST_PAWN[r][col];
        case 2: return &PST_KNIGHT[r][col];
        case 3: return &PST_BISHOP[r][col];
        case 4: return &PST_ROOK[r][col];
        case 5: return &PST_QUEEN[r][col];
        case 6: return isEndgame ? &PST_KING_EG[r][col] : &PST_KING_MG[r][col];
        default: { static int z = 0; return &z; }
    }
}

int pieceValue(char p) {
    switch (tolower(p)) {
        case 'p': return 100;
        case 'n': return 320;
        case 'b': return 330;
        case 'r': return 500;
        case 'q': return 900;
        case 'k': return 20000;
        default:  return 0;
    }
}

static int pieceValueFast(uint8_t p) {
    static const int vals[7] = {0, 100, 320, 330, 500, 900, 20000};
    return vals[pieceType(p)];
}

int countPieces(const BoardSnapshot &snap, uint8_t piece) {
    int count = 0;
    for (int i = 0; i < 64; i++) {
        if (snap.bd[i] == piece) count++;
    }
    return count;
}

bool isEndgame(const BoardSnapshot &snap) {
    int whiteQueens = countPieces(snap, W_QUEEN);
    int blackQueens = countPieces(snap, B_QUEEN);
    
    if (whiteQueens == 0 && blackQueens == 0) return true;

    int whiteMaterial = 0, blackMaterial = 0;
    for (int i = 0; i < 64; i++) {
        uint8_t p = snap.bd[i];
        if (p == EMPTY) continue;
        int val = pieceValueFast(p);
        if (p == W_KING) continue;
        if (pieceIsWhite(p)) whiteMaterial += val;
        else blackMaterial += val;
    }
    
    return (whiteMaterial < 1500 || blackMaterial < 1500);
}

int evaluatePassedPawns(const BoardSnapshot &snap) {
    int score = 0;
    
    for (int i = 0; i < 64; i++) {
        uint8_t p = snap.bd[i];
        if (pieceType(p) != 1) continue; // Not a pawn
        
        int row = sqRow(i);
        int col = sqCol(i);
        bool isWhitePawn = pieceIsWhite(p);

        bool isPassed = true;
        int pawnRank = isWhitePawn ? row : (7 - row);
        
        for (int checkCol = std::max(0, col - 1); checkCol <= std::min(7, col + 1); checkCol++) {
            for (int checkRow = 0; checkRow < 8; checkRow++) {
                uint8_t checkPiece = snap.bd[sq(checkRow, checkCol)];
                if (pieceType(checkPiece) != 1) continue; // Not a pawn
                
                bool isEnemyPawn = pieceIsWhite(checkPiece) != isWhitePawn;
                if (!isEnemyPawn) continue;
                
                int enemyPawnRank = pieceIsWhite(checkPiece) ? checkRow : (7 - checkRow);
                (void)enemyPawnRank;

                if (isWhitePawn && checkRow <= row) {
                    isPassed = false;
                    break;
                }
                if (!isWhitePawn && checkRow >= row) {
                    isPassed = false;
                    break;
                }
            }
            if (!isPassed) break;
        }
        
        if (isPassed) {
            int bonus = PASSED_PAWN_BONUS[pawnRank];

            if (pawnRank >= 5) bonus += 50;
            if (pawnRank >= 6) bonus += 100;
            
            score += isWhitePawn ? bonus : -bonus;
        }
    }
    
    return score;
}

int evaluateEndgame(const BoardSnapshot &snap) {
    int score = 0;
    
    for (int i = 0; i < 64; i++) {
        uint8_t p = snap.bd[i];
        if (p == EMPTY) continue;
        int val = pieceValueFast(p) + *pstFor(p, sqRow(i), sqCol(i), true);
        score += pieceIsWhite(p) ? val : -val;
    }
    
    int whiteKingIdx = -1, blackKingIdx = -1;
    for (int i = 0; i < 64; i++) {
        if (snap.bd[i] == W_KING) whiteKingIdx = i;
        else if (snap.bd[i] == B_KING) blackKingIdx = i;
    }
    
    if (whiteKingIdx >= 0) {
        int wkRow = sqRow(whiteKingIdx), wkCol = sqCol(whiteKingIdx);
        int distFromCenter = std::max(std::abs(wkRow - 3), std::abs(wkCol - 3));
        score += (4 - distFromCenter) * 20;
    }
    
    if (blackKingIdx >= 0) {
        int bkRow = sqRow(blackKingIdx), bkCol = sqCol(blackKingIdx);
        int distFromCenter = std::max(std::abs(bkRow - 3), std::abs(bkCol - 3));
        score -= (4 - distFromCenter) * 20;
    }

    score += evaluatePassedPawns(snap);
    
    return snap.whiteTurn ? score : -score;
}

int evaluate(const BoardSnapshot &snap) {
    if (isEndgame(snap)) {
        return evaluateEndgame(snap);
    }

    int score = 0;
    for (int i = 0; i < 64; i++) {
        uint8_t p = snap.bd[i];
        if (p == EMPTY) continue;
        int val = pieceValueFast(p) + *pstFor(p, sqRow(i), sqCol(i), false);
        score  += pieceIsWhite(p) ? val : -val;
    }
    
    score += evaluatePassedPawns(snap) / 2; 
    
    return snap.whiteTurn ? score : -score;
}

int evaluate(const std::vector<std::vector<std::string>> &board) {
    int score = 0;
    for (int x = 0; x < 8; x++)
        for (int y = 0; y < 8; y++) {
            const std::string &cell = board[x][y];
            if (cell.empty()) continue;
            bool isW = isupper(cell[0]) != 0;
            int  val = pieceValue((char)tolower(cell[0]));
            score += isW ? val : -val;
        }
    return score;
}

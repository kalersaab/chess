#include "OpeningBook.h"
#include "PolyKeys.h"
#include "BoardState.h"
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <vector>
#include <algorithm>

#include <Foundation/Foundation.h>
#include <cstdio>

static inline void BLOGI(const char *format, ...) {
    va_list args;
    va_start(args, format);
    char buffer[1024];
    vsnprintf(buffer, sizeof(buffer), format, args);
    va_end(args);
    NSLog(@"[OpeningBook] %s", buffer);
}

static inline void BLOGE(const char *format, ...) {
    va_list args;
    va_start(args, format);
    char buffer[1024];
    vsnprintf(buffer, sizeof(buffer), format, args);
    va_end(args);
    NSLog(@"[OpeningBook ERROR] %s", buffer);
}

#pragma pack(push,1)
struct PolyEntry { uint64_t key; uint16_t move; uint16_t weight; uint32_t learn; };
#pragma pack(pop)

static std::vector<PolyEntry> gBook;
static bool gLoaded = false;

static uint16_t bs16(uint16_t x) { return (uint16_t)((x>>8)|(x<<8)); }
static uint64_t bs64(uint64_t x) { return __builtin_bswap64(x); }

static std::string decodePoly(uint16_t m) {
    int toFile   = (m >> 0) & 7;
    int toRank   = (m >> 3) & 7;
    int fromFile = (m >> 6) & 7;
    int fromRank = (m >> 9) & 7;
    int promo    = (m >> 12) & 7;

    std::string uci;
    uci += (char)('a' + fromFile);
    uci += (char)('1' + fromRank);
    uci += (char)('a' + toFile);
    uci += (char)('1' + toRank);

    if (promo) {
        const char promoChar[] = {0, 'n', 'b', 'r', 'q'};
        uci += promoChar[promo];
    }
    return uci;
}

static uint64_t polyHash(const BoardSnapshot &snap) {
    uint64_t h = 0;

    auto polyPieceIdx = [](uint8_t p) -> int {
        int t = pieceType(p);
        int w = pieceIsWhite(p) ? 1 : 0;
        return (t - 1) * 2 + w;
    };

    auto toPolySq = [](int s) -> int {
        return (7 - sqRow(s)) * 8 + sqCol(s);
    };

    for (int i = 0; i < 64; i++) {
        uint8_t p = snap.bd[i];
        if (p == EMPTY) continue;
        h ^= POLY_KEYS[polyPieceIdx(p) * 64 + toPolySq(i)];
    }

    if (!snap.whiteKingMoved && !snap.whiteRookHMoved) h ^= POLY_KEYS[768];
    if (!snap.whiteKingMoved && !snap.whiteRookAMoved) h ^= POLY_KEYS[769];
    if (!snap.blackKingMoved && !snap.blackRookHMoved) h ^= POLY_KEYS[770];
    if (!snap.blackKingMoved && !snap.blackRookAMoved) h ^= POLY_KEYS[771];

    if (snap.enPassantY >= 0 && snap.enPassantY < 8) {
        int epRow = snap.enPassantX;
        int epCol = snap.enPassantY;
        bool canCapture = false;

        if (snap.whiteTurn) {
            int pawnRow = epRow + 1;
            if (pawnRow >= 0 && pawnRow < 8) {
                if (epCol - 1 >= 0 && snap.bd[sq(pawnRow, epCol - 1)] == W_PAWN) canCapture = true;
                if (epCol + 1 <= 7 && snap.bd[sq(pawnRow, epCol + 1)] == W_PAWN) canCapture = true;
            }
        } else {
            int pawnRow = epRow - 1;
            if (pawnRow >= 0 && pawnRow < 8) {
                if (epCol - 1 >= 0 && snap.bd[sq(pawnRow, epCol - 1)] == B_PAWN) canCapture = true;
                if (epCol + 1 <= 7 && snap.bd[sq(pawnRow, epCol + 1)] == B_PAWN) canCapture = true;
            }
        }

        if (canCapture)
            h ^= POLY_KEYS[772 + epCol];
    }

    if (snap.whiteTurn) h ^= POLY_KEYS[780];

    return h;
}

bool openingBookLoad(const char *path) {
    if (gLoaded) return true;

    @autoreleasepool {
        NSString *nsPath = [NSString stringWithUTF8String:path];
        NSString *resourceName = [nsPath stringByDeletingPathExtension];
        NSString *resourceExt  = [nsPath pathExtension];
        
        NSString *filePath = [[NSBundle mainBundle] pathForResource:resourceName 
                                                             ofType:resourceExt];
        
        if (!filePath) {
            BLOGE("load: asset not found in bundle: %s", path);
            return false;
        }
        
        NSError *error = nil;
        NSData *data = [NSData dataWithContentsOfFile:filePath options:0 error:&error];
        
        if (!data || error) {
            BLOGE("load: failed to read file: %s (error: %s)", path, 
                  error ? [[error description] UTF8String] : "unknown");
            return false;
        }
        
        size_t size  = [data length];
        size_t count = size / sizeof(PolyEntry);
        
        if (count == 0) {
            BLOGE("load: invalid file size: %zu bytes", size);
            return false;
        }
        
        gBook.resize(count);
        memcpy(gBook.data(), [data bytes], count * sizeof(PolyEntry));
        
        for (auto &e : gBook) {
            e.key    = bs64(e.key);
            e.move   = bs16(e.move);
            e.weight = bs16(e.weight);
        }
        
        std::sort(gBook.begin(), gBook.end(),
                  [](const PolyEntry &a, const PolyEntry &b){ return a.key < b.key; });
        
        gLoaded = true;
        BLOGI("load: OK — %zu entries from %s", count, path);
        
        // Verify starting position
        BoardSnapshot startSnap;
        startSnap.board = {
            {"r","n","b","q","k","b","n","r"},
            {"p","p","p","p","p","p","p","p"},
            {"","","","","","","",""},
            {"","","","","","","",""},
            {"","","","","","","",""},
            {"","","","","","","",""},
            {"P","P","P","P","P","P","P","P"},
            {"R","N","B","Q","K","B","N","R"},
        };
        startSnap.whiteTurn      = true;
        startSnap.whiteKingMoved = startSnap.blackKingMoved  = false;
        startSnap.whiteRookAMoved= startSnap.whiteRookHMoved = false;
        startSnap.blackRookAMoved= startSnap.blackRookHMoved = false;
        startSnap.enPassantX     = startSnap.enPassantY      = -1;
        startSnap.syncFromString();
        
        uint64_t startHash = polyHash(startSnap);
        bool hashOk = (startHash == 0x463b96181691fc9cULL);
        BLOGI("load: start hash=%016llx expected=463b96181691fc9c [%s]",
              (unsigned long long)startHash, hashOk ? "CORRECT" : "WRONG");
        return true;
    }
}

std::string openingBookProbe(const BoardSnapshot &snap) {
    if (!gLoaded || gBook.empty()) {
        if (!openingBookLoad("performance.bin")) {
            BLOGI("probe: opening book not ready yet; retrying later");
            return "";
        }
    }

    if (!gLoaded || gBook.empty()) {
        BLOGE("probe: book not loaded (gLoaded=%d size=%zu)", gLoaded, gBook.size());
        return "";
    }

    uint64_t hash = polyHash(snap);
    BLOGI("probe: hash=%016llx side=%s", (unsigned long long)hash,
          snap.whiteTurn ? "white" : "black");

    auto it = std::lower_bound(gBook.begin(), gBook.end(), hash,
                               [](const PolyEntry &e, uint64_t k){ return e.key < k; });

    if (it == gBook.end() || it->key != hash) {
        BLOGI("probe: no book entry for this position");
        return "";
    }

    std::vector<std::pair<uint16_t,uint16_t>> candidates;
    uint32_t total = 0;
    for (auto jt = it; jt != gBook.end() && jt->key == hash; ++jt) {
        candidates.push_back({jt->move, jt->weight});
        total += jt->weight;
        BLOGI("probe:   candidate %s weight=%u", decodePoly(jt->move).c_str(), jt->weight);
    }

    if (total == 0) return "";

    uint32_t pick = (uint32_t)(rand() % total);
    uint32_t acc  = 0;
    for (auto &[mv, wt] : candidates) {
        acc += wt;
        if (pick < acc) {
            std::string chosen = decodePoly(mv);
            BLOGI("probe: chosen %s (pick=%u total=%u)", chosen.c_str(), pick, total);
            return chosen;
        }
    }
    return decodePoly(candidates.back().first);
}

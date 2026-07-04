#include "Attacks.h"
#include <cstring>

int KNIGHT_ATTACKS[64][9];

static void initKnight() {
    const int dr[] = {-2,-2,-1,-1, 1, 1, 2, 2};
    const int dc[] = {-1, 1,-2, 2,-2, 2,-1, 1};
    for (int s = 0; s < 64; s++) {
        int r = sqRow(s), c = sqCol(s), cnt = 0;
        for (int i = 0; i < 8; i++) {
            int nr = r + dr[i], nc = c + dc[i];
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8)
                KNIGHT_ATTACKS[s][++cnt] = sq(nr, nc);
        }
        KNIGHT_ATTACKS[s][0] = cnt;
    }
}

int KING_ATTACKS[64][9];

static void initKing() {
    const int dr[] = {-1,-1,-1, 0, 0, 1, 1, 1};
    const int dc[] = {-1, 0, 1,-1, 1,-1, 0, 1};
    for (int s = 0; s < 64; s++) {
        int r = sqRow(s), c = sqCol(s), cnt = 0;
        for (int i = 0; i < 8; i++) {
            int nr = r + dr[i], nc = c + dc[i];
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8)
                KING_ATTACKS[s][++cnt] = sq(nr, nc);
        }
        KING_ATTACKS[s][0] = cnt;
    }
}

RayMasks RAYS;

static void initRays() {
    memset(&RAYS, 0, sizeof(RAYS));
    for (int s = 0; s < 64; s++) {
        int r = sqRow(s), c = sqCol(s);
        for (int cc = 0; cc < 8; cc++)
            if (cc != c) RAYS.rank[s] |= uint64_t(1) << sq(r, cc);
        for (int rr = 0; rr < 8; rr++)
            if (rr != r) RAYS.file[s] |= uint64_t(1) << sq(rr, c);
        for (int rr = 0; rr < 8; rr++) {
            int cc = c + (rr - r);
            if (cc >= 0 && cc < 8 && rr != r)
                RAYS.diag[s] |= uint64_t(1) << sq(rr, cc);
        }
        for (int rr = 0; rr < 8; rr++) {
            int cc = c - (rr - r);
            if (cc >= 0 && cc < 8 && rr != r)
                RAYS.anti[s] |= uint64_t(1) << sq(rr, cc);
        }
    }
}

struct AttackInit {
    AttackInit() { initKnight(); initKing(); initRays(); }
} static attackInit;

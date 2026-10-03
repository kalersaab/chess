export enum PIECE_TYPE {
    Selected = 'selected',
    Capture = 'capture',
    Move = 'move'
}

export enum PIECE_COLOR {
    black = 'black',
    white = 'white'
}

export enum CHECK_STATUS {
    none = 'none',
    check = 'check',
    checkmate = 'checkmate',
    valid = 'valid'
}

export function applyMoveAfterHistoryCursor(
    moves: string[],
    cursor: number,
    nextMove: string,
): { moves: string[]; cursor: number } {
    const safeCursor = Math.max(0, Math.min(cursor, moves.length));
    const trimmed = moves.slice(0, safeCursor);
    trimmed.push(nextMove);
    return { moves: trimmed, cursor: trimmed.length };
}
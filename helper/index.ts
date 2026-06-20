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
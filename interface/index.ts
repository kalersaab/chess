import { PIECE_COLOR, PIECE_TYPE } from "../helper";
import { PIECES } from "../utils";

export interface HighlightSquare {
  x: number;
  y: number;
  type: PIECE_TYPE;
}

export interface Position {
  x: number;
  y: number;
}

export interface PieceProps {
  id: keyof typeof PIECES;
  position: Position;
  onMoveEnd: () => void;
  currentTurn: PIECE_COLOR;
  board: string[][];
}


export interface SelectionState {
  highlights: HighlightSquare[];
  setHighlights: (h: HighlightSquare[]) => void;
  selectedSquare: string | null;
  validMoves: string[];
  promotionSquares: Set<string>;
  selectPiece: (square: string, moves: string[], board: string[][]) => void;
  clearSelection: () => void;
  pendingMoveTarget: string | null;
  setPendingMoveTarget: (square: string | null) => void;
}

import React, { createContext, useContext, useState } from 'react';
import { HighlightSquare, SelectionState } from '../interface';
import { PIECE_TYPE } from '../helper';


const SelectionContext = createContext<SelectionState>({
  highlights: [],
  setHighlights: () => {},
  selectedSquare: null,
  validMoves: [],
  promotionSquares: new Set(),
  selectPiece: () => {},
  clearSelection: () => {},
  pendingMoveTarget: null,
  setPendingMoveTarget: () => {},
});

const squareToPos = (sq: string) => ({
  x: sq.charCodeAt(0) - 97,
  y: 8 - parseInt(sq[1], 10),
});

const bareSquare = (sq: string) => sq.replace('=', '');

export const SelectionProvider = ({ children }: { children: React.ReactNode }) => {
  const [highlights, setHighlights] = useState<HighlightSquare[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [promotionSquares, setPromotionSquares] = useState<Set<string>>(new Set());
  const [pendingMoveTarget, setPendingMoveTarget] = useState<string | null>(null);

  const selectPiece = (square: string, moves: string[], board: string[][]) => {
    const bare = moves.map(bareSquare);
    const promoSet = new Set(moves.filter(m => m.endsWith('=')).map(bareSquare));

    setSelectedSquare(square);
    setValidMoves(bare);
    setPromotionSquares(promoSet);

    const fromPos = squareToPos(square);
    const hs: HighlightSquare[] = [
      { x: fromPos.x, y: fromPos.y, type: PIECE_TYPE.Selected },
      ...bare.map(sq => {
        const pos = squareToPos(sq);
        const hasPiece = board[pos.y]?.[pos.x] !== '';
        return {
          x: pos.x,
          y: pos.y,
          type: hasPiece ? PIECE_TYPE.Capture : PIECE_TYPE.Move,
        };
      }),
    ];
    setHighlights(hs);
  };

  const clearSelection = () => {
    setSelectedSquare(null);
    setValidMoves([]);
    setPromotionSquares(new Set());
    setHighlights([]);
  };

  return (
    <SelectionContext.Provider
      value={{ highlights, setHighlights, selectedSquare, validMoves, promotionSquares, selectPiece, clearSelection, pendingMoveTarget, setPendingMoveTarget }}
    >
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => useContext(SelectionContext);

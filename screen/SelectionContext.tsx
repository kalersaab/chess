import React, { createContext, useContext, useState } from 'react';
import { HighlightSquare } from '../interface';

interface SelectionState {
  highlights: HighlightSquare[];
  setHighlights: (h: HighlightSquare[]) => void;
  selectedSquare: string | null;       // e.g. "e2"
  validMoves: string[];                // e.g. ["e3","e4"]
  selectPiece: (square: string, moves: string[], board: string[][]) => void;
  clearSelection: () => void;
}

const SelectionContext = createContext<SelectionState>({
  highlights: [],
  setHighlights: () => {},
  selectedSquare: null,
  validMoves: [],
  selectPiece: () => {},
  clearSelection: () => {},
});

const squareToPos = (sq: string) => ({
  x: sq.charCodeAt(0) - 97,
  y: 8 - parseInt(sq[1], 10),
});

export const SelectionProvider = ({ children }: { children: React.ReactNode }) => {
  const [highlights, setHighlights] = useState<HighlightSquare[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);

  const selectPiece = (square: string, moves: string[], board: string[][]) => {
    setSelectedSquare(square);
    setValidMoves(moves);

    const fromPos = squareToPos(square);
    const hs: HighlightSquare[] = [
      { x: fromPos.x, y: fromPos.y, type: 'selected' },
      ...moves.map(sq => {
        const pos = squareToPos(sq);
        const hasPiece = board[pos.y]?.[pos.x] !== '';
        return {
          x: pos.x,
          y: pos.y,
          type: hasPiece ? ('capture' as const) : ('move' as const),
        };
      }),
    ];
    setHighlights(hs);
  };

  const clearSelection = () => {
    setSelectedSquare(null);
    setValidMoves([]);
    setHighlights([]);
  };

  return (
    <SelectionContext.Provider
      value={{ highlights, setHighlights, selectedSquare, validMoves, selectPiece, clearSelection }}
    >
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => useContext(SelectionContext);

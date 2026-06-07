import { Dimensions, StyleSheet, View } from 'react-native';
import React, { useState, useCallback } from 'react';
import Background from '../Background';
import NativeChessModule from '../../specs/NativeChessModule';
import Piece, { SIZE } from '../pieces';
import MoveHighlights from '../MoveHighlights';
import { SelectionProvider, useSelection } from '../SelectionContext';
import { PIECE_COLOR } from '../../helper';

const { width } = Dimensions.get('window');

// Inner component so it can access SelectionContext
function BoardInner() {
  const [board, setBoard] = useState<string[][]>(() => NativeChessModule.getBoard());
  const [turn, setTurn] = useState<PIECE_COLOR>(() => NativeChessModule.getTurn() as PIECE_COLOR);

  const { selectedSquare, clearSelection } = useSelection();

  const refreshBoard = useCallback(() => {
    setBoard(NativeChessModule.getBoard());
    setTurn(NativeChessModule.getTurn() as PIECE_COLOR);
  }, []);

  // Called when a valid empty square (dot) is tapped
  const handleSquareTap = useCallback(async (toSquare: string) => {
    if (!selectedSquare) return;
    const move = `${selectedSquare}${toSquare}`;
    clearSelection();
    const result = await NativeChessModule.makeMove(move);
    if (result === 'valid' || result === 'checkmate' || result === 'check') {
      refreshBoard();
    }
  }, [selectedSquare, clearSelection, refreshBoard]);

  return (
    <View style={styles.container}>
      <Background />
      <MoveHighlights onSquareTap={handleSquareTap} />
      {board.map((row, y) =>
        row.map((piece, x) => {
          if (!piece) return null;
          return (
            <Piece
              key={`${piece}-${x}-${y}`}
              position={{ x, y }}
              id={piece as any}
              currentTurn={turn}
              board={board}
              onMoveEnd={refreshBoard}
            />
          );
        }),
      )}
    </View>
  );
}

export default function Board() {
  return (
    <SelectionProvider>
      <BoardInner />
    </SelectionProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height: width,
  },
});

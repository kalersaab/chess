import { Dimensions, StyleSheet, Text, View } from 'react-native';
import React, { useState } from 'react';
import Background from '../Background';
import NativeChessModule from '../../specs/NativeChessModule';
import Piece, { SIZE } from '../pieces';
const { width } = Dimensions.get('window');
export default function Board() {
  const board = NativeChessModule.getBoard();
  const player: string = NativeChessModule.getTurn();
  const [state, setState] = useState(board);
  return (
    <View style={styles.container}>
      <Background />
      {board.map((row, y) =>
        row.map((piece, x) => {
          if (!piece) return null;

          return (
            <Piece
              key={`${x}-${y}`}
              position={{ x, y }}
              id={piece as any}
              currentTurn={player as any}
              onMoveEnd={newPos => {
                const updatedBoard: any = board.map(r => [...r]);
                updatedBoard[newPos.y][newPos.x] = updatedBoard[y][x];
                updatedBoard[y][x] = null;
                setState(updatedBoard);
              }}
            />
          );
        }),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height: width,
  },
});

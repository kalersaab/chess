import { Dimensions, StyleSheet, Text, View } from 'react-native'
import React, { useState } from 'react'
import Background from '../Background'
import NativeChessModule from '../../specs/NativeChessModule';
import Piece, { SIZE } from '../pieces';
const { width } = Dimensions.get("window");
export default function Board() {
  const board = NativeChessModule.getBoard();
  const player = NativeChessModule.getTurn();
   const [state, setState] = useState({
    player: player,
    board: board,
  });
 
  return (
     <View style={styles.container}>
      <Background />
{
  state.board.map((row, y) =>
    row.map((piece, x) => {
      if (!piece) return null; // Only render if piece exists

      return (
        <Piece
          key={`${x}-${y}`}
          position={{ x, y }}
          id={piece as any}
          onMoveEnd={(newPos) => {
            const updatedBoard = state.board.map((r) => [...r]); // deep copy

            updatedBoard[newPos.y][newPos.x] = updatedBoard[y][x];
            updatedBoard[y][x] = null;

            setState({
              ...state,
              board: updatedBoard,
            });
          }}
        />
      );
    })
  )
}

    </View>
  )
}

const styles = StyleSheet.create({
     container: {
    width,
    height: width,
  },
})
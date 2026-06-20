import React from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { PIECE_COLOR, PIECE_TYPE } from '../../helper';
import { useSelection } from '../../context';

const { width } = Dimensions.get('window');
const SIZE = width / 8;

interface Props {
  onSquareTap: (toSquare: string) => void;
  currentTurn: PIECE_COLOR;
  board: string[][];
}

const colToLetter = (x: number) => String.fromCharCode(97 + x);
const posToSquare = (x: number, y: number) => `${colToLetter(x)}${8 - y}`;

const squareToPos = (sq: string) => ({
  x: sq.charCodeAt(0) - 97,
  y: 8 - parseInt(sq[1], 10),
});

const MoveHighlights = ({ onSquareTap, currentTurn, board }: Props) => {
  const { highlights, selectedSquare } = useSelection();

  const isCorrectTurn = (() => {
    if (!selectedSquare) return false;
    const { x, y } = squareToPos(selectedSquare);
    const piece = board[y]?.[x];
    if (!piece) return false;
    const isWhitePiece = piece === piece.toUpperCase();
    return (
      (currentTurn === PIECE_COLOR.white && isWhitePiece) ||
      (currentTurn === PIECE_COLOR.black && !isWhitePiece)
    );
  })();

  if (!isCorrectTurn) return null;

  return (
    <>
      {highlights.map(({ x, y, type }) => {
        const square = posToSquare(x, y);

        if (type === PIECE_TYPE.Selected) {
          return (
            <View
              key={`sel-${x}-${y}`}
              pointerEvents="none"
              style={[
                styles.base,
                { left: x * SIZE, top: y * SIZE, borderWidth:12, borderRadius:20, borderColor:'rgba(5, 83, 53, 0.5)'},
              ]}
            />
          );
        }

        if (type === PIECE_TYPE.Capture) {
          return (
            <TouchableOpacity
              key={`cap-${x}-${y}`}
              activeOpacity={0.7}
              onPress={() => onSquareTap(square)}
              style={[styles.base, { left: x * SIZE, top: y * SIZE }]}
            >
              <View style={styles.captureRing} />
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={`mv-${x}-${y}`}
            activeOpacity={0.7}
            onPress={() => onSquareTap(square)}
            style={[styles.base, { left: x * SIZE, top: y * SIZE }]}
          >
            <View style={styles.moveDot} />
          </TouchableOpacity>
        );
      })}
    </>
  );
};

export default MoveHighlights;

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  moveDot: {
    width: SIZE * 0.34,
    height: SIZE * 0.34,
    borderRadius: SIZE * 0.17,
    backgroundColor: 'rgba(20, 85, 30, 0.5)',
  },
  captureRing: {
    width: SIZE * 0.9,
    height: SIZE * 0.9,
    borderRadius: SIZE * 0.45,
    borderWidth: SIZE * 0.1,
    borderColor: 'rgba(20, 85, 30, 0.5)',
    backgroundColor: 'transparent',
  },
});

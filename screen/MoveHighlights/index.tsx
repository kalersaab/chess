import React from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useSelection } from '../SelectionContext';

const { width } = Dimensions.get('window');
const SIZE = width / 8;

interface Props {
  onSquareTap: (toSquare: string) => void;
}

const colToLetter = (x: number) => String.fromCharCode(97 + x);
const posToSquare = (x: number, y: number) => `${colToLetter(x)}${8 - y}`;

const MoveHighlights = ({ onSquareTap }: Props) => {
  const { highlights } = useSelection();

  return (
    <>
      {highlights.map(({ x, y, type }) => {
        const square = posToSquare(x, y);

        if (type === 'selected') {
          return (
            <View
              key={`sel-${x}-${y}`}
              pointerEvents="none"
              style={[
                styles.base,
                { left: x * SIZE, top: y * SIZE, backgroundColor: 'rgba(20, 85, 30, 0.5)' },
              ]}
            />
          );
        }

        if (type === 'capture') {
          // Capture: ring overlay — piece underneath handles the tap via Piece's own tap gesture
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

        // Empty valid square — full tap target with dot
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

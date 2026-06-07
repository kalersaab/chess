import React, { useState } from 'react';
import {
  Image,
  Dimensions,
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { PIECES, positionToSquare } from '../../utils';
import NativeChessModule from '../../specs/NativeChessModule';
import { scheduleOnRN } from 'react-native-worklets';
import { useSelection } from '../SelectionContext';
import { PIECE_COLOR } from '../../helper';

const { width } = Dimensions.get('window');
export const SIZE = width / 8;

interface Position {
  x: number;
  y: number;
}

interface PieceProps {
  id: keyof typeof PIECES;
  position: Position;
  onMoveEnd: () => void;
  currentTurn: PIECE_COLOR;
  board: string[][];
}

const colToLetter = (x: number) => String.fromCharCode(97 + x);
const posToSquare = (x: number, y: number) => `${colToLetter(x)}${8 - y}`;

const Piece = ({ id, position, onMoveEnd, currentTurn, board }: PieceProps) => {
  const translateX = useSharedValue(position.x * SIZE);
  const translateY = useSharedValue(position.y * SIZE);
  const scale = useSharedValue(1);

  const { selectedSquare, validMoves, selectPiece, clearSelection } = useSelection();

  const [promotion, setPromotion] = useState<{
    visible: boolean;
    move: string;
    newX: number;
    newY: number;
  } | null>(null);

  const isWhitePiece = id === id.toUpperCase();
  const isPlayerTurn =
    (currentTurn === PIECE_COLOR.white && isWhitePiece) ||
    (currentTurn === PIECE_COLOR.black && !isWhitePiece);

  const mySquare = posToSquare(position.x, position.y);

  // ─── Execute a validated move ────────────────────────────────────────────────
  const executeMove = async (fromSq: string, toSq: string, toX: number, toY: number) => {
    clearSelection();

    const move = `${fromSq}${toSq}`;

    const isBlackPawnPromotion = id === 'p' && toY === 7;
    const isWhitePawnPromotion = id === 'P' && toY === 0;
    if (isBlackPawnPromotion || isWhitePawnPromotion) {
      setPromotion({ visible: true, move, newX: toX, newY: toY });
      return;
    }

    const result = await NativeChessModule.makeMove(move);
    if (result === 'valid' || result === 'checkmate' || result === 'check') {
      translateX.value = withTiming(toX * SIZE);
      translateY.value = withTiming(toY * SIZE);
      onMoveEnd();
      if (result === 'checkmate') {
        Alert.alert('Checkmate', `${currentTurn} wins!`);
      }
    } else {
      translateX.value = withTiming(position.x * SIZE);
      translateY.value = withTiming(position.y * SIZE);
    }
  };

  // ─── Tap: select own piece OR move if a target square was tapped ─────────────
  const handleTap = () => {
    const toSq = mySquare;

    // Tapping a piece that is already a valid move target (capture)
    if (selectedSquare && selectedSquare !== toSq && validMoves.includes(toSq)) {
      executeMove(selectedSquare, toSq, position.x, position.y);
      return;
    }

    // Tapping own piece: select it and show valid moves
    if (isPlayerTurn) {
      if (selectedSquare === toSq) {
        // Tap same piece again → deselect
        clearSelection();
        return;
      }
      const moves = NativeChessModule.getValidMoves(toSq);
      selectPiece(toSq, moves, board);
      return;
    }

    // Tapping opponent piece with no selection → do nothing
    clearSelection();
  };

  // ─── Drag: existing drag-to-move behaviour ───────────────────────────────────
  const handleDragStart = () => {
    if (!isPlayerTurn) return;
    const moves = NativeChessModule.getValidMoves(mySquare);
    selectPiece(mySquare, moves, board);
  };

  const handleDragEnd = async (move: string, newX: number, newY: number) => {
    clearSelection();

    const isBlackPawnPromotion = id === 'p' && newY === 7;
    const isWhitePawnPromotion = id === 'P' && newY === 0;
    if (isBlackPawnPromotion || isWhitePawnPromotion) {
      setPromotion({ visible: true, move, newX, newY });
      return;
    }

    const result = await NativeChessModule.makeMove(move);
    if (result === 'valid' || result === 'checkmate' || result === 'check') {
      translateX.value = withTiming(newX * SIZE);
      translateY.value = withTiming(newY * SIZE);
      onMoveEnd();
      if (result === 'checkmate') {
        Alert.alert('Checkmate', `${currentTurn} wins!`);
      }
    } else {
      translateX.value = withTiming(position.x * SIZE);
      translateY.value = withTiming(position.y * SIZE);
    }
  };

  const handlePromotion = async (promotionPiece: string) => {
    const moveWithPromotion = promotion!.move + promotionPiece;
    const result = await NativeChessModule.makeMove(moveWithPromotion);
    if (result === 'valid' || result === 'checkmate') {
      translateX.value = withTiming(promotion!.newX * SIZE);
      translateY.value = withTiming(promotion!.newY * SIZE);
      onMoveEnd();
    } else {
      translateX.value = withTiming(position.x * SIZE);
      translateY.value = withTiming(position.y * SIZE);
    }
    setPromotion(null);
  };

  // Combine tap + pan gestures
  const tapGesture = Gesture.Tap().onEnd(() => {
    'worklet';
    runOnJS(handleTap)();
  });

  const panGesture = Gesture.Pan()
    .enabled(isPlayerTurn)
    .onBegin(() => {
      'worklet';
      scale.value = withTiming(1.2, { duration: 100 });
      runOnJS(handleDragStart)();
    })
    .onUpdate(e => {
      'worklet';
      translateX.value = position.x * SIZE + e.translationX;
      translateY.value = position.y * SIZE + e.translationY;
    })
    .onEnd(() => {
      'worklet';
      scale.value = withTiming(1, { duration: 100 });
      const from = positionToSquare(position.x * SIZE, position.y * SIZE);
      const to = positionToSquare(translateX.value, translateY.value);
      const newX = Math.round(translateX.value / SIZE);
      const newY = Math.round(translateY.value / SIZE);
      scheduleOnRN(handleDragEnd, `${from}${to}`, newX, newY);
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withTiming(1, { duration: 100 });
    });

  // Tap takes priority; pan activates only when finger moves enough
  const gesture = Gesture.Exclusive(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    zIndex: scale.value > 1 ? 100 : 10,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <>
      <GestureDetector gesture={gesture}>
        <Animated.View style={animatedStyle}>
          <Image source={PIECES[id]} style={styles.piece} />
        </Animated.View>
      </GestureDetector>

      {promotion?.visible && (
        <View style={styles.modal}>
          {['q', 'r', 'b', 'n'].map(p => (
            <TouchableOpacity
              key={p}
              style={styles.button}
              onPress={() => handlePromotion(p)}
            >
              <Image
                source={
                  id === id.toUpperCase()
                    ? PIECES[p.toUpperCase() as keyof typeof PIECES]
                    : PIECES[p as keyof typeof PIECES]
                }
                style={{ width: 50, height: 50 }}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );
};

export default Piece;

const styles = StyleSheet.create({
  piece: {
    width: SIZE,
    height: SIZE,
  },
  modal: {
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    left: '30%',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    elevation: 10,
    zIndex: 200,
  },
  button: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#eee',
    borderRadius: 5,
    alignItems: 'center',
  },
});

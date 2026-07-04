import React, { useMemo, useEffect, useState } from 'react';
import {
  Image,
  Dimensions,
  StyleSheet,
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
import { CHECK_STATUS, PIECE_COLOR } from '../../helper';
import { PieceProps } from '../../interface';
import { useSelection } from '../../context';

const { width } = Dimensions.get('window');
export const SIZE = width / 8;

const colToLetter = (x: number) => String.fromCharCode(97 + x);
const posToSquare = (x: number, y: number) => `${colToLetter(x)}${8 - y}`;

const Piece = ({ id, position, onMoveEnd, currentTurn, board }: PieceProps) => {
  const translateX = useSharedValue(position.x * SIZE);
  const translateY = useSharedValue(position.y * SIZE);
  const scale = useSharedValue(1);

  const { selectedSquare, validMoves, promotionSquares, selectPiece, clearSelection, pendingMoveTarget, setPendingMoveTarget } = useSelection();

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

  useEffect(() => {
    if (!pendingMoveTarget || selectedSquare !== mySquare) return;

    const toSq = pendingMoveTarget;
    const toX = toSq.charCodeAt(0) - 97;
    const toY = 8 - parseInt(toSq[1], 10);

    setPendingMoveTarget(null);

    if (promotionSquares.has(toSq)) {
      clearSelection();
      setPromotion({ visible: true, move: `${mySquare}${toSq}`, newX: toX, newY: toY });
      return;
    }

    clearSelection();

    const runMove = async () => {
      const result = await NativeChessModule.makeMove(`${mySquare}${toSq}`);
      if (result === CHECK_STATUS.valid || result === CHECK_STATUS.checkmate || result === CHECK_STATUS.check) {
        translateX.value = withTiming(toX * SIZE, { duration: 200 });
        translateY.value = withTiming(toY * SIZE, { duration: 200 });
        const isCheckmate = result === CHECK_STATUS.checkmate;
        onMoveEnd(isCheckmate);
        if (isCheckmate) Alert.alert('Checkmate', `${currentTurn} wins!`);
      }
    };
    runMove();
  }, [pendingMoveTarget, selectedSquare]);

  const executeMove = async (fromSq: string, toSq: string, toX: number, toY: number) => {
    clearSelection();
    const move = `${fromSq}${toSq}`;
    if (promotionSquares.has(toSq)) {
      setPromotion({ visible: true, move, newX: toX, newY: toY });
      return;
    }
    const result = await NativeChessModule.makeMove(move);
    if (result === CHECK_STATUS.valid || result === CHECK_STATUS.checkmate || result === CHECK_STATUS.check) {
      translateX.value = withTiming(toX * SIZE, { duration: 200 });
      translateY.value = withTiming(toY * SIZE, { duration: 200 });
      const isCheckmate = result === CHECK_STATUS.checkmate;
      onMoveEnd(isCheckmate);
      if (isCheckmate) Alert.alert('Checkmate', `${currentTurn} wins!`);
    } else {
      translateX.value = withTiming(position.x * SIZE);
      translateY.value = withTiming(position.y * SIZE);
    }
  };

  const handleTap = () => {
    const toSq = mySquare;

    if (selectedSquare && selectedSquare !== toSq && validMoves.includes(toSq)) {
      executeMove(selectedSquare, toSq, position.x, position.y);
      return;
    }

    if (isPlayerTurn) {
      if (selectedSquare === toSq) {
        clearSelection();
        return;
      }
      const moves = NativeChessModule.getValidMoves(toSq);
      selectPiece(toSq, moves, board);
      return;
    }

  };

  const handleDragStart = () => {
    if (!isPlayerTurn) return;
    const moves = NativeChessModule.getValidMoves(mySquare);
    selectPiece(mySquare, moves, board);
  };

  const handleDragEnd = async (move: string, newX: number, newY: number) => {
    const toSq = move.slice(2, 4);
    clearSelection();
    if (promotionSquares.has(toSq)) {
      setPromotion({ visible: true, move, newX, newY });
      return;
    }
    const result = await NativeChessModule.makeMove(move);
    if (result === 'valid' || result === CHECK_STATUS.checkmate || result === CHECK_STATUS.check) {
      translateX.value = withTiming(newX * SIZE);
      translateY.value = withTiming(newY * SIZE);
      const isCheckmate = result === CHECK_STATUS.checkmate;
      onMoveEnd(isCheckmate);
      if (isCheckmate) Alert.alert('Checkmate', `${currentTurn} wins!`);
    } else {
      translateX.value = withTiming(position.x * SIZE);
      translateY.value = withTiming(position.y * SIZE);
    }
  };

  const handlePromotion = async (promotionPiece: string) => {
    const moveWithPromotion = promotion!.move + promotionPiece;
    const result = await NativeChessModule.makeMove(moveWithPromotion);
    if (result === 'valid' || result === CHECK_STATUS.checkmate) {
      translateX.value = withTiming(promotion!.newX * SIZE);
      translateY.value = withTiming(promotion!.newY * SIZE);
      onMoveEnd();
    } else {
      translateX.value = withTiming(position.x * SIZE);
      translateY.value = withTiming(position.y * SIZE);
    }
    setPromotion(null);
  };

  const tapGesture = useMemo(() => Gesture.Tap().onEnd(() => {
    'worklet';
    runOnJS(handleTap)();
  }), []);

  const panGesture = useMemo(() => Gesture.Pan()
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
    }), [isPlayerTurn]);

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

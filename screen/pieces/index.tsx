import React, { useState } from 'react';
import {
  Image,
  Dimensions,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
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

const { width } = Dimensions.get('window');
export const SIZE = width / 8;

interface Position {
  x: number;
  y: number;
}

interface PieceProps {
  id: keyof typeof PIECES;
  position: Position;
  onMoveEnd: (newPos: Position) => void;
  currentTurn: 'white' | 'black';
}

const Piece = ({ id, position, onMoveEnd, currentTurn }: PieceProps) => {
  const translateX = useSharedValue(position.x * SIZE);
  const translateY = useSharedValue(position.y * SIZE);

  const [promotion, setPromotion] = useState<{
    visible: boolean;
    move: string;
    newX: number;
    newY: number;
  } | null>(null);

  const handlePromotion = async (promotionPiece: string) => {
    const moveWithPromotion = promotion!.move + promotionPiece;
    const isValid = await NativeChessModule.makeMove(moveWithPromotion);
    if (isValid ==='valid' || isValid ==='checkmate') {
      translateX.value = withTiming(promotion!.newX * SIZE);
      translateY.value = withTiming(promotion!.newY * SIZE);
      onMoveEnd({ x: promotion!.newX, y: promotion!.newY });
    } else {
      translateX.value = withTiming(position.x * SIZE);
      translateY.value = withTiming(position.y * SIZE);
    }
    setPromotion(null);
  };

  const handleMoveEnd = async (move: string, newX: number, newY: number) => {
  const isBlackPawnPromotion = id === 'p' && newY === 7;
  const isWhitePawnPromotion = id === 'P' && newY === 0;
  if (isBlackPawnPromotion || isWhitePawnPromotion) {
    runOnJS(setPromotion)({
      visible: true,
      move,
      newX,
      newY,
    });
    return;
  }

  const result = await NativeChessModule.makeMove(move);
  if (result === 'valid' || result === 'checkmate' || result === 'check') {
    translateX.value = withTiming(newX * SIZE);
    translateY.value = withTiming(newY * SIZE);

    onMoveEnd({ x: newX, y: newY });

    if (result === 'checkmate') {
      scheduleOnRN(Alert.alert, 'Checkmate', `${currentTurn} wins!`)
    }
  } else {
    translateX.value = withTiming(position.x * SIZE);
    translateY.value = withTiming(position.y * SIZE);
  }
};
  const isWhitePiece = id === id.toUpperCase();
  const isPlayerTurn =
    (currentTurn === 'white' && isWhitePiece) ||
    (currentTurn === 'black' && !isWhitePiece);
  const gesture = Gesture.Pan()
    .enabled(isPlayerTurn)
    .onUpdate(e => {
      'worklet';
      translateX.value = position.x * SIZE + e.translationX;
      translateY.value = position.y * SIZE + e.translationY;
    })
    .onEnd(() => {
      'worklet';
      const from = positionToSquare(position.x * SIZE, position.y * SIZE);
      const to = positionToSquare(translateX.value, translateY.value);
      const move = `${from}${to}`;
      const newX = Math.round(translateX.value / SIZE);
      const newY = Math.round(translateY.value / SIZE);
      scheduleOnRN(handleMoveEnd, move, newX, newY);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
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
          {['q', 'r', 'b', 'n'].map(piece => (
            <TouchableOpacity
              key={piece}
              style={styles.button}
              onPress={() => handlePromotion(piece)}
            >
              <Image
                source={
                  id === id.toUpperCase()
                    ? PIECES[piece.toUpperCase() as keyof typeof PIECES]
                    : PIECES[piece as keyof typeof PIECES]
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
  },
  button: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#eee',
    borderRadius: 5,
    alignItems: 'center',
  },
  text: {
    fontSize: 22,
    fontWeight: 'bold',
  },
});

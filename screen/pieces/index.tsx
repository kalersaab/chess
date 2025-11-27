import React from "react";
import { Image, Dimensions, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { PIECES } from "../../utils";
import NativeChessModule from "../../specs/NativeChessModule";

const { width } = Dimensions.get("window");
export const SIZE = width / 8;

interface Position {
  x: number;
  y: number;
}

interface PieceProps {
  id: keyof typeof PIECES; // "wp","bk",etc
  position: Position;
  onMoveEnd: (newPos: Position) => void;
}

const Piece = ({ id, position, onMoveEnd }: PieceProps) => {
  const isGestureActive = useSharedValue(false);
  const translateX = useSharedValue(position.x * SIZE);
  const translateY = useSharedValue(position.y * SIZE);

const positionToSquare = (x: number, y: number) => {
  "worklet";
  const col = String.fromCharCode(97 + Math.round(x / SIZE));
  const row = `${8 - Math.round(y / SIZE)}`;
  return `${col}${row}`
};


 const handleMoveEnd = async(move: string, newX: number, newY: number) => {
  const isValid = await NativeChessModule.makeMove(move);

  if (isValid) {
    translateX.value = withTiming(newX * SIZE);
    translateY.value = withTiming(newY * SIZE);
    onMoveEnd({ x: newX, y: newY });
  } else {
    translateX.value = withTiming(position.x * SIZE);
    translateY.value = withTiming(position.y * SIZE);
  }
};

const gesture = Gesture.Pan()
  .onUpdate((e) => {
    "worklet";
    translateX.value = position.x * SIZE + e.translationX;
    translateY.value = position.y * SIZE + e.translationY;
  })
  .onEnd(() => {
    "worklet";
    const from = positionToSquare(position.x * SIZE, position.y * SIZE);
    const to = positionToSquare(translateX.value, translateY.value);
    const move = `${from}${to}`;
    const newX = Math.round(translateX.value / SIZE);
    const newY = Math.round(translateY.value / SIZE);
    runOnJS(handleMoveEnd)(move, newX, newY);
  });


  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute",
    width: SIZE,
    height: SIZE,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <Image source={PIECES[id]} style={styles.piece} />
      </Animated.View>
    </GestureDetector>
  );
};

export default Piece;

const styles = StyleSheet.create({
  piece: {
    width: SIZE,
    height: SIZE,
  },
});

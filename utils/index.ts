import { ImageSourcePropType } from "react-native";

type Player = "b" | "w";
type Type = "q" | "r" | "n" | "b" | "k" | "p"| "Q" | "R" | "N" | "B" | "K" | "P";
type Piece = `${Type}`;
type Pieces = Record<Piece, ImageSourcePropType>;

 export const PIECES: Pieces = {
  r: require("../assets/img/br.png"),
  p: require("../assets/img/bp.png"),
n: require("../assets/img/bn.png"),
  b: require("../assets/img/bb.png"),
  q: require("../assets/img/bq.png"),
  k: require("../assets/img/bk.png"),
  R: require("../assets/img/wr.png"),
  N: require("../assets/img/wn.png"),
  B: require("../assets/img/wb.png"),
  Q: require("../assets/img/wq.png"),
  K: require("../assets/img/wk.png"),
  P: require("../assets/img/wp.png"),
};

export function positionToSquare(x: number, y: number) {
  const col = String.fromCharCode(97 + x); // 'a' + x
  const row = 8 - y; // Y=0 is row 8
  return `${col}${row}`;
}

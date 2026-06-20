import { Dimensions, StyleSheet, View, Alert, TouchableOpacity, Image } from 'react-native';
import React, { useState, useCallback } from 'react';
import Background from '../Background';
import NativeChessModule from '../../specs/NativeChessModule';
import Piece, { SIZE } from '../pieces';
import MoveHighlights from '../MoveHighlights';
import { CHECK_STATUS, PIECE_COLOR } from '../../helper';
import { PIECES } from '../../utils';
import { SelectionProvider, useSelection } from '../../context';

const { width } = Dimensions.get('window');

function BoardInner() {
  const [board, setBoard] = useState<string[][]>(() => NativeChessModule.getBoard());
  const [turn, setTurn] = useState<PIECE_COLOR>(() => NativeChessModule.getTurn() as PIECE_COLOR);

  const { selectedSquare, clearSelection, promotionSquares, setPendingMoveTarget } = useSelection();

  const refreshBoard = useCallback(() => {
    setBoard(NativeChessModule.getBoard());
    setTurn(NativeChessModule.getTurn() as PIECE_COLOR);
  }, []);

  const [pendingPromotion, setPendingPromotion] = useState<{
    move: string;
  } | null>(null);

  const finishPromotion = useCallback(async (piece: string) => {
    if (!pendingPromotion) return;
    const result = await NativeChessModule.makeMove(pendingPromotion.move + piece);
    if (result === CHECK_STATUS.valid || result === CHECK_STATUS.checkmate || result === CHECK_STATUS.check) {
      refreshBoard();
      if (result === CHECK_STATUS.checkmate) {
        Alert.alert(CHECK_STATUS.checkmate);
      }
    }
    setPendingPromotion(null);
  }, [pendingPromotion, refreshBoard]);

  const handleSquareTap = useCallback((toSquare: string) => {
    if (!selectedSquare) return;

    if (promotionSquares.has(toSquare)) {
      clearSelection();
      setPendingPromotion({ move: `${selectedSquare}${toSquare}` });
      return;
    }


    setPendingMoveTarget(toSquare);
  }, [selectedSquare, clearSelection, promotionSquares, setPendingMoveTarget]);

  return (
    <View style={styles.container}>
      <Background />
      <MoveHighlights onSquareTap={handleSquareTap} currentTurn={turn} board={board} />
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
      {pendingPromotion && (
        <View style={styles.promoModal}>
          {['q', 'r', 'b', 'n'].map(p => {
            const isWhitePromo = turn === PIECE_COLOR.white;
            const pieceKey = isWhitePromo
              ? (p.toUpperCase() as keyof typeof PIECES)
              : (p as keyof typeof PIECES);
            return (
              <TouchableOpacity
                key={p}
                style={styles.promoButton}
                onPress={() => finishPromotion(p)}
              >
                <Image source={PIECES[pieceKey]} style={{ width: 50, height: 50 }} />
              </TouchableOpacity>
            );
          })}
        </View>
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
  promoModal: {
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
  promoButton: {
    padding: 10,
    marginHorizontal: 4,
    backgroundColor: '#eee',
    borderRadius: 5,
    alignItems: 'center',
  },
});

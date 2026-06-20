import {
  Dimensions,
  StyleSheet,
  View,
  Alert,
  TouchableOpacity,
  Image,
  Text,
} from 'react-native';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Background from '../Background';
import NativeChessModule from '../../specs/NativeChessModule';
import Piece from '../pieces';
import MoveHighlights from '../MoveHighlights';
import { CHECK_STATUS, PIECE_COLOR } from '../../helper';
import { PIECES } from '../../utils';
import { SelectionProvider, useSelection } from '../../context';
import Clock from '../clock';
import { BoardProps } from '../../interface';

const { width } = Dimensions.get('window');

const COMPUTER_DEPTH = 4;

function BoardInner({ gameMode, onBack }: BoardProps) {
  const [board, setBoard] = useState<string[][]>(() => NativeChessModule.getBoard());
  const [turn, setTurn]   = useState<PIECE_COLOR>(() => NativeChessModule.getTurn() as PIECE_COLOR);
  const [timerTick, setTimerTick] = useState(0);
  const [isComputerThinking, setIsComputerThinking] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { selectedSquare, clearSelection, promotionSquares, setPendingMoveTarget } = useSelection();

  const refreshBoard = useCallback(() => {
    setBoard(NativeChessModule.getBoard());
    setTurn(NativeChessModule.getTurn() as PIECE_COLOR);
  }, []);

  const [pendingPromotion, setPendingPromotion] = useState<{ move: string } | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const activeWhite = turn === PIECE_COLOR.white;
      const stillHasTime = NativeChessModule.tick(activeWhite);
      setTimerTick(prev => prev + 1);
      if (!stillHasTime) {
        clearInterval(intervalRef.current!);
        const winner = activeWhite ? PIECE_COLOR.black : PIECE_COLOR.white;
        Alert.alert('Time', `${winner} wins on time!`);
      }
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [turn]);

  useEffect(() => {
    if (gameMode !== 'computer') return;
    if (turn !== PIECE_COLOR.black) return;
    if (isComputerThinking) return;

    setIsComputerThinking(true);

    const timeout = setTimeout(async () => {
      const bestMove = NativeChessModule.getBestMove(false, COMPUTER_DEPTH);
      if (bestMove) {
        const result = await NativeChessModule.makeMove(bestMove);
        if (result === CHECK_STATUS.checkmate) {
          refreshBoard();
          Alert.alert('Checkmate', 'Computer wins!');
        } else {
          refreshBoard();
        }
      }
      setIsComputerThinking(false);
    }, 50);

    return () => clearTimeout(timeout);
  }, [turn, gameMode, isComputerThinking, refreshBoard]);

  const finishPromotion = useCallback(async (piece: string) => {
    if (!pendingPromotion) return;
    const result = await NativeChessModule.makeMove(pendingPromotion.move + piece);
    if (
      result === CHECK_STATUS.valid ||
      result === CHECK_STATUS.checkmate ||
      result === CHECK_STATUS.check
    ) {
      refreshBoard();
      if (result === CHECK_STATUS.checkmate) Alert.alert('Checkmate');
    }
    setPendingPromotion(null);
  }, [pendingPromotion, refreshBoard]);

  const whiteTime  = NativeChessModule.getWhiteTime();
  const blackTime  = NativeChessModule.getBlackTime();
  const isWhiteTurn = turn === PIECE_COLOR.white;

  const handleSquareTap = useCallback((toSquare: string) => {
    if (!selectedSquare) return;
    if (promotionSquares.has(toSquare)) {
      clearSelection();
      setPendingPromotion({ move: `${selectedSquare}${toSquare}` });
      return;
    }
    setPendingMoveTarget(toSquare);
  }, [selectedSquare, clearSelection, promotionSquares, setPendingMoveTarget]);

  const resetGame = useCallback(() => {
    NativeChessModule.reset();
    setIsComputerThinking(false);
    refreshBoard();
  }, [refreshBoard]);

  const humanTurn =
    gameMode === 'computer'
      ? turn === PIECE_COLOR.white && !isComputerThinking
      : true;

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {gameMode === 'computer' ? 'vs Computer' : 'vs Player'}
          </Text>
          {isComputerThinking && (
            <Text style={styles.thinkingLabel}>thinking…</Text>
          )}
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={resetGame}>
          <Text style={styles.resetIconText}>↺</Text>
        </TouchableOpacity>
      </View>

      <Clock
        label="Black"
        seconds={blackTime}
        isActive={!isWhiteTurn}
        isLow={blackTime <= 30}
      />

      <View style={styles.boardContainer}>
        <Background />
        <MoveHighlights
          onSquareTap={handleSquareTap}
          currentTurn={humanTurn ? turn : (null as any)}
          board={board}
        />
        {board.map((row, y) =>
          row.map((piece, x) => {
            if (!piece) return null;
            return (
              <Piece
                key={`${piece}-${x}-${y}`}
                position={{ x, y }}
                id={piece as any}
                currentTurn={humanTurn ? turn : (null as any)}
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

      <Clock
        label="White"
        seconds={whiteTime}
        isActive={isWhiteTurn}
        isLow={whiteTime <= 30}
      />
    </View>
  );
}

export default function Board({ gameMode, onBack }: BoardProps) {
  return (
    <SelectionProvider>
      <BoardInner gameMode={gameMode} onBack={onBack} />
    </SelectionProvider>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width,
    alignItems: 'stretch',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 2,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2b2a27',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3936',
  },
  backIcon: {
    color: '#f0d9b5',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  resetIconText: {
    color: '#f0d9b5',
    fontSize: 20,
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#f0d9b5',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  thinkingLabel: {
    color: '#c9a84c',
    fontSize: 11,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  boardContainer: {
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

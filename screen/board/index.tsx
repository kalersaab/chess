import {
  Dimensions,
  StyleSheet,
  View,
  Alert,
  TouchableOpacity,
  Image,
  Text,
  TextInput,
  Modal,
  ScrollView,
  InteractionManager,
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
const CELL_SIZE = width / 8;
const COMPUTER_DEPTH = 4;

const squareToStyle = (sq: string) => {
  const x = sq.charCodeAt(0) - 97;
  const y = 8 - parseInt(sq[1], 10);
  return { left: x * CELL_SIZE, top: y * CELL_SIZE };
};

interface AiHighlightProps {
  lastAiMove: { from: string; to: string } | null;
}
const AiMoveHighlight = ({ lastAiMove }: AiHighlightProps) => {
  if (!lastAiMove) return null;
  return (
    <>
      <View pointerEvents="none" style={[styles.aiHighlight, squareToStyle(lastAiMove.from)]} />
      <View pointerEvents="none" style={[styles.aiHighlight, squareToStyle(lastAiMove.to)]} />
    </>
  );
};

// Parses the move list out of a PGN string into pairs: [['e2e4','e7e5'], ...]
function parsePgnMoves(pgn: string): string[] {
  const body = pgn.replace(/\[.*?\]\n?/g, '').trim();
  const tokens = body.split(/\s+/).filter(t => t && !/^\d+\./.test(t) && !/^[*10-]/.test(t));
  return tokens;
}

interface MoveTableProps {
  moves: string[];
  currentMoveIdx: number;
  onMovePress: (index: number) => void;
}
const MoveTable = ({ moves, currentMoveIdx, onMovePress }: MoveTableProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const pairs: [string, string | null][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push([moves[i], moves[i + 1] ?? null]);
  }

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [moves.length]);

  if (pairs.length === 0) return null;

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.moveScroll}
      contentContainerStyle={styles.moveScrollContent}
    >
      {pairs.map(([white, black], idx) => {
        const whiteIdx = idx * 2;
        const blackIdx = idx * 2 + 1;
        return (
          <View key={idx} style={styles.movePair}>
            <Text style={styles.moveNum}>{idx + 1}.</Text>
            <TouchableOpacity onPress={() => onMovePress(whiteIdx)}>
              <Text style={[styles.moveToken, whiteIdx === currentMoveIdx && styles.moveTokenActive]}>
                {white}
              </Text>
            </TouchableOpacity>
            {black && (
              <TouchableOpacity onPress={() => onMovePress(blackIdx)}>
                <Text style={[styles.moveToken, blackIdx === currentMoveIdx && styles.moveTokenActive]}>
                  {black}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

function BoardInner({ gameMode, onBack }: BoardProps) {
  const [board, setBoard] = useState<string[][]>(() => NativeChessModule.getBoard());
  const [turn, setTurn] = useState<PIECE_COLOR>(() => NativeChessModule.getTurn() as PIECE_COLOR);
  const [isComputerThinking, setIsComputerThinking] = useState(false);
  const [lastAiMove, setLastAiMove] = useState<{ from: string; to: string } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [moves, setMoves] = useState<string[]>([]);
  const [currentMoveIdx, setCurrentMoveIdx] = useState(-1);
  const [showFenModal, setShowFenModal] = useState(false);
  const [fenInput, setFenInput] = useState('');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { selectedSquare, clearSelection, promotionSquares, setPendingMoveTarget } = useSelection();
  const [pendingPromotion, setPendingPromotion] = useState<{ move: string } | null>(null);

  const refreshBoard = useCallback((isCheckmate = false) => {
    setBoard(NativeChessModule.getBoard());
    setTurn(NativeChessModule.getTurn() as PIECE_COLOR);
    const parsed = parsePgnMoves(NativeChessModule.getPGN());
    setMoves(parsed);
    setCurrentMoveIdx(parsed.length - 1);
    if (isCheckmate) setGameOver(true);
  }, []);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isComputerThinking) return;

    intervalRef.current = setInterval(() => {
      const activeWhite = turn === PIECE_COLOR.white;
      const stillHasTime = NativeChessModule.tick(activeWhite);
      if (!stillHasTime) {
        clearInterval(intervalRef.current!);
        const winner = activeWhite ? PIECE_COLOR.black : PIECE_COLOR.white;
        Alert.alert('Time', `${winner} wins on time!`);
      }
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [turn, isComputerThinking]);

  useEffect(() => {
    if (gameMode !== 'computer') return;
    if (turn !== PIECE_COLOR.black) return;
    if (isComputerThinking || gameOver) return;

    setIsComputerThinking(true);

    const task = InteractionManager.runAfterInteractions(async () => {
      try {
        const bestMove = await NativeChessModule.getBestMove(false, COMPUTER_DEPTH);
        if (bestMove) {
          const result = await NativeChessModule.makeMove(bestMove);
          setLastAiMove({ from: bestMove.slice(0, 2), to: bestMove.slice(2, 4) });
          if (result === CHECK_STATUS.checkmate) {
            refreshBoard();
            setGameOver(true);
            Alert.alert('Checkmate', 'Computer wins!');
          } else {
            refreshBoard();
          }
        }
      } catch (_) {}
      setIsComputerThinking(false);
    });

    return () => task.cancel();
  }, [turn, gameMode, isComputerThinking, gameOver, refreshBoard]);

  const finishPromotion = useCallback(async (piece: string) => {
    if (!pendingPromotion) return;
    const result = await NativeChessModule.makeMove(pendingPromotion.move + piece);
    if (result === CHECK_STATUS.valid || result === CHECK_STATUS.checkmate || result === CHECK_STATUS.check) {
      refreshBoard();
      if (result === CHECK_STATUS.checkmate) Alert.alert('Checkmate');
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

  const resetGame = useCallback(() => {
    setIsComputerThinking(false);
    setLastAiMove(null);
    setGameOver(false);
    setMoves([]);
    setCurrentMoveIdx(-1);
    NativeChessModule.reset();
    refreshBoard();
  }, [refreshBoard]);

  const handleMovePress = useCallback((index: number) => {
    const ok = NativeChessModule.goToMove(index);
    if (ok) {
      setBoard(NativeChessModule.getBoard());
      setTurn(NativeChessModule.getTurn() as PIECE_COLOR);
      setCurrentMoveIdx(index);
      setLastAiMove(null);
    }
  }, []);

  const handleBack = useCallback(() => {
    Alert.alert(
      'Quit game',
      'Are you sure you want to go back? The current game will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Quit', style: 'destructive', onPress: () => { resetGame(); onBack(); } },
      ],
    );
  }, [resetGame, onBack]);

  const handleLoadFen = useCallback(() => {
    const input = fenInput.trim();
    if (!input) return;

    // Detect PGN vs FEN: PGN contains move numbers or header tags
    const isPgn = /\d+\./.test(input) || input.startsWith('[');
    const ok = isPgn
      ? NativeChessModule.loadPGN(input)
      : NativeChessModule.loadFEN(input);

    if (ok) {
      setLastAiMove(null);
      setGameOver(false);
      setFenInput('');
      setShowFenModal(false);
      refreshBoard();
    } else {
      Alert.alert(
        isPgn ? 'Invalid PGN' : 'Invalid FEN',
        isPgn ? 'Could not parse that PGN string. Check the moves are valid.' : 'Could not parse that FEN string.',
      );
    }
  }, [fenInput, refreshBoard]);

  const whiteTime = NativeChessModule.getWhiteTime();
  const blackTime = NativeChessModule.getBlackTime();
  const isWhiteTurn = turn === PIECE_COLOR.white;
  const humanTurn = gameMode === 'computer' ? turn === PIECE_COLOR.white && !isComputerThinking : true;

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerBtn} onPress={handleBack}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {gameMode === 'computer' ? 'vs Computer' : 'vs Player'}
          </Text>
          {isComputerThinking && <Text style={styles.thinkingLabel}>thinking…</Text>}
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => { setFenInput(''); setShowFenModal(true); }}>
          <Text style={styles.resetIconText}>⊞</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.headerBtn, { marginLeft: 6 }]} onPress={resetGame}>
          <Text style={styles.resetIconText}>↺</Text>
        </TouchableOpacity>
      </View>

      {/* Black clock + moves above board */}
      <Clock label="Black" seconds={blackTime} isActive={!isWhiteTurn} isLow={blackTime <= 30} />
      <MoveTable moves={moves} currentMoveIdx={currentMoveIdx} onMovePress={handleMovePress} />

      {/* Board */}
      <View style={styles.boardContainer}>
        <Background />
        <AiMoveHighlight lastAiMove={lastAiMove} />
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
              const pieceKey = isWhitePromo ? (p.toUpperCase() as keyof typeof PIECES) : (p as keyof typeof PIECES);
              return (
                <TouchableOpacity key={p} style={styles.promoButton} onPress={() => finishPromotion(p)}>
                  <Image source={PIECES[pieceKey]} style={{ width: 50, height: 50 }} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* White clock below board */}
      <Clock label="White" seconds={whiteTime} isActive={isWhiteTurn} isLow={whiteTime <= 30} />

      {/* FEN load modal */}
      <Modal visible={showFenModal} transparent animationType="fade" onRequestClose={() => setShowFenModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Load FEN / PGN</Text>
            <Text style={styles.modalSub}>Paste a FEN string or a full PGN game</Text>
            <TextInput
              style={styles.fenInput}
              value={fenInput}
              onChangeText={setFenInput}
              placeholder={'FEN: rnbqkbnr/8/... or\nPGN: 1.e4 e5 2.Nf3 ...'}
              placeholderTextColor="#555"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={() => setShowFenModal(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={handleLoadFen}>
                <Text style={styles.modalBtnText}>Load</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 18,
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
  // Move list (chess.com style horizontal strip)
  moveScroll: {
    backgroundColor: '#1e1d1b',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2e2d2a',
    maxHeight: 36,
  },
  moveScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  movePair: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  moveNum: {
    color: '#666',
    fontSize: 12,
    marginRight: 3,
    fontVariant: ['tabular-nums'],
  },
  moveToken: {
    color: '#b0a898',
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginRight: 2,
    borderRadius: 3,
  },
  moveTokenActive: {
    backgroundColor: '#4a7c59',
    color: '#fff',
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
  aiHighlight: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: 'rgba(255, 210, 0, 0.35)',
    zIndex: 10,
  },
  // FEN modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#2b2a27',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3a3936',
  },
  modalTitle: {
    color: '#f0d9b5',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSub: {
    color: '#888',
    fontSize: 13,
    marginBottom: 14,
  },
  fenInput: {
    backgroundColor: '#1a1918',
    color: '#f0d9b5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3936',
    padding: 10,
    fontSize: 12,
    fontFamily: 'monospace',
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    backgroundColor: '#4a7c59',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalBtnSecondary: {
    backgroundColor: '#3a3936',
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});

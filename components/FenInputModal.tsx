import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from 'react-native';

interface FenInputModalProps {
  visible: boolean;
  onClose: () => void;
  onLoadFen: (fen: string | undefined, pgn?: string) => void;
  fenInput: string;
  setFenInput: (fen: string) => void;
}

export const FenInputModal: React.FC<FenInputModalProps> = ({
  visible,
  onClose,
  onLoadFen,
  fenInput,
  setFenInput,
}) => {
  const validateFEN = (fen: string): boolean => {
    if (!fen || fen.trim() === '') return false;

    const parts = fen.trim().split(' ');
    if (parts.length < 1) return false;

    const position = parts[0];
    const ranks = position.split('/');

    if (ranks.length !== 8) return false;

    for (const rank of ranks) {
      let squares = 0;
      for (const char of rank) {
        if (/[1-8]/.test(char)) {
          squares += parseInt(char);
        } else if (/[pnbrqkPNBRQK]/.test(char)) {
          squares += 1;
        } else {
          return false;
        }
      }
      if (squares !== 8) return false;
    }

    return true;
  };

  const parseInput = (input: string): { fen?: string; pgn?: string } => {
    const trimmed = input.trim();
    
    // Check if input contains PGN (has move numbers like "1." or "[Event")
    const hasPgnMoves = /\d+\./.test(trimmed) || trimmed.startsWith('[');
    
    // Check if input contains FEN (has slashes for ranks)
    const hasFen = trimmed.includes('/');
    
    if (hasFen && hasPgnMoves) {
      // Input has both FEN and PGN - split them
      const lines = trimmed.split('\n');
      let fenPart = '';
      let pgnPart = '';
      
      for (const line of lines) {
        if (line.includes('/') && !fenPart) {
          fenPart = line.trim();
        } else if (/\d+\./.test(line)) {
          pgnPart += line + ' ';
        }
      }
      
      // If multiline didn't work, try to find where PGN starts
      if (!fenPart || !pgnPart) {
        const parts = trimmed.split(/\s+/);
        const fenEndIndex = parts.findIndex((part, idx) => 
          idx > 0 && /\d+\./.test(part)
        );
        
        if (fenEndIndex > 0) {
          fenPart = parts.slice(0, fenEndIndex).join(' ');
          pgnPart = parts.slice(fenEndIndex).join(' ');
        }
      }
      
      return { fen: fenPart, pgn: pgnPart.trim() };
    } else if (hasFen) {
      // Only FEN
      return { fen: trimmed, pgn: undefined };
    } else if (hasPgnMoves) {
      // Only PGN - use starting position
      return { fen: undefined, pgn: trimmed };
    }
    
    return {};
  };

  const handleLoad = () => {
    const { fen, pgn } = parseInput(fenInput);

    if (!fen && !pgn) {
      Alert.alert(
        'Invalid Input',
        'Please enter FEN, PGN, or both.\n\nExamples:\n• FEN: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR\n• PGN: 1. e4 e5 2. Nf3\n• Both:\nrnbqkbnr/... w KQkq - 0 1\n1. e4 e5',
        [{ text: 'OK' }]
      );
      return;
    }

    // Validate FEN if provided
    if (fen && !validateFEN(fen)) {
      Alert.alert(
        'Invalid FEN',
        'The FEN notation is not valid. Please check the format.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Complete the FEN if only position is provided
    let completeFen = fen;
    if (fen) {
      const parts = fen.split(' ');
      
      if (parts.length === 1) {
        completeFen = `${fen} w KQkq - 0 1`;
      } else if (parts.length < 6) {
        const defaults = ['w', 'KQkq', '-', '0', '1'];
        for (let i = parts.length; i < 6; i++) {
          parts.push(defaults[i - 1]);
        }
        completeFen = parts.join(' ');
      }
    }

    onLoadFen(completeFen, pgn);
  };

  const handleClose = () => {
    setFenInput('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Load Position & Moves</Text>
          <Text style={styles.modalSubtitle}>
            Enter FEN, PGN, or both (FEN on first line, PGN moves after)
          </Text>
          
          <TextInput
            style={styles.fenInput}
            placeholder={'FEN: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1\nPGN: 1. e4 e5 2. Nf3 Nc6'}
            placeholderTextColor="#666"
            value={fenInput}
            onChangeText={setFenInput}
            multiline
            numberOfLines={6}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <View style={styles.fenModalButtonsContainer}>
            <TouchableOpacity
              style={[styles.fenModalButton, styles.fenLoadButton]}
              onPress={handleLoad}
            >
              <Text style={styles.fenLoadButtonText}>Load Position</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fenModalButton, styles.modalCloseButton]}
              onPress={handleClose}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#2b2a27',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#444',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f0d9b5',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
    textAlign: 'center',
  },
  fenInput: {
    backgroundColor: '#1a1a18',
    borderRadius: 8,
    padding: 12,
    color: '#f0d9b5',
    fontSize: 13,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#6d5ca6',
    marginBottom: 16,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
  },
  fenModalButtonsContainer: {
    gap: 10,
  },
  fenModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  fenLoadButton: {
    backgroundColor: '#6d5ca6',
  },
  fenLoadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalCloseButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#444',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ccc',
  },
});

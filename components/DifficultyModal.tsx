import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { DifficultyLevel, DIFFICULTY_LEVELS } from '../utils';

interface DifficultyModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDifficulty: (difficulty: DifficultyLevel) => void;
}

export const DifficultyModal: React.FC<DifficultyModalProps> = ({
  visible,
  onClose,
  onSelectDifficulty,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Select Difficulty</Text>
          <Text style={styles.modalSubtitle}>
            Choose how strong you want the computer to be
          </Text>
          <View style={styles.difficultyButtonsContainer}>
            {(['easy', 'normal', 'hard'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[styles.difficultyButton, styles[`difficulty_${level}`]]}
                onPress={() => onSelectDifficulty(level)}
                activeOpacity={0.8}
              >
                <Text style={styles.difficultyButtonText}>
                  {DIFFICULTY_LEVELS[level].label}
                </Text>
                <Text style={styles.difficultyButtonDepth}>
                  (Depth {DIFFICULTY_LEVELS[level].depth})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseButtonText}>Cancel</Text>
          </TouchableOpacity>
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
  difficultyButtonsContainer: {
    marginBottom: 16,
    gap: 12,
  },
  difficultyButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
  },
  difficulty_easy: {
    backgroundColor: '#1a3a2a',
    borderColor: '#4a7c59',
  },
  difficulty_normal: {
    backgroundColor: '#3a3020',
    borderColor: '#c9a84c',
  },
  difficulty_hard: {
    backgroundColor: '#3a1a1a',
    borderColor: '#d64545',
  },
  difficultyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f0d9b5',
  },
  difficultyButtonDepth: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
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

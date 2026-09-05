import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PIECES, BOARD_SIZE, DifficultyLevel, DIFFICULTY_LEVELS } from '../../utils';
import { RootStackParamList } from '../../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_WIDTH = Math.min(SCREEN_WIDTH - 40, 520);

export type { GameMode } from '../../utils';

const ModeCard = ({
  title,
  subtitle,
  icon,
  onPress,
  accent,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
  accent: string;
}) => (
  <TouchableOpacity
    style={[styles.card, { borderColor: accent }]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <View style={[styles.cardIcon, { backgroundColor: accent + '22' }]}>
      {icon}
    </View>
    <View style={styles.cardText}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </View>
    <View style={[styles.cardArrow, { backgroundColor: accent }]}>
      <Text style={styles.arrowText}>›</Text>
    </View>
  </TouchableOpacity>
);

export default function HomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);

  const handleComputerPress = () => {
    setShowDifficultyModal(true);
  };

  const handleDifficultySelect = (difficulty: DifficultyLevel) => {
    setShowDifficultyModal(false);
    navigation.navigate('BoardColor', { gameMode: 'computer', difficulty });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image source={PIECES['K']} style={styles.logoKing} />
          <Image source={PIECES['k']} style={styles.logoKing} />
        </View>
        <Text style={styles.title}>Chess</Text>
        <Text style={styles.tagline}>Make your move</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Choose your game</Text>

        <ModeCard
          title="Play with Player"
          subtitle="Two players on this device"
          accent="#4a7c59"
          icon={
            <View style={styles.iconRow}>
              <View style={[styles.playerDot, styles.playerDotWhite]} />
              <Text style={styles.iconVs}>vs</Text>
              <View style={[styles.playerDot, styles.playerDotBlack]} />
            </View>
          }
          onPress={() => navigation.navigate('BoardColor', { gameMode: 'players' })}
        />

        <ModeCard
          title="Play with Computer"
          subtitle="Challenge the engine"
          accent="#c9a84c"
          icon={
            <View style={styles.iconRow}>
              <View style={[styles.playerDot, styles.playerDotWhite]} />
              <Text style={styles.iconVs}>vs</Text>
              <Text style={styles.cpuIcon}>🤖</Text>
            </View>
          }
          onPress={handleComputerPress}
        />
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => {
            console.log('Navigating to Privacy Policy...');
            navigation.navigate('PrivacyPolicy');
          }}
          style={styles.privacyButton}
          activeOpacity={0.7}
        >
          <Text style={styles.privacyText}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.boardPreview}>
        {Array.from({ length: 8 }).map((_, row) => (
          <View key={row} style={styles.boardRow}>
            {Array.from({ length: 8 }).map((__, col) => (
              <View
                key={col}
                style={[
                  styles.boardCell,
                  (row + col) % 2 === 0 ? styles.lightCell : styles.darkCell,
                ]}
              />
            ))}
          </View>
        ))}
      </View>

      <Modal
        visible={showDifficultyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDifficultyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Difficulty</Text>
            <Text style={styles.modalSubtitle}>Choose how strong you want the computer to be</Text>
            <View style={styles.difficultyButtonsContainer}>
              {(['easy', 'normal', 'hard'] as const).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.difficultyButton, styles[`difficulty_${level}`]]}
                  onPress={() => handleDifficultySelect(level)}
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
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDifficultyModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const CARD_WIDTH = CONTENT_WIDTH;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(36, 35, 32)',
    alignItems: 'center',
  },

  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 36,
  },
  logoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  logoKing: {
    width: 52,
    height: 52,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#f0d9b5',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  tagline: {
    marginTop: 6,
    fontSize: 14,
    color: '#888',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  section: {
    width: CARD_WIDTH,
    marginBottom: 32,
  },
  sectionLabel: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2b2a27',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    color: '#f0d9b5',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
  },
  cardSubtitle: {
    color: '#888',
    fontSize: 13,
  },
  cardArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },

  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  playerDotWhite: {
    backgroundColor: '#fff',
    borderColor: '#aaa',
  },
  playerDotBlack: {
    backgroundColor: '#1a1a1a',
    borderColor: '#555',
  },
  iconVs: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    marginHorizontal: 2,
  },
  cpuIcon: {
    fontSize: 18,
  },

  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  privacyButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  privacyText: {
    color: '#888',
    fontSize: 12,
    textDecorationLine: 'underline',
  },

  boardPreview: {
    position: 'absolute',
    bottom: 0,
    opacity: 0.06,
    flexDirection: 'column',
  },
  boardRow: {
    flexDirection: 'row',
  },
  boardCell: {
    width: BOARD_SIZE / 8,
    height: BOARD_SIZE / 8,
  },
  lightCell: {
    backgroundColor: '#f0d9b5',
  },
  darkCell: {
    backgroundColor: '#b58863',
  },
  
  // Modal styles
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


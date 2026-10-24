import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PIECES, BOARD_SIZE, DifficultyLevel } from '../../utils';
import { RootStackParamList } from '../../navigation/types';
import {
  ModeCard,
  DifficultyModal,
  FenInputModal,
  PlayerVsPlayerIcon,
  PlayerVsComputerIcon,
  FenIcon,
} from '../../components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_WIDTH = Math.min(SCREEN_WIDTH - 40, 520);

export type { GameMode } from '../../utils';

export default function HomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showFenModal, setShowFenModal] = useState(false);
  const [fenInput, setFenInput] = useState('');

  const handleComputerPress = () => {
    setShowDifficultyModal(true);
  };

  const handleDifficultySelect = (difficulty: DifficultyLevel) => {
    setShowDifficultyModal(false);
    navigation.navigate('BoardColor', { gameMode: 'computer', difficulty });
  };

  const handleFenPress = () => {
    setShowFenModal(true);
  };

  const handleFenLoad = (fen: string | undefined, pgn?: string) => {
    setShowFenModal(false);
    setFenInput('');
    // Skip BoardColor and go directly to Game in review mode
    navigation.navigate('Game', { 
      gameMode: 'players', 
      fen,
      pgn,
      boardColorTheme: 'classic' // Use default theme for FEN review
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
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
          icon={<PlayerVsPlayerIcon />}
          onPress={() => navigation.navigate('BoardColor', { gameMode: 'players' })}
        />

        <ModeCard
          title="Play with Computer"
          subtitle="Challenge the engine"
          accent="#c9a84c"
          icon={<PlayerVsComputerIcon />}
          onPress={handleComputerPress}
        />

        <ModeCard
          title="Load FEN Position"
          subtitle="Start from custom position"
          accent="#6d5ca6"
          icon={<FenIcon />}
          onPress={handleFenPress}
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

      <DifficultyModal
        visible={showDifficultyModal}
        onClose={() => setShowDifficultyModal(false)}
        onSelectDifficulty={handleDifficultySelect}
      />

      <FenInputModal
        visible={showFenModal}
        onClose={() => setShowFenModal(false)}
        onLoadFen={handleFenLoad}
        fenInput={fenInput}
        setFenInput={setFenInput}
      />
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
    pointerEvents: 'none', // Allow touches to pass through
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
});


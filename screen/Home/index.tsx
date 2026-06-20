import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { PIECES } from '../../utils';

const { width } = Dimensions.get('window');

export type GameMode = 'players' | 'computer';

interface HomeScreenProps {
  onStart: (mode: GameMode) => void;
}

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

export default function HomeScreen({ onStart }: HomeScreenProps) {
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
          onPress={() => onStart('players')}
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
          onPress={() => onStart('computer')}
        />
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
    </View>
  );
}

const CARD_WIDTH = width - 40;

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
    width: width / 8,
    height: width / 8,
  },
  lightCell: {
    backgroundColor: '#f0d9b5',
  },
  darkCell: {
    backgroundColor: '#b58863',
  },
});

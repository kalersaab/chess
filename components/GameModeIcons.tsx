import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const PlayerVsPlayerIcon: React.FC = () => (
  <View style={styles.iconRow}>
    <View style={[styles.playerDot, styles.playerDotWhite]} />
    <Text style={styles.iconVs}>vs</Text>
    <View style={[styles.playerDot, styles.playerDotBlack]} />
  </View>
);

export const PlayerVsComputerIcon: React.FC = () => (
  <View style={styles.iconRow}>
    <View style={[styles.playerDot, styles.playerDotWhite]} />
    <Text style={styles.iconVs}>vs</Text>
    <Text style={styles.cpuIcon}>🤖</Text>
  </View>
);

export const FenIcon: React.FC = () => (
  <Text style={styles.fenIcon}>♔</Text>
);

const styles = StyleSheet.create({
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
  fenIcon: {
    fontSize: 28,
    color: '#6d5ca6',
  },
});

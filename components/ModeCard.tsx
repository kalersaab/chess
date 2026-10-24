import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ModeCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
  accent: string;
}

export const ModeCard: React.FC<ModeCardProps> = ({
  title,
  subtitle,
  icon,
  onPress,
  accent,
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

const styles = StyleSheet.create({
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
});

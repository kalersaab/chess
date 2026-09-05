import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { saveBoardColor, loadBoardColor } from '../../utils/storage';
import { useBoardColor } from '../../context/BoardColorContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_WIDTH = Math.min(SCREEN_WIDTH - 40, 520);

export type BoardColorTheme = 'classic' | 'forest' | 'midnight' | 'sunset' | 'ocean';

export interface BoardColorConfig {
  lightColor: string;
  darkColor: string;
  highlightColor?: string;
  accentColor: string;
}

export const BOARD_COLOR_THEMES: Record<BoardColorTheme, BoardColorConfig> = {
  classic: {
    lightColor: '#f0d9b5',
    darkColor: '#b58863',
    highlightColor: '#baca44',
    accentColor: '#c9a84c',
  },
  forest: {
    lightColor: '#c8e6c9',
    darkColor: '#558b2f',
    highlightColor: '#9ccc65',
    accentColor: '#7cb342',
  },
  midnight: {
    lightColor: '#e8eaf6',
    darkColor: '#3f51b5',
    highlightColor: '#5c6bc0',
    accentColor: '#5c6bc0',
  },
  sunset: {
    lightColor: '#ffe0b2',
    darkColor: '#ff6f00',
    highlightColor: '#ff9100',
    accentColor: '#ff6f00',
  },
  ocean: {
    lightColor: '#b3e5fc',
    darkColor: '#0277bd',
    highlightColor: '#01579b',
    accentColor: '#0277bd',
  },
};

interface ColorThemeCardProps {
  theme: BoardColorTheme;
  config: BoardColorConfig;
  isSelected: boolean;
  onPress: () => void;
}

const ColorThemeCard = ({ theme, config, isSelected, onPress }: ColorThemeCardProps) => (
  <TouchableOpacity
    style={[
      styles.themeCard,
      isSelected && { borderColor: config.accentColor, borderWidth: 3 },
    ]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.boardPreview}>
      {Array.from({ length: 8 }).map((_, row) => (
        <View key={row} style={styles.previewRow}>
          {Array.from({ length: 8 }).map((__, col) => (
            <View
              key={col}
              style={[
                styles.previewCell,
                (row + col) % 2 === 0
                  ? { backgroundColor: config.lightColor }
                  : { backgroundColor: config.darkColor },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
    <Text style={[styles.themeName, { color: config.accentColor }]}>
      {theme.charAt(0).toUpperCase() + theme.slice(1)}
    </Text>
    {isSelected && (
      <View style={[styles.checkmark, { backgroundColor: config.accentColor }]}>
        <Text style={styles.checkmarkText}>✓</Text>
      </View>
    )}
  </TouchableOpacity>
);

export default function BoardColorScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'BoardColor'>) {
  const { gameMode, difficulty } = route.params;
  const { boardColorTheme: contextTheme, setBoardColorTheme } = useBoardColor();
  const [selectedTheme, setSelectedTheme] = useState<BoardColorTheme>(contextTheme);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBoardColor().then(theme => {
      setSelectedTheme(theme);
      setIsLoading(false);
    });
  }, []);

  const handleContinue = async () => {
    await saveBoardColor(selectedTheme);
    setBoardColorTheme(selectedTheme);
    navigation.navigate('Game', {
      gameMode,
      difficulty,
      boardColorTheme: selectedTheme,
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#f0d9b5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Board Color</Text>
          <Text style={styles.subtitle}>Customize your board appearance</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.themesContainer}>
          {(Object.entries(BOARD_COLOR_THEMES) as [BoardColorTheme, BoardColorConfig][]).map(
            ([theme, config]) => (
              <ColorThemeCard
                key={theme}
                theme={theme}
                config={config}
                isSelected={selectedTheme === theme}
                onPress={() => setSelectedTheme(theme)}
              />
            ),
          )}
        </View>

        <View style={styles.previewSection}>
          <Text style={styles.previewLabel}>Preview</Text>
          <View style={styles.largePreview}>
            {Array.from({ length: 8 }).map((_, row) => (
              <View key={row} style={styles.largePreviewRow}>
                {Array.from({ length: 8 }).map((__, col) => {
                  const theme = selectedTheme;
                  const config = BOARD_COLOR_THEMES[theme];
                  const isLight = (row + col) % 2 === 0;
                  return (
                    <View
                      key={col}
                      style={[
                        styles.largePreviewCell,
                        {
                          backgroundColor: isLight ? config.lightColor : config.darkColor,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
          <Text style={styles.previewDescription}>
            Light: {BOARD_COLOR_THEMES[selectedTheme].lightColor} • Dark:{' '}
            {BOARD_COLOR_THEMES[selectedTheme].darkColor}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            { backgroundColor: BOARD_COLOR_THEMES[selectedTheme].accentColor },
          ]}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Start Game</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(36, 35, 32)',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2b2a27',
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 28,
    color: '#f0d9b5',
    lineHeight: 32,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f0d9b5',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
  },

  // Scroll content
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 100,
  },

  // Themes grid
  themesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  themeCard: {
    width: (CONTENT_WIDTH - 28) / 2,
    backgroundColor: '#2b2a27',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#444',
    overflow: 'hidden',
    alignItems: 'center',
    paddingVertical: 12,
  },
  boardPreview: {
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewRow: {
    flexDirection: 'row',
  },
  previewCell: {
    width: 28,
    height: 28,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Preview section
  previewSection: {
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f0d9b5',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  largePreview: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  largePreviewRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  largePreviewCell: {
    flex: 1,
    aspectRatio: 1,
    marginRight: 4,
    borderRadius: 4,
  },
  previewDescription: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
    backgroundColor: 'rgb(36, 35, 32)',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  continueButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

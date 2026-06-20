import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import HomeScreen, { GameMode } from './screen/Home';
import Board from './screen/board';

type Screen = 'home' | 'game';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [gameMode, setGameMode] = useState<GameMode>('players');

  const handleStart = (mode: GameMode) => {
    setGameMode(mode);
    setScreen('game');
  };

  const handleBack = () => {
    setScreen('home');
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.container}>
        {screen === 'home' ? (
          <HomeScreen onStart={handleStart} />
        ) : (
          <Board gameMode={gameMode} onBack={handleBack} />
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgb(36, 35, 32)',
  },
});

export default App;

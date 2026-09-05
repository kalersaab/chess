import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './screen/Home';
import BoardColorScreen from './screen/BoardColor';
import Board from './screen/board';
import { RootStackParamList } from './navigation/types';
import { ClockProvider } from './context/ClockContext';
import { BoardColorProvider } from './context/BoardColorContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <BoardColorProvider>
          <ClockProvider>
            <NavigationContainer>
              <Stack.Navigator
                initialRouteName="Home"
                screenOptions={{
                  headerShown: false,
                  contentStyle: styles.screen,
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="BoardColor" component={BoardColorScreen} />
                <Stack.Screen name="Game" component={Board} />
              </Stack.Navigator>
            </NavigationContainer>
          </ClockProvider>
        </BoardColorProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgb(36, 35, 32)',
  },
  screen: {
    flex: 1,
    backgroundColor: 'rgb(36, 35, 32)',
  },
});

export default App;

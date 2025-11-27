import { StyleSheet, View } from 'react-native';

import NativeChessModule from './specs/NativeChessModule';
import Board from './screen/board';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function App() {

  return (
       <GestureHandlerRootView>
    <View style={styles.container}>
     <Board />
    </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgb(36, 35, 32)",
  },
});

export default App;

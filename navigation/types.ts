import { GameMode, DifficultyLevel } from '../utils';

export type RootStackParamList = {
  Home: undefined;
  Game: {
    gameMode: GameMode;
    difficulty?: DifficultyLevel;
  };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

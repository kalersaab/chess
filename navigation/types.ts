import { GameMode, DifficultyLevel } from '../utils';
import { BoardColorTheme } from '../screen/BoardColor';

export type RootStackParamList = {
  Home: undefined;
  BoardColor: {
    gameMode: GameMode;
    difficulty?: DifficultyLevel;
  };
  Game: {
    gameMode: GameMode;
    difficulty?: DifficultyLevel;
    boardColorTheme?: BoardColorTheme;
  };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

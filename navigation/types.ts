import { GameMode, DifficultyLevel } from '../utils';
import { BoardColorTheme } from '../screen/BoardColor';

export type RootStackParamList = {
  Home: undefined;
  BoardColor: {
    gameMode: GameMode;
    difficulty?: DifficultyLevel;
    fen?: string;
    pgn?: string;
  };
  Game: {
    gameMode: GameMode;
    difficulty?: DifficultyLevel;
    boardColorTheme?: BoardColorTheme;
    fen?: string;
    pgn?: string;
  };
  PrivacyPolicy: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

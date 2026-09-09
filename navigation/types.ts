import { GameMode, DifficultyLevel } from '../utils';
import { BoardColorTheme } from '../screen/BoardColor';

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;
  BoardColor: {
    gameMode: GameMode;
    difficulty?: DifficultyLevel;
    onlineGameId?: string;
    playerColor?: 'white' | 'black';
    playerName?: string;
  };
  Game: {
    gameMode: GameMode;
    difficulty?: DifficultyLevel;
    boardColorTheme?: BoardColorTheme;
    onlineGameId?: string;
    playerColor?: 'white' | 'black';
    playerName?: string;
  };
  PrivacyPolicy: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

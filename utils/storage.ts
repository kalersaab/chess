import { BoardColorTheme } from '../screen/BoardColor';

let storedBoardColor: BoardColorTheme = 'classic';

export const saveBoardColor = async (theme: BoardColorTheme): Promise<void> => {
  storedBoardColor = theme;
};

export const loadBoardColor = async (): Promise<BoardColorTheme> => {
  return storedBoardColor;
};

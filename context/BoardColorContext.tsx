import React, { createContext, useContext, useState, ReactNode } from 'react';
import { BoardColorTheme } from '../screen/BoardColor';

interface BoardColorContextType {
  boardColorTheme: BoardColorTheme;
  setBoardColorTheme: (theme: BoardColorTheme) => void;
}

const BoardColorContext = createContext<BoardColorContextType | undefined>(undefined);

export const BoardColorProvider = ({ children }: { children: ReactNode }) => {
  const [boardColorTheme, setBoardColorTheme] = useState<BoardColorTheme>('classic');

  return (
    <BoardColorContext.Provider value={{ boardColorTheme, setBoardColorTheme }}>
      {children}
    </BoardColorContext.Provider>
  );
};

export const useBoardColor = () => {
  const context = useContext(BoardColorContext);
  if (!context) {
    throw new Error('useBoardColor must be used within BoardColorProvider');
  }
  return context;
};

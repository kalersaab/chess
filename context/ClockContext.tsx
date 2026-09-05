import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface ClockState {
  whiteTime: number;
  blackTime: number;
  setWhiteTime: (time: number) => void;
  setBlackTime: (time: number) => void;
  resetClock: (initialTime: number) => void;
}

const ClockContext = createContext<ClockState | undefined>(undefined);

export const ClockProvider = ({ children }: { children: ReactNode }) => {
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);

  const resetClock = useCallback((initialTime: number) => {
    setWhiteTime(initialTime);
    setBlackTime(initialTime);
  }, []);

  return (
    <ClockContext.Provider 
      value={{ 
        whiteTime, 
        blackTime, 
        setWhiteTime, 
        setBlackTime, 
        resetClock 
      }}
    >
      {children}
    </ClockContext.Provider>
  );
};

export const useClock = () => {
  const context = useContext(ClockContext);
  if (!context) {
    throw new Error('useClock must be used within ClockProvider');
  }
  return context;
};

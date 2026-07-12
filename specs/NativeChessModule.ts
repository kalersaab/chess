import {TurboModule, TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  getBoard(): string[][];
  makeMove(move: string): Promise<string>;
  isCheckmate(white: boolean): Promise<boolean>;
  getTurn(): string;
  reset(): void;
  resetTimer(): void;
  getWhiteTime(): number;
  getBlackTime(): number;
  tick(white: boolean): boolean;
  getValidMoves(square: string): string[];
  getBestMove(white: boolean, depth: number): Promise<string>;
  getFEN(): string;
  loadFEN(fen: string): boolean;
  getPGN(): string;
  loadPGN(pgn: string): boolean;
  goToMove(index: number): boolean;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'NativeChessModule',
);

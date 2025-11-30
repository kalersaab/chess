import {TurboModule, TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  getBoard(): string[][];
  makeMove(move: string):Promise<string>;
  isCheckmate(white: boolean):Promise<boolean>;
  getTurn(): string;  
  reset(): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'NativeChessModule',
);

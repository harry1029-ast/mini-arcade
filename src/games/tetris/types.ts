// src/games/tetris/types.ts

export type TetraminoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export interface TetraminoShape {
  matrix: number[][];
  color: string;
  glow: string;
}

export interface ActivePiece {
  type: TetraminoType;
  matrix: number[][];
  x: number;
  y: number;
  color: string;
  glow: string;
}

export interface ClearedRowEffect {
  y: number;
  alpha: number;
}
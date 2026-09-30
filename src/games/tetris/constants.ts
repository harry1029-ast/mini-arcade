// src/games/tetris/constants.ts
import type { TetraminoType, TetraminoShape } from './types';

export const COLS = 10;
export const ROWS = 20;
export const BLOCK_SIZE = 24; // 240x480 canvas

export const SHAPES: Record<TetraminoType, TetraminoShape> = {
  I: {
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: '#00f3ff', // Cyan
    glow: '#00f3ff',
  },
  J: {
    matrix: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#0066ff', // Neon Blue
    glow: '#0066ff',
  },
  L: {
    matrix: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#ffaa00', // Amber
    glow: '#ffaa00',
  },
  O: {
    matrix: [
      [1, 1],
      [1, 1],
    ],
    color: '#ffff00', // Yellow
    glow: '#ffff00',
  },
  S: {
    matrix: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: '#39ff14', // Lime Green
    glow: '#39ff14',
  },
  T: {
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#bc13fe', // Purple
    glow: '#bc13fe',
  },
  Z: {
    matrix: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: '#ff007f', // Pink
    glow: '#ff007f',
  },
};
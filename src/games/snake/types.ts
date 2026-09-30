// src/games/snake/types.ts

export interface Point {
  x: number;
  y: number;
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface SnakeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
}
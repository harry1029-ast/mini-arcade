// src/games/breakout/types.ts

export interface BreakoutBrick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  glow: string;
  points: number;
  hits: number;
  alive: boolean;
}

export interface BreakoutBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  staged: boolean; // True while waiting for player launch
}

export interface BreakoutPaddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

export interface BreakoutParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
}
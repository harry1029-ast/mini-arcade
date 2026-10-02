// src/games/pong/types.ts

export type PongMode = '1P_AI' | '2P_LOCAL' | '2P_ONLINE';
export type PongDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface PongDifficultyConfig {
  aiSpeed: number;
  aiDeadzone: number;
  initialBallSpeed: number;
  maxBallSpeed: number;
  label: string;
  description: string;
}

export interface PongBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

export interface PongParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
}
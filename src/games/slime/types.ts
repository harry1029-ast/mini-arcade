// src/games/slime/types.ts

export type SlimeMode = '1P_AI' | '2P_LOCAL';
export type AiServeTactic = 'FAST_SPIKE' | 'HIGH_LOB' | 'SHORT_DROP';

export interface SlimeEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glow: string;
  isJumping: boolean;
}

export interface SlimeBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isServing: boolean;
  server: 'PLAYER' | 'AI';
}

export interface SlimeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
}
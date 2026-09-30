// src/games/slime/types.ts

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
}

export interface SlimeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
}
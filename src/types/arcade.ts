// src/types/arcade.ts
export type GameId = 'snake' | 'pong' | 'tetris' | 'breakout' | 'slime';

export interface GameMetadata {
  id: GameId;
  node: string;
  title: string;
  description: string;
  badge: string;
  icon: string;
  accent: 'cyan' | 'pink' | 'green' | 'amber' | 'purple';
}
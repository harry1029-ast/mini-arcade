// src/types/arcade.ts
export type GameId = 'snake' | 'pong' | 'tetris' | 'breakout' | 'slime' | 'tank';

export interface GameMetadata {
  id: GameId;
  node: string;
  title: string;
  badge?: string;
  description: string;
  icon: string;
  accent: 'cyan' | 'pink' | 'green' | 'amber' | 'purple';
}
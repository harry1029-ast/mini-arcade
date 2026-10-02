// src/games/tank/types.ts
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface TankEntity {
    x: number;
    y: number;
    dir: Direction;
    speed: number;
    size: number;
    alive: boolean;
    color: string;
    glow: string;
    shootCooldown: number;
}

export type TankMode = 'SOLO' | 'LOCAL_2P';

export interface Bullet {
    x: number;
    y: number;
    dir: Direction;
    speed: number;
    size: number;
    owner: 'P1' | 'P2' | 'ENEMY';
    color: string;
}

export interface BrickTile {
    x: number;
    y: number;
    alive: boolean;
}

export interface SparkParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    color: string;
}
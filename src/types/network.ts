// src/types/network.ts

// --- PONG PACKETS ---
export interface PongHostStatePacket {
    type: 'PONG_HOST_SYNC';
    ball: { x: number; y: number; vx: number; vy: number };
    p1Y: number;
    playerScore: number;
    p2Score: number;
    winner: 'P1' | 'P2' | null;
    ping?: number;
}

export interface PongGuestInputPacket {
    type: 'PONG_GUEST_INPUT';
    up: boolean;
    down: boolean;
    directY?: number;
}

export interface PongStartGamePacket {
    type: 'PONG_START_GAME';
}

// --- SLIME PACKETS ---
export type SlimeSoundEvent = 'BLIP_P1' | 'BLIP_P2' | 'BOUNCE' | 'SCORE_EXPLODE' | 'CHIME' | 'JUMP_P1' | 'JUMP_P2';

export interface SlimeHostStatePacket {
    type: 'SLIME_HOST_SYNC';
    ball: {
        x: number;
        y: number;
        vx: number;
        vy: number;
        isServing: boolean;
        server: 'PLAYER' | 'AI';
    };
    p1: { x: number; y: number; vx: number; vy: number; isJumping: boolean };
    p2: { x: number; y: number; vx: number; vy: number; isJumping: boolean };
    playerScore: number;
    p2Score: number;
    winner: 'P1' | 'P2' | null;
    ping?: number;
    sfx?: SlimeSoundEvent;
}

export interface SlimeGuestInputPacket {
    type: 'SLIME_GUEST_INPUT';
    left: boolean;
    right: boolean;
    jump: boolean;
}

export interface SlimeStartGamePacket {
    type: 'SLIME_START_GAME';
}

// --- SHARED NETWORK PACKETS ---
export interface PingPacket {
    type: 'PING';
    timestamp: number;
}

export interface PongResponsePacket {
    type: 'PONG_REPLY';
    timestamp: number;
}

export type ArcadeNetworkPacket =
    | PongHostStatePacket
    | PongGuestInputPacket
    | PongStartGamePacket
    | SlimeHostStatePacket
    | SlimeGuestInputPacket
    | SlimeStartGamePacket
    | PingPacket
    | PongResponsePacket;

// Keep alias for Pong backward compatibility
export type PongNetworkPacket = ArcadeNetworkPacket;
export type SlimeNetworkPacket = ArcadeNetworkPacket;


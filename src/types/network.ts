// src/types/network.ts

export interface PongHostStatePacket {
    type: 'PONG_HOST_SYNC';
    ball: {
        x: number;
        y: number;
        vx: number;
        vy: number;
    };
    p1Y: number;
    playerScore: number;
    p2Score: number;
    winner: 'P1' | 'P2' | null;
}

export interface PongGuestInputPacket {
    type: 'PONG_GUEST_INPUT';
    up: boolean;
    down: boolean;
    directY?: number;
}

export interface PingPacket {
    type: 'PING';
    timestamp: number;
}

export interface PongResponsePacket {
    type: 'PONG_REPLY';
    timestamp: number;
}

export type PongNetworkPacket =
    | PongHostStatePacket
    | PongGuestInputPacket
    | PingPacket
    | PongResponsePacket;
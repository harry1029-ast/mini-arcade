import React from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import { ArcadeCabinet } from './ArcadeCabinet';
import type { CabinetTarget } from './ArcadeControls';
import type { GameId, GameMetadata } from '../../types/arcade';

interface ArcadeRoomProps {
    games: GameMetadata[];
    nearCabinet: CabinetTarget | null;
}

const HEX_COLOR_MAP: Record<string, string> = {
    cyan: '#00f3ff',
    pink: '#ff007f',
    green: '#39ff14',
    amber: '#ffaa00',
    purple: '#bc13fe',
};

// Layout setup: 3 cabinets on left wall, 3 on right wall facing each other
export const CABINET_CONFIGS: { id: GameId; pos: [number, number, number]; rot: [number, number, number] }[] = [
    // Left Wall (Facing East / Rotation +Y 90 deg)
    { id: 'snake', pos: [-3.8, 0, -3.5], rot: [0, Math.PI / 2, 0] },
    { id: 'pong', pos: [-3.8, 0, 0], rot: [0, Math.PI / 2, 0] },
    { id: 'tetris', pos: [-3.8, 0, 3.5], rot: [0, Math.PI / 2, 0] },

    // Right Wall (Facing West / Rotation -Y 90 deg)
    { id: 'breakout', pos: [3.8, 0, -3.5], rot: [0, -Math.PI / 2, 0] },
    { id: 'slime', pos: [3.8, 0, 0], rot: [0, -Math.PI / 2, 0] },
    { id: 'tank', pos: [3.8, 0, 3.5], rot: [0, -Math.PI / 2, 0] },
];

export const ArcadeRoom: React.FC<ArcadeRoomProps> = ({ games, nearCabinet }) => {
    return (
        <group>
            {/* Ambient and Key Lighting */}
            <ambientLight intensity={0.45} />
            <directionalLight position={[0, 6, 0]} intensity={0.3} />

            {/* Ceiling Neon Light Strips */}
            <mesh position={[-2, 3.8, 0]}>
                <boxGeometry args={[0.08, 0.05, 14]} />
                <meshStandardMaterial color="#00f3ff" emissive="#00f3ff" emissiveIntensity={1.5} />
            </mesh>
            <mesh position={[2, 3.8, 0]}>
                <boxGeometry args={[0.08, 0.05, 14]} />
                <meshStandardMaterial color="#ff007f" emissive="#ff007f" emissiveIntensity={1.5} />
            </mesh>

            {/* Reflective Dark Floor */}
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[12, 16]} />
                <MeshReflectorMaterial
                    blur={[300, 100]}
                    resolution={512}
                    mirror={0.65}
                    mixBlur={0.8}
                    mixStrength={1.5}
                    roughness={0.3}
                    depthScale={1.2}
                    minDepthThreshold={0.4}
                    maxDepthThreshold={1.4}
                    color="#060913"
                    metalness={0.8}
                />
            </mesh>

            {/* Ceiling Plane */}
            <mesh position={[0, 4, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[12, 16]} />
                <meshStandardMaterial color="#03050a" roughness={0.9} />
            </mesh>

            {/* Back Wall */}
            <mesh position={[0, 2, -8]}>
                <planeGeometry args={[12, 4]} />
                <meshStandardMaterial color="#050811" roughness={0.7} />
            </mesh>

            {/* Front Entrance Wall */}
            <mesh position={[0, 2, 8]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[12, 4]} />
                <meshStandardMaterial color="#050811" roughness={0.7} />
            </mesh>

            {/* Left Wall */}
            <mesh position={[-6, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[16, 4]} />
                <meshStandardMaterial color="#050811" roughness={0.7} />
            </mesh>

            {/* Right Wall */}
            <mesh position={[6, 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[16, 4]} />
                <meshStandardMaterial color="#050811" roughness={0.7} />
            </mesh>

            {/* Render the 6 Cabinets */}
            {CABINET_CONFIGS.map((cfg) => {
                const meta = games.find((g) => g.id === cfg.id);
                if (!meta) return null;

                const colorHex = HEX_COLOR_MAP[meta.accent] || '#00f3ff';
                const isApproached = nearCabinet?.id === meta.id;

                return (
                    <ArcadeCabinet
                        key={meta.id}
                        nodeId={meta.node}
                        title={meta.title}
                        accentColor={colorHex}
                        position={cfg.pos}
                        rotation={cfg.rot}
                        isApproached={isApproached}
                    />
                );
            })}
        </group>
    );
};
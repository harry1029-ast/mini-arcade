// src/components/3d/ArcadeRoom.tsx
import React from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import { ArcadeCabinet } from './ArcadeCabinet';
import { WelcomeSign } from './WelcomeSign';
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

export const CABINET_CONFIGS: { id: GameId; pos: [number, number, number]; rot: [number, number, number] }[] = [
    { id: 'snake', pos: [-3.8, 0, -3.5], rot: [0, Math.PI / 2, 0] },
    { id: 'pong', pos: [-3.8, 0, 0], rot: [0, Math.PI / 2, 0] },
    { id: 'tetris', pos: [-3.8, 0, 3.5], rot: [0, Math.PI / 2, 0] },
    { id: 'breakout', pos: [3.8, 0, -3.5], rot: [0, -Math.PI / 2, 0] },
    { id: 'slime', pos: [3.8, 0, 0], rot: [0, -Math.PI / 2, 0] },
    { id: 'tank', pos: [3.8, 0, 3.5], rot: [0, -Math.PI / 2, 0] },
];

export const ArcadeRoom: React.FC<ArcadeRoomProps> = ({ games, nearCabinet }) => {
    return (
        <group>
            {/* 1. Global & Ambient Lights */}
            <ambientLight intensity={1.5} />
            <directionalLight position={[0, 6, 2]} intensity={2.0} />

            {/* Hallway Overhead Downlights */}
            <pointLight position={[0, 3.5, 0]} color="#00f3ff" intensity={8} distance={18} />
            <pointLight position={[0, 3.5, -4]} color="#ff007f" intensity={6} distance={14} />
            <pointLight position={[0, 3.5, 4]} color="#00f3ff" intensity={6} distance={14} />

            {/* Ceiling Neon Light Beams */}
            <mesh position={[-2, 3.9, 0]}>
                <boxGeometry args={[0.12, 0.08, 16]} />
                <meshBasicMaterial color="#00f3ff" />
            </mesh>
            <mesh position={[2, 3.9, 0]}>
                <boxGeometry args={[0.12, 0.08, 16]} />
                <meshBasicMaterial color="#ff007f" />
            </mesh>

            {/* Ceiling Cross Trusses (Industrial architecture) */}
            {[-5, -2.5, 0, 2.5, 5].map((z) => (
                <group key={`truss-${z}`} position={[0, 3.85, z]}>
                    <mesh>
                        <boxGeometry args={[11.8, 0.08, 0.12]} />
                        <meshStandardMaterial color="#1a2333" metalness={0.8} roughness={0.3} />
                    </mesh>
                </group>
            ))}

            {/* Floor Perimeter Neon Baseboards */}
            <mesh position={[-4.5, 0.03, 0]}>
                <boxGeometry args={[0.06, 0.06, 16]} />
                <meshBasicMaterial color="#00f3ff" />
            </mesh>
            <mesh position={[4.5, 0.03, 0]}>
                <boxGeometry args={[0.06, 0.06, 16]} />
                <meshBasicMaterial color="#ff007f" />
            </mesh>

            {/* Tron Floor Grid */}
            <gridHelper
                args={[16, 24, '#00f3ff', '#162238']}
                position={[0, 0.005, 0]}
            />

            {/* Reflective Dark Floor */}
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[12, 16]} />
                <MeshReflectorMaterial
                    blur={[300, 100]}
                    resolution={512}
                    mirror={0.7}
                    mixBlur={0.8}
                    mixStrength={1.8}
                    roughness={0.25}
                    depthScale={1.2}
                    minDepthThreshold={0.4}
                    maxDepthThreshold={1.4}
                    color="#0d1424"
                    metalness={0.8}
                />
            </mesh>

            {/* Ceiling Plane */}
            <mesh position={[0, 4, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[12, 16]} />
                <meshStandardMaterial color="#080d1a" roughness={0.9} />
            </mesh>

            {/* Back Wall */}
            <mesh position={[0, 2, -8]}>
                <planeGeometry args={[12, 4]} />
                <meshStandardMaterial color="#0e1629" roughness={0.6} />
            </mesh>

            {/* Front Entrance Wall */}
            <mesh position={[0, 2, 8]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[12, 4]} />
                <meshStandardMaterial color="#0e1629" roughness={0.6} />
            </mesh>

            {/* Left Wall */}
            <mesh position={[-6, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[16, 4]} />
                <meshStandardMaterial color="#0a101f" roughness={0.6} />
            </mesh>

            {/* Right Wall */}
            <mesh position={[6, 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[16, 4]} />
                <meshStandardMaterial color="#0a101f" roughness={0.6} />
            </mesh>

            {/* Focal Neon Arcade Sign on Center Far Wall */}
            <WelcomeSign position={[0, 2.3, -7.8]} />

            {/* 6 Cabinets */}
            {CABINET_CONFIGS.map((cfg) => {
                const meta = games.find((g) => g.id === cfg.id);
                if (!meta) return null;

                const colorHex = HEX_COLOR_MAP[meta.accent] || '#00f3ff';
                const isApproached = nearCabinet?.id === meta.id;

                return (
                    <ArcadeCabinet
                        key={meta.id}
                        gameId={meta.id}
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
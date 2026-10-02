// src/components/3d/ArcadeCabinet.tsx
import React, { useRef, useMemo } from 'react';
import { Group, Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { createCabinetScreenTexture } from './ScreenCanvas';
import type { GameId } from '../../types/arcade';

interface ArcadeCabinetProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    accentColor: string;
    title: string;
    gameId: GameId;
    isApproached?: boolean;
}

export const ArcadeCabinet: React.FC<ArcadeCabinetProps> = ({
    position,
    rotation = [0, 0, 0],
    accentColor,
    title,
    gameId,
    isApproached = false,
}) => {
    const groupRef = useRef<Group>(null);
    const screenMeshRef = useRef<Mesh>(null);

    // Generate unique looping screen texture
    const screenAnim = useMemo(() => {
        return createCabinetScreenTexture(gameId, accentColor);
    }, [gameId, accentColor]);

    // Tick the canvas texture loop
    useFrame(() => {
        screenAnim.update();
    });

    return (
        <group ref={groupRef} position={position} rotation={rotation}>
            {/* Main Outer Cabinet Frame */}
            <mesh position={[0, 1.4, 0]}>
                <boxGeometry args={[0.9, 1.8, 0.9]} />
                <meshStandardMaterial color="#161e31" roughness={0.35} metalness={0.5} />
            </mesh>

            {/* Screen Frame Recess */}
            <mesh position={[0, 1.45, 0.46]}>
                <planeGeometry args={[0.72, 0.54]} />
                <meshBasicMaterial color="#020408" />
            </mesh>

            {/* Animated Canvas CRT Screen */}
            <mesh ref={screenMeshRef} position={[0, 1.45, 0.465]}>
                <planeGeometry args={[0.66, 0.48]} />
                <meshBasicMaterial map={screenAnim.texture} />
            </mesh>

            {/* Angled Marquee Header */}
            <mesh position={[0, 2.15, 0.35]} rotation={[-0.2, 0, 0]}>
                <boxGeometry args={[0.88, 0.28, 0.15]} />
                <meshStandardMaterial
                    color="#0f172a"
                    emissive={accentColor}
                    emissiveIntensity={isApproached ? 1.6 : 0.8}
                />
            </mesh>

            {/* Marquee Title */}
            <Text
                position={[0, 2.15, 0.435]}
                rotation={[-0.2, 0, 0]}
                fontSize={0.065}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
            >
                {title}
            </Text>

            {/* Control Panel Deck (Protruding Forward) */}
            <mesh position={[0, 1.05, 0.55]} rotation={[0.4, 0, 0]}>
                <boxGeometry args={[0.84, 0.08, 0.3]} />
                <meshStandardMaterial color="#0b111e" roughness={0.5} metalness={0.4} />
            </mesh>

            {/* Glowing Joystick Base */}
            <mesh position={[-0.2, 1.12, 0.55]}>
                <cylinderGeometry args={[0.015, 0.015, 0.08]} />
                <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.6} />
            </mesh>
            <mesh position={[-0.2, 1.16, 0.55]}>
                <sphereGeometry args={[0.025, 8, 8]} />
                <meshBasicMaterial color="#ff007f" />
            </mesh>

            {/* Cabinet Marquee & Face Illumination */}
            <pointLight
                position={[0, 1.8, 0.7]}
                color={accentColor}
                intensity={3.5}
                distance={3.5}
            />

            {/* Cabinet Under-Glow Strip */}
            <pointLight
                position={[0, 0.15, 0.4]}
                color={accentColor}
                intensity={3.0}
                distance={2.5}
            />
        </group>
    );
};
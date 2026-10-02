// src/components/3d/ArcadeCabinet.tsx
import React, { useRef } from 'react';
import { Group } from 'three';
import { Text } from '@react-three/drei';

interface ArcadeCabinetProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    accentColor: string;
    title: string;
    nodeId: string;
    isApproached?: boolean;
}

export const ArcadeCabinet: React.FC<ArcadeCabinetProps> = ({
    position,
    rotation = [0, 0, 0],
    accentColor,
    title,
    isApproached = false,
}) => {
    const groupRef = useRef<Group>(null);

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

            {/* Screen Bezel Active Face */}
            <mesh position={[0, 1.45, 0.465]}>
                <planeGeometry args={[0.66, 0.48]} />
                <meshStandardMaterial
                    color={accentColor}
                    emissive={accentColor}
                    emissiveIntensity={isApproached ? 1.5 : 0.6}
                    roughness={0.1}
                />
            </mesh>

            {/* Angled Marquee Header */}
            <mesh position={[0, 2.15, 0.35]} rotation={[-0.2, 0, 0]}>
                <boxGeometry args={[0.88, 0.28, 0.15]} />
                <meshStandardMaterial
                    color="#0f172a"
                    emissive={accentColor}
                    emissiveIntensity={0.8}
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
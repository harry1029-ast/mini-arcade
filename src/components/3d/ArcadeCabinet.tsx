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
    nodeId,
    isApproached = false,
}) => {
    const groupRef = useRef<Group>(null);

    return (
        <group ref={groupRef} position={position} rotation={rotation}>
            {/* Main Outer Cabinet Frame */}
            <mesh position={[0, 1.4, 0]}>
                <boxGeometry args={[0.9, 1.8, 0.9]} />
                <meshStandardMaterial color="#080c14" roughness={0.4} metalness={0.7} />
            </mesh>

            {/* Screen Recess */}
            <mesh position={[0, 1.45, 0.46]}>
                <planeGeometry args={[0.7, 0.52]} />
                <meshBasicMaterial color="#020408" />
            </mesh>

            {/* Illuminated CRT Screen Bezel Glow */}
            <mesh position={[0, 1.45, 0.465]}>
                <planeGeometry args={[0.66, 0.48]} />
                <meshStandardMaterial
                    color={accentColor}
                    emissive={accentColor}
                    emissiveIntensity={isApproached ? 0.8 : 0.25}
                    roughness={0.2}
                />
            </mesh>

            {/* Angled Marquee Header */}
            <mesh position={[0, 2.15, 0.35]} rotation={[-0.2, 0, 0]}>
                <boxGeometry args={[0.88, 0.28, 0.15]} />
                <meshStandardMaterial
                    color="#050810"
                    emissive={accentColor}
                    emissiveIntensity={0.6}
                />
            </mesh>

            {/* Marquee Title Text */}
            <Text
                position={[0, 2.15, 0.43]}
                rotation={[-0.2, 0, 0]}
                fontSize={0.065}
                color="#ffffff"
                font="https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff"
                anchorX="center"
                anchorY="middle"
            >
                {title}
            </Text>

            {/* Under-Glow Neon Accent Strip */}
            <pointLight
                position={[0, 0.1, 0.3]}
                color={accentColor}
                intensity={2.5}
                distance={2.5}
            />
        </group>
    );
};
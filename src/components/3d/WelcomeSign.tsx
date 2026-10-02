// src/components/3d/WelcomeSign.tsx
import React, { useRef } from 'react';
import { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

interface WelcomeSignProps {
    position?: [number, number, number];
}

export const WelcomeSign: React.FC<WelcomeSignProps> = ({ position = [0, 2.3, -7.8] }) => {
    const groupRef = useRef<Group>(null);
    const ring1Ref = useRef<Group>(null);
    const ring2Ref = useRef<Group>(null);
    const coreGlowRef = useRef<any>(null);

    // Animate the orbital rings and the glowing energy core
    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        if (ring1Ref.current) ring1Ref.current.rotation.z = t * 0.8;
        if (ring2Ref.current) ring2Ref.current.rotation.z = -t * 1.2;
        if (coreGlowRef.current) {
            coreGlowRef.current.intensity = 5.0 + Math.sin(t * 3.5) * 1.2;
        }
    });

    return (
        <group ref={groupRef} position={position}>
            {/* Dark Wall Mounting Plate */}
            <mesh position={[0, 0, -0.05]}>
                <planeGeometry args={[7.4, 2.4]} />
                <meshStandardMaterial color="#050812" roughness={0.8} metalness={0.5} />
            </mesh>

            {/* Outer Cyan & Pink Neon Framing Borders */}
            <mesh position={[0, 1.15, 0.02]}>
                <boxGeometry args={[7.2, 0.04, 0.02]} />
                <meshBasicMaterial color="#00f3ff" />
            </mesh>
            <mesh position={[0, -1.15, 0.02]}>
                <boxGeometry args={[7.2, 0.04, 0.02]} />
                <meshBasicMaterial color="#ff007f" />
            </mesh>
            <mesh position={[-3.6, 0, 0.02]}>
                <boxGeometry args={[0.04, 2.3, 0.02]} />
                <meshBasicMaterial color="#00f3ff" />
            </mesh>
            <mesh position={[3.6, 0, 0.02]}>
                <boxGeometry args={[0.04, 2.3, 0.02]} />
                <meshBasicMaterial color="#ff007f" />
            </mesh>

            {/* Decorative Beveled Corner Accents */}
            {[-3.4, 3.4].map((x) =>
                [-0.95, 0.95].map((y) => (
                    <mesh key={`corner-${x}-${y}`} position={[x, y, 0.03]}>
                        <boxGeometry args={[0.16, 0.16, 0.02]} />
                        <meshBasicMaterial color="#ffe600" />
                    </mesh>
                ))
            )}

            {/* ======================================================== */}
            {/* 1. LEFT: THE CYBER CORE / LOGO ORB                       */}
            {/* ======================================================== */}
            <group position={[-2.3, 0.05, 0.05]}>
                {/* Core Glowing Sphere */}
                <mesh>
                    <sphereGeometry args={[0.34, 24, 24]} />
                    <meshBasicMaterial color="#00f3ff" />
                </mesh>

                {/* Outer Orbiting Ring 1 */}
                <group ref={ring1Ref}>
                    <mesh rotation={[0.4, 0.2, 0]}>
                        <ringGeometry args={[0.48, 0.54, 32]} />
                        <meshBasicMaterial color="#ff007f" wireframe />
                    </mesh>
                </group>

                {/* Outer Orbiting Ring 2 */}
                <group ref={ring2Ref}>
                    <mesh rotation={[-0.3, -0.4, 0]}>
                        <ringGeometry args={[0.64, 0.7, 32]} />
                        <meshBasicMaterial color="#00f3ff" wireframe />
                    </mesh>
                </group>

                {/* Orbit Node Lights */}
                <pointLight
                    ref={coreGlowRef}
                    position={[0, 0, 0.4]}
                    color="#00f3ff"
                    intensity={5}
                    distance={6}
                />

                {/* Sub-label under core */}
                <Text
                    position={[0, -0.85, 0.05]}
                    fontSize={0.095}
                    color="#39ff14"
                    letterSpacing={0.12}
                    anchorX="center"
                    anchorY="middle"
                >
                    [CORE_ACTIVE]
                </Text>
            </group>

            {/* Vertical Neon Divider */}
            <mesh position={[-1.3, 0, 0.03]}>
                <boxGeometry args={[0.03, 1.8, 0.02]} />
                <meshBasicMaterial color="rgba(0,243,255,0.4)" />
            </mesh>

            {/* ======================================================== */}
            {/* 2. RIGHT: OFFICIAL "CYBERGRID // 99" SIGNAGE             */}
            {/* ======================================================== */}
            <group position={[1.1, 0, 0]}>
                {/* Top Status Header */}
                <Text
                    position={[0, 0.62, 0.05]}
                    fontSize={0.12}
                    color="#00f3ff"
                    letterSpacing={0.18}
                    anchorX="center"
                    anchorY="middle"
                >
                    SYSTEM_STATUS: ONLINE
                </Text>

                {/* Main Brand Title: Properly Spaced CYBERGRID and // 99 */}
                <group position={[0, 0.12, 0.05]}>
                    <Text
                        position={[-0.72, 0, 0]}
                        fontSize={0.44}
                        color="#00f3ff"
                        letterSpacing={0.06}
                        anchorX="center"
                        anchorY="middle"
                    >
                        CYBERGRID
                    </Text>

                    <Text
                        position={[1.18, 0, 0]}
                        fontSize={0.44}
                        color="#ff007f"
                        letterSpacing={0.06}
                        anchorX="center"
                        anchorY="middle"
                    >
            // 99
                    </Text>
                </group>

                {/* Bottom Operational Subtitle */}
                <Text
                    position={[0, -0.42, 0.05]}
                    fontSize={0.125}
                    color="#ffe600"
                    letterSpacing={0.14}
                    anchorX="center"
                    anchorY="middle"
                >
                    ★ PHYSICAL ARCADE DECK // 6 NODES ★
                </Text>

                {/* Instructions Ticker */}
                <Text
                    position={[0, -0.72, 0.05]}
                    fontSize={0.09}
                    color="#39ff14"
                    letterSpacing={0.08}
                    anchorX="center"
                    anchorY="middle"
                >
                    APPROACH ANY MACHINE TO ENGAGE PROTOCOLS
                </Text>
            </group>

            {/* Primary Wall Wash Ambient Lights */}
            <pointLight position={[1.1, 0.2, 0.8]} color="#ff007f" intensity={5} distance={8} />
            <pointLight position={[-1.1, 0.2, 0.8]} color="#00f3ff" intensity={5} distance={8} />
        </group>
    );
};
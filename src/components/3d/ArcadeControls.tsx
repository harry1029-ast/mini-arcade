import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import { Vector3 } from 'three';

export interface CabinetTarget {
    id: string;
    title: string;
    position: [number, number, number];
}

interface ArcadeControlsProps {
    cabinets: CabinetTarget[];
    onNearCabinet: (cabinet: CabinetTarget | null) => void;
    roomBounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
    isLockedToGame?: boolean;
}

const WALK_SPEED = 4.2;
const INTERACTION_DIST = 2.2;
const EYE_HEIGHT = 1.6;

export const ArcadeControls: React.FC<ArcadeControlsProps> = ({
    cabinets,
    onNearCabinet,
    roomBounds = { minX: -6.5, maxX: 6.5, minZ: -7.5, maxZ: 7.5 },
    isLockedToGame = false,
}) => {
    const { camera } = useThree();
    const keys = useRef({ forward: false, backward: false, left: false, right: false });
    const moveDirection = useRef(new Vector3());
    const lateralDirection = useRef(new Vector3());

    // Split-keyboard listeners for WASD & Arrow navigation
    useEffect(() => {
        if (isLockedToGame) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.current.forward = true;
            if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.current.backward = true;
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.current.left = true;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.current.right = true;
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.current.forward = false;
            if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.current.backward = false;
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.current.left = false;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.current.right = false;
        };

        const handleBlur = () => {
            keys.current = { forward: false, backward: false, left: false, right: false };
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, [isLockedToGame]);

    // Frame tick: Velocity integration, boundary limits & cabinet proximity checks
    useFrame((_, delta) => {
        if (isLockedToGame) return;

        const dt = Math.min(delta, 0.1);

        // Compute forward & lateral camera-relative vectors on the XZ ground plane
        camera.getWorldDirection(moveDirection.current);
        moveDirection.current.y = 0;
        moveDirection.current.normalize();

        lateralDirection.current.crossVectors(camera.up, moveDirection.current).normalize();

        const velocity = WALK_SPEED * dt;

        if (keys.current.forward) camera.position.addScaledVector(moveDirection.current, velocity);
        if (keys.current.backward) camera.position.addScaledVector(moveDirection.current, -velocity);
        if (keys.current.left) camera.position.addScaledVector(lateralDirection.current, velocity);
        if (keys.current.right) camera.position.addScaledVector(lateralDirection.current, -velocity);

        // Lock eye level
        camera.position.y = EYE_HEIGHT;

        // Room boundary clamping
        camera.position.x = Math.max(roomBounds.minX, Math.min(roomBounds.maxX, camera.position.x));
        camera.position.z = Math.max(roomBounds.minZ, Math.min(roomBounds.maxZ, camera.position.z));

        // Nearest cabinet proximity detection
        let closest: CabinetTarget | null = null;
        let minDist = INTERACTION_DIST;

        for (const cab of cabinets) {
            const dx = camera.position.x - cab.position[0];
            const dz = camera.position.z - cab.position[2];
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < minDist) {
                minDist = dist;
                closest = cab;
            }
        }

        onNearCabinet(closest);
    });

    return !isLockedToGame ? <PointerLockControls makeDefault /> : null;
};
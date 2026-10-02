import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Quaternion, Matrix4 } from 'three';
import type { GameId } from '../../types/arcade';
import { CABINET_CONFIGS } from './ArcadeRoom';

interface CameraZoomTransitionProps {
    zoomingTo: GameId | null;
    onZoomComplete: () => void;
}

export const CameraZoomTransition: React.FC<CameraZoomTransitionProps> = ({
    zoomingTo,
    onZoomComplete,
}) => {
    const { camera } = useThree();
    const progressRef = useRef(0);
    const startPosRef = useRef(new Vector3());
    const startQuatRef = useRef(new Quaternion());
    const targetPosRef = useRef(new Vector3());
    const targetQuatRef = useRef(new Quaternion());
    const hasInitializedRef = useRef(false);

    useFrame((_, delta) => {
        if (!zoomingTo) {
            hasInitializedRef.current = false;
            progressRef.current = 0;
            return;
        }

        // Initialize source and destination vectors on first frame of transition
        if (!hasInitializedRef.current) {
            const config = CABINET_CONFIGS.find((c) => c.id === zoomingTo);
            if (!config) return;

            startPosRef.current.copy(camera.position);
            startQuatRef.current.copy(camera.quaternion);

            // Determine world coordinates of the cabinet's screen based on its wall orientation
            const [cx, , cz] = config.pos;
            const isLeftWall = cx < 0;

            // Position camera right in front of the screen
            const screenX = isLeftWall ? cx + 0.465 : cx - 0.465;
            const camTargetX = isLeftWall ? cx + 0.58 : cx - 0.58;
            const screenY = 1.45;
            const screenZ = cz;

            targetPosRef.current.set(camTargetX, screenY, screenZ);

            // Calculate the quaternion needed to look straight into the screen
            const m = new Matrix4();
            m.lookAt(targetPosRef.current, new Vector3(screenX, screenY, screenZ), new Vector3(0, 1, 0));
            targetQuatRef.current.setFromRotationMatrix(m);

            hasInitializedRef.current = true;
        }

        // Smooth cubic easing curve: t^2 * (3 - 2t)
        progressRef.current = Math.min(1, progressRef.current + delta * 1.8);
        const t = progressRef.current;
        const ease = t * t * (3 - 2 * t);

        camera.position.lerpVectors(startPosRef.current, targetPosRef.current, ease);
        camera.quaternion.slerpQuaternions(startQuatRef.current, targetQuatRef.current, ease);

        // Zoom complete -> Trigger game mount
        if (progressRef.current >= 1) {
            onZoomComplete();
        }
    });

    return null;
};
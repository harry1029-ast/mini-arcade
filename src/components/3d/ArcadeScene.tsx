import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { ArcadeRoom, CABINET_CONFIGS } from './ArcadeRoom';
import { ArcadeControls } from './ArcadeControls';
import { CameraZoomTransition } from './CameraZoomTransition';
import type { CabinetTarget } from './ArcadeControls';
import { sound } from '../../audio/NeonAudioSynth';
import type { GameId, GameMetadata } from '../../types/arcade';
import { Gamepad2, Move, MousePointer } from 'lucide-react';

interface ArcadeSceneProps {
    games: GameMetadata[];
    onSelectGame: (id: GameId) => void;
}

export const ArcadeScene: React.FC<ArcadeSceneProps> = ({ games, onSelectGame }) => {
    const [nearCabinet, setNearCabinet] = useState<CabinetTarget | null>(null);
    const [zoomingCabinet, setZoomingCabinet] = useState<GameId | null>(null);
    const [isFlashing, setIsFlashing] = useState(false);

    const cabinetTargets: CabinetTarget[] = CABINET_CONFIGS.map((cfg) => {
        const meta = games.find((g) => g.id === cfg.id);
        return {
            id: cfg.id,
            title: meta ? meta.title : cfg.id.toUpperCase(),
            position: cfg.pos,
        };
    });

    const handleStartZoom = useCallback((id: GameId) => {
        if (zoomingCabinet) return;

        // Release mouse pointer lock so standard mouse controls resume cleanly
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        // Audio cue: rising neon warp synth
        sound.playBlip(320, 'sine', 0.2);
        setTimeout(() => sound.playBlip(640, 'triangle', 0.3), 150);
        setTimeout(() => sound.playBlip(980, 'sine', 0.25), 350);

        setZoomingCabinet(id);
    }, [zoomingCabinet]);

    // Listen for 'E' key press to engage the machine
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.code === 'KeyE' || e.key === 'e' || e.key === 'E') && nearCabinet && !zoomingCabinet) {
                handleStartZoom(nearCabinet.id as GameId);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [nearCabinet, zoomingCabinet, handleStartZoom]);

    const handleZoomFinished = () => {
        // Quick CRT flash before mounting the 2D game
        setIsFlashing(true);
        setTimeout(() => {
            if (zoomingCabinet) {
                onSelectGame(zoomingCabinet);
            }
        }, 180);
    };

    return (
        <div className="relative w-full h-[75vh] md:h-[80vh] border border-cyan-500/40 bg-black overflow-hidden shadow-[0_0_35px_rgba(0,243,255,0.2)]">
            {/* 3D R3F Canvas */}
            <Canvas
                camera={{ position: [0, 1.6, 6.6], fov: 65 }}
                className="w-full h-full cursor-crosshair"
            >
                <color attach="background" args={['#03050a']} />
                <Suspense fallback={null}>
                    <ArcadeRoom games={games} nearCabinet={nearCabinet} />

                    <ArcadeControls
                        cabinets={cabinetTargets}
                        onNearCabinet={setNearCabinet}
                        isLockedToGame={zoomingCabinet !== null}
                    />

                    <CameraZoomTransition
                        zoomingTo={zoomingCabinet}
                        onZoomComplete={handleZoomFinished}
                    />

                    <EffectComposer multisampling={4}>
                        <Bloom
                            luminanceThreshold={0.25}
                            luminanceSmoothing={0.9}
                            intensity={1.2}
                            mipmapBlur
                        />
                        <Vignette offset={0.3} darkness={0.8} />
                    </EffectComposer>
                </Suspense>
            </Canvas>

            {/* Proximity Interaction Prompt */}
            {nearCabinet && !zoomingCabinet && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                    <button
                        onClick={() => handleStartZoom(nearCabinet.id as GameId)}
                        className="flex flex-col items-center bg-[#080d1a]/95 border-2 border-cyan-400 px-6 py-4 backdrop-blur-md shadow-[0_0_30px_rgba(0,243,255,0.5)] cursor-pointer group hover:border-[#ff007f] transition-all animate-pulse"
                    >
                        <Gamepad2 className="w-6 h-6 text-cyan-400 group-hover:text-pink-400 mb-2 transition-colors" />
                        <span className="font-cyber font-bold text-white text-base md:text-lg tracking-wider mb-1">
                            {nearCabinet.title}
                        </span>
                        <span className="font-arcade text-xs text-[#00f3ff] group-hover:text-pink-400 tracking-widest transition-colors">
                            [CLICK OR PRESS E TO PLAY]
                        </span>
                    </button>
                </div>
            )}

            {/* Cinematic CRT Scanline Wipe Flash Overlay */}
            {isFlashing && (
                <div className="absolute inset-0 bg-cyan-300/30 backdrop-blur-xs z-50 pointer-events-none transition-opacity duration-200" />
            )}

            {/* HUD Navigation Hints */}
            {!zoomingCabinet && (
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center text-[10px] font-mono text-gray-400 bg-black/60 px-3 py-1.5 border border-cyan-500/20 pointer-events-none">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-cyan-400">
                            <Move className="w-3 h-3" /> WASD / ARROWS TO WALK
                        </span>
                        <span className="flex items-center gap-1 text-pink-400">
                            <MousePointer className="w-3 h-3" /> CLICK TO LOOK
                        </span>
                    </div>
                    <div className="hidden sm:block text-gray-500">
                        APPROACH MACHINE // [E] ENGAGE
                    </div>
                </div>
            )}
        </div>
    );
};
// src/components/3d/ArcadeScene.tsx
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ArcadeRoom, CABINET_CONFIGS } from './ArcadeRoom';
import { ArcadeControls } from './ArcadeControls';
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

    const cabinetTargets: CabinetTarget[] = CABINET_CONFIGS.map((cfg) => {
        const meta = games.find((g) => g.id === cfg.id);
        return {
            id: cfg.id,
            title: meta ? meta.title : cfg.id.toUpperCase(),
            position: cfg.pos,
        };
    });

    const handleLaunchGame = useCallback((id: GameId) => {
        sound.playBlip(750);
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        onSelectGame(id);
    }, [onSelectGame]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.code === 'KeyE' || e.key === 'e' || e.key === 'E') && nearCabinet) {
                handleLaunchGame(nearCabinet.id as GameId);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [nearCabinet, handleLaunchGame]);

    return (
        <div className="relative w-full h-[75vh] md:h-[80vh] border border-cyan-500/40 bg-black overflow-hidden shadow-[0_0_35px_rgba(0,243,255,0.2)]">
            <Canvas
                camera={{ position: [0, 1.6, 5], fov: 65 }}
                className="w-full h-full cursor-crosshair"
            >
                <color attach="background" args={['#03050a']} />
                <Suspense fallback={null}>
                    <ArcadeRoom games={games} nearCabinet={nearCabinet} />
                    <ArcadeControls
                        cabinets={cabinetTargets}
                        onNearCabinet={setNearCabinet}
                    />
                </Suspense>
            </Canvas>

            {/* Proximity Prompt */}
            {nearCabinet && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
                    <div className="flex flex-col items-center bg-[#080d1a]/90 border border-cyan-400 px-6 py-4 backdrop-blur-md shadow-[0_0_25px_rgba(0,243,255,0.4)] animate-pulse">
                        <Gamepad2 className="w-6 h-6 text-cyan-400 mb-2" />
                        <span className="font-cyber font-bold text-white text-base md:text-lg tracking-wider mb-1">
                            {nearCabinet.title}
                        </span>
                        <span className="font-arcade text-xs text-[#00f3ff] tracking-widest">
                            [PRESS E TO PLAY]
                        </span>
                    </div>
                </div>
            )}

            {/* HUD Navigation Hints */}
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
        </div>
    );
};
// src/App.tsx
import { useState } from 'react';
import { Monitor, Volume2, VolumeX, Terminal, ShieldAlert } from 'lucide-react';
import { sound } from './audio/NeonAudioSynth';
import { CyberBackground } from './components/layout/CyberBackground';
import { CRTOverlay } from './components/ui/CRTOverlay';
import { GameCard } from './components/ui/GameCard';
import type { GameId, GameMetadata } from './types/arcade';
import { useHighScore } from './hooks/useHighScore';


import { CyberSnake } from './games/snake';
import { TronPong } from './games/pong';
import { NeonTetris } from './games/tetris';
import { VectorBreakout } from './games/breakout';
import { CyberSlime } from './games/slime';
import { BattleTank } from './games/tank';


const ARCADE_GAMES: GameMetadata[] = [
  // Game cards in mainframe
  {
    id: 'snake',
    node: 'PROTOCOL_01',
    title: 'CYBER SNAKE',
    badge: 'VECTOR ROUTING',
    icon: '🐍',
    accent: 'green',
    description: 'Direct the high-speed luminescent light trail. Harvest rogue energy cores and prevent boundary collisions.',
  },
  {
    id: 'pong',
    node: 'PROTOCOL_02',
    title: 'TRON PONG',
    badge: 'VELOCITY DEFLECTION',
    icon: '🏓',
    accent: 'cyan',
    description: 'High-frequency photon rally against an adaptive defense subroutine. Angle strokes to break the line.',
  },
  {
    id: 'tetris',
    node: 'PROTOCOL_03',
    title: 'NEON TETRIS',
    badge: 'MATRIX PURGE',
    icon: '🧱',
    accent: 'pink',
    description: 'Align descending data blocks to purge completed sectors. Prevent memory stack buffer overflow.',
  },
  {
    id: 'breakout',
    node: 'PROTOCOL_04',
    title: 'VECTOR BREAKOUT',
    badge: 'ENCRYPTION SMASH',
    icon: '⚡',
    accent: 'amber',
    description: 'Demolish defensive firewall shields using variable vector ball reflections and mobile paddle interception.',
  },
  {
    id: 'slime',
    node: 'PROTOCOL_05',
    title: 'CYBER SLIME',
    badge: 'KINETIC VOLLEY',
    icon: '🏐',
    accent: 'purple',
    description: 'Sub-routine kinetic rally match. Execute surface-normal bounces, tactical leaps, and spike volleys.',
  },
  {
    id: 'tank',
    node: 'PROTOCOL_06',
    title: 'VECTOR TANK',
    badge: 'BALLISTIC COMBAT',
    icon: '🎯',
    accent: 'cyan',
    description: 'Navigate maze sectors, angle ricochet shells off reflective vector walls, and eliminate the opposing combat drone.',
  },
];

export default function App() {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [crtActive, setCrtActive] = useState<boolean>(true);
  const [soundActive, setSoundActive] = useState<boolean>(true);

  const { highScore: snakeHighScore } = useHighScore('snake');
  const { highScore: pongHighScore } = useHighScore('pong');
  const { highScore: tetrisHighScore } = useHighScore('tetris');
  const { highScore: breakoutHighScore } = useHighScore('breakout');
  const { highScore: slimeHighScore } = useHighScore('slime');
  const { highScore: tankHighScore } = useHighScore('tank');

  const toggleSound = () => {
    const nextState = !soundActive;
    sound.enabled = nextState;
    setSoundActive(nextState);
    if (nextState) {
      sound.playBlip(580);
    }
  };

  const handleSelectGame = (id: GameId) => {
    sound.playBlip(700);
    setActiveGame(id);
  };

  return (
    <div className="min-h-screen text-[#e0f7fa] flex flex-col justify-between p-4 md:p-8 relative">
      <CyberBackground />
      <CRTOverlay active={crtActive} />

      {/* Top Arcade Chrome Header */}
      <header className="flex flex-wrap items-center justify-between border-b border-cyan-500/30 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#00f3ff]" />
          <div>
            <h1 className="font-cyber font-black tracking-widest text-xl md:text-2xl glow-cyan">
              CYBERGRID <span className="text-[#ff007f] glow-pink">// 99</span>
            </h1>
            <p className="text-[10px] font-arcade text-cyan-400/70 tracking-widest">
              SYSTEM STATUS: ONLINE
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCrtActive((prev) => !prev)}
            className={`p-2 border transition-all cursor-pointer ${crtActive
              ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300 shadow-[0_0_12px_rgba(0,243,255,0.4)]'
              : 'border-gray-800 text-gray-500 hover:border-gray-700'
              }`}
            title="Toggle CRT Scanline Simulation"
          >
            <Monitor className="w-4 h-4" />
          </button>

          <button
            onClick={toggleSound}
            className={`p-2 border transition-all cursor-pointer ${soundActive
              ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300 shadow-[0_0_12px_rgba(57,255,20,0.4)]'
              : 'border-gray-800 text-gray-500 hover:border-gray-700'
              }`}
            title="Toggle Audio Synthesizer"
          >
            {soundActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Arcade Terminal Content */}
      <main className="flex-1 flex flex-col justify-center items-center my-10 max-w-6xl mx-auto w-full">
        {!activeGame ? (
          <div>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-cyan-500/40 bg-cyan-950/20 text-cyan-400 font-arcade text-[10px] mb-3">
                <Terminal className="w-3 h-3" /> SELECT_OPERATIONAL_NODE
              </div>
              <h2 className="font-cyber font-bold text-2xl md:text-3xl text-white tracking-wider glow-cyan">
                ARCADE PROTOCOLS
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ARCADE_GAMES.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  highScore={
                    game.id === 'snake'
                      ? snakeHighScore
                      : game.id === 'pong'
                        ? pongHighScore
                        : game.id === 'tetris'
                          ? tetrisHighScore
                          : game.id === 'breakout'
                            ? breakoutHighScore
                            : game.id === 'slime'
                              ? slimeHighScore
                              : game.id === 'tank'
                                ? tankHighScore
                                : 0
                  }
                  onSelect={handleSelectGame}
                />
              ))}
            </div>
          </div>
        ) : activeGame === 'snake' ? (
          <CyberSnake onExit={() => setActiveGame(null)} />
        ) : activeGame === 'pong' ? (
          <TronPong onExit={() => setActiveGame(null)} />
        ) : activeGame === 'tetris' ? (
          <NeonTetris onExit={() => setActiveGame(null)} />
        ) : activeGame === 'breakout' ? (
          <VectorBreakout onExit={() => setActiveGame(null)} />
        ) : activeGame === 'slime' ? (
          <CyberSlime onExit={() => setActiveGame(null)} />
        ) : activeGame === 'tank' ? (
          <BattleTank onExit={() => setActiveGame(null)} />
        ) : null}
      </main>

      {/* Footer System Telemetry */}
      <footer className="text-center border-t border-cyan-500/20 pt-4 flex flex-col sm:flex-row justify-between items-center text-xs font-mono text-gray-500 gap-2">
        <span>HOST: WSL2 / UBUNTU // RUNTIME: VITE + REACT 19</span>
        <span className="text-cyan-400/80">GRID REFRESH: 60Hz ACTIVE</span>
      </footer>
    </div>
  );
}
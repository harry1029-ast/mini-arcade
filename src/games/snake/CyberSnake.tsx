// src/games/snake/CyberSnake.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../../audio/NeonAudioSynth';
import { useHighScore } from '../../hooks/useHighScore';
import type { Point, Direction, SnakeParticle } from './types';
import { RotateCcw, ArrowLeft, Trophy } from 'lucide-react';

interface CyberSnakeProps {
  onExit: () => void;
}

const GRID_SIZE = 20; // 20x20 grid
const CELL_SIZE = 20; // 400x400 canvas
const INITIAL_SPEED = 110; // ms per step

export const CyberSnake: React.FC<CyberSnakeProps> = ({ onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { highScore, recordScore } = useHighScore('snake');

  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isNewHigh, setIsNewHigh] = useState(false);

  // Engine state stored in refs so the requestAnimationFrame loop always reads fresh values
  const snakeRef = useRef<Point[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ]);
  const dirRef = useRef<Direction>('UP');
  const nextDirRef = useRef<Direction>('UP');
  const foodRef = useRef<Point>({ x: 5, y: 5 });
  const particlesRef = useRef<SnakeParticle[]>([]);
  const lastTickRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const gameOverRef = useRef<boolean>(false);

  // Spawn food at open grid location
  const spawnFood = useCallback(() => {
    let valid = false;
    let newFood: Point = { x: 0, y: 0 };
    while (!valid) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      valid = !snakeRef.current.some((seg) => seg.x === newFood.x && seg.y === newFood.y);
    }
    foodRef.current = newFood;
  }, []);

  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      particlesRef.current.push({
        x: x * CELL_SIZE + CELL_SIZE / 2,
        y: y * CELL_SIZE + CELL_SIZE / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color,
      });
    }
  };

  const resetGame = useCallback(() => {
    snakeRef.current = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ];
    dirRef.current = 'UP';
    nextDirRef.current = 'UP';
    particlesRef.current = [];
    scoreRef.current = 0;
    gameOverRef.current = false;
    setScore(0);
    setGameOver(false);
    setIsNewHigh(false);
    spawnFood();
    sound.playBlip(600);
  }, [spawnFood]);

  const changeDirection = useCallback((newDir: Direction) => {
    const cur = dirRef.current;
    if (newDir === 'UP' && cur !== 'DOWN') nextDirRef.current = 'UP';
    if (newDir === 'DOWN' && cur !== 'UP') nextDirRef.current = 'DOWN';
    if (newDir === 'LEFT' && cur !== 'RIGHT') nextDirRef.current = 'LEFT';
    if (newDir === 'RIGHT' && cur !== 'LEFT') nextDirRef.current = 'RIGHT';
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          changeDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          changeDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          changeDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          changeDirection('RIGHT');
          break;
        case 'r':
        case 'R':
          if (gameOverRef.current) resetGame();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, resetGame]);

  // Main Canvas & Game Loop
  useEffect(() => {
    spawnFood();
    let animId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      // 1. Logic Tick
      if (!lastTickRef.current) lastTickRef.current = timestamp;
      const progress = timestamp - lastTickRef.current;

      const currentSpeed = Math.max(50, INITIAL_SPEED - Math.floor(scoreRef.current / 50) * 5);

      if (progress > currentSpeed && !gameOverRef.current) {
        lastTickRef.current = timestamp;
        dirRef.current = nextDirRef.current;

        const head = { ...snakeRef.current[0] };
        if (dirRef.current === 'UP') head.y -= 1;
        if (dirRef.current === 'DOWN') head.y += 1;
        if (dirRef.current === 'LEFT') head.x -= 1;
        if (dirRef.current === 'RIGHT') head.x += 1;

        // Wall collisions
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          gameOverRef.current = true;
          setGameOver(true);
          sound.playExplosion();
          const isHigh = recordScore(scoreRef.current);
          if (isHigh) setIsNewHigh(true);
        }

        // Self collisions
        if (!gameOverRef.current) {
          for (let i = 0; i < snakeRef.current.length; i++) {
            if (head.x === snakeRef.current[i].x && head.y === snakeRef.current[i].y) {
              gameOverRef.current = true;
              setGameOver(true);
              sound.playExplosion();
              const isHigh = recordScore(scoreRef.current);
              if (isHigh) setIsNewHigh(true);
              break;
            }
          }
        }

        if (!gameOverRef.current) {
          snakeRef.current.unshift(head);

          // Food pickup
          if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
            scoreRef.current += 10;
            setScore(scoreRef.current);
            sound.playBlip(750, 'square', 0.1);
            spawnParticles(foodRef.current.x, foodRef.current.y, '#39ff14');
            spawnFood();
          } else {
            snakeRef.current.pop();
          }
        }
      }

      // 2. Render Canvas Frame
      ctx.fillStyle = '#04060d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle interior grid
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= canvas.width; i += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Render Food with Pulse
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#39ff14';
      ctx.fillStyle = '#39ff14';
      ctx.beginPath();
      ctx.arc(
        foodRef.current.x * CELL_SIZE + CELL_SIZE / 2,
        foodRef.current.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2.5,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Render Snake Body & Glow
      snakeRef.current.forEach((seg, i) => {
        ctx.shadowBlur = i === 0 ? 15 : 6;
        ctx.shadowColor = i === 0 ? '#00f3ff' : '#00a8ff';
        ctx.fillStyle = i === 0 ? '#00f3ff' : '#0066aa';
        ctx.fillRect(
          seg.x * CELL_SIZE + 1,
          seg.y * CELL_SIZE + 1,
          CELL_SIZE - 2,
          CELL_SIZE - 2
        );
      });
      ctx.shadowBlur = 0;

      // Update & Render Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;
        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, 3, 3);
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [spawnFood, recordScore]);

  return (
    <div className="flex flex-col items-center max-w-md mx-auto w-full">
      {/* Top Game Navigation / HUD */}
      <div className="flex items-center justify-between w-full mb-3 px-1">
        <button
          onClick={() => {
            sound.playBlip(300);
            onExit();
          }}
          className="flex items-center gap-1.5 px-3 py-1 border border-pink-500/50 hover:bg-pink-500/20 text-xs font-arcade text-[#ff007f] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> DECK
        </button>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-arcade text-yellow-400">
            <Trophy className="w-3.5 h-3.5" />
            <span>{highScore.toString().padStart(4, '0')}</span>
          </div>
          <div className="text-xs font-arcade text-cyan-300">
            SCORE <span className="text-white">{score.toString().padStart(4, '0')}</span>
          </div>
        </div>
      </div>

      {/* Screen Frame & Canvas */}
      <div className="relative border-2 border-cyan-400/80 p-1 bg-black shadow-[0_0_20px_rgba(0,243,255,0.3)]">
        <canvas
          ref={canvasRef}
          width={GRID_SIZE * CELL_SIZE}
          height={GRID_SIZE * CELL_SIZE}
          className="block"
        />

        {/* Game Over Modal Screen */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center backdrop-blur-xs">
            <p className="font-cyber font-black text-2xl text-red-500 tracking-wider mb-2 drop-shadow-[0_0_10px_#ff0055]">
              SIGNAL TERMINATED
            </p>
            {isNewHigh && (
              <p className="font-arcade text-xs text-yellow-400 mb-4 animate-pulse">
                ★ NEW HIGH SCORE RECORDED ★
              </p>
            )}
            <p className="font-arcade text-xs text-gray-400 mb-6">
              FINAL SCORE: {score}
            </p>
            <button
              onClick={resetGame}
              className="flex items-center gap-2 px-4 py-2 border border-cyan-400 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-400 hover:text-black font-arcade text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(0,243,255,0.4)]"
            >
              <RotateCcw className="w-4 h-4" /> REBOOT VECTOR [R]
            </button>
          </div>
        )}
      </div>

      {/* Touch D-Pad for Mobile */}
      <div className="grid grid-cols-3 gap-2 mt-6 w-44 md:hidden">
        <div />
        <button
          onClick={() => changeDirection('UP')}
          className="p-3 border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-arcade text-xs active:bg-cyan-400 active:text-black"
        >
          ▲
        </button>
        <div />
        <button
          onClick={() => changeDirection('LEFT')}
          className="p-3 border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-arcade text-xs active:bg-cyan-400 active:text-black"
        >
          ◀
        </button>
        <button
          onClick={() => changeDirection('DOWN')}
          className="p-3 border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-arcade text-xs active:bg-cyan-400 active:text-black"
        >
          ▼
        </button>
        <button
          onClick={() => changeDirection('RIGHT')}
          className="p-3 border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-arcade text-xs active:bg-cyan-400 active:text-black"
        >
          ▶
        </button>
      </div>

      <div className="mt-4 text-[10px] font-mono text-gray-500 hidden md:block">
        CONTROL: [W,A,S,D] OR [ARROWS] // RESTART: [R]
      </div>
    </div>
  );
};
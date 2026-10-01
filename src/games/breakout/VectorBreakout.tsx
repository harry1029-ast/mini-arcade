// src/games/breakout/VectorBreakout.tsx
import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { sound } from '../../audio/NeonAudioSynth';
import { useHighScore } from '../../hooks/useHighScore';
import type { BreakoutBrick, BreakoutBall, BreakoutPaddle, BreakoutParticle } from './types';
import { RotateCcw, ArrowLeft, Trophy, Heart } from 'lucide-react';

interface VectorBreakoutProps {
  onExit: () => void;
}

const WIDTH = 600;
const HEIGHT = 460;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_HEIGHT = 16;
const BRICK_GAP = 6;
const PADDLE_WIDTH = 90;
const PADDLE_HEIGHT = 12;
const BALL_RADIUS = 6;
const INITIAL_LIVES = 3;

const ROW_COLORS = [
  { color: '#ff007f', glow: '#ff007f', points: 50 }, // Pink
  { color: '#ffaa00', glow: '#ffaa00', points: 40 }, // Amber
  { color: '#39ff14', glow: '#39ff14', points: 30 }, // Green
  { color: '#00f3ff', glow: '#00f3ff', points: 20 }, // Cyan
  { color: '#bc13fe', glow: '#bc13fe', points: 10 }, // Purple
];

const VectorBreakoutComponent: React.FC<VectorBreakoutProps> = ({ onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { highScore, recordScore } = useHighScore('breakout');

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [gameState, setGameState] = useState<'PLAYING' | 'WON' | 'LOST'>('PLAYING');
  const [isNewHigh, setIsNewHigh] = useState(false);

  // Synchronous refs for canvas loop
  const paddleRef = useRef<BreakoutPaddle>({
    x: WIDTH / 2 - PADDLE_WIDTH / 2,
    y: HEIGHT - 35,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    speed: 7.5,
  });

  const ballRef = useRef<BreakoutBall>({
    x: WIDTH / 2,
    y: HEIGHT - 35 - BALL_RADIUS,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    speed: 5.5,
    staged: true,
  });

  const bricksRef = useRef<BreakoutBrick[]>([]);
  const particlesRef = useRef<BreakoutParticle[]>([]);
  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const scoreRef = useRef(0);
  const livesRef = useRef(INITIAL_LIVES);
  const gameStateRef = useRef<'PLAYING' | 'WON' | 'LOST'>('PLAYING');

  const lastTimeRef = useRef<number>(0);

  const recordScoreRef = useRef(recordScore);
  recordScoreRef.current = recordScore;

  const initBricks = useCallback(() => {
    const bricks: BreakoutBrick[] = [];
    const totalGapWidth = (BRICK_COLS - 1) * BRICK_GAP;
    const paddingX = 30;
    const availableWidth = WIDTH - paddingX * 2 - totalGapWidth;
    const brickWidth = availableWidth / BRICK_COLS;

    for (let r = 0; r < BRICK_ROWS; r++) {
      const rowCfg = ROW_COLORS[r];
      for (let c = 0; c < BRICK_COLS; c++) {
        const bx = paddingX + c * (brickWidth + BRICK_GAP);
        const by = 50 + r * (BRICK_HEIGHT + BRICK_GAP);
        bricks.push({
          x: bx,
          y: by,
          width: brickWidth,
          height: BRICK_HEIGHT,
          color: rowCfg.color,
          glow: rowCfg.glow,
          points: rowCfg.points,
          hits: 1,
          alive: true,
        });
      }
    }
    bricksRef.current = bricks;
  }, []);

  const spawnParticles = (x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color,
      });
    }
  };

  const launchBall = useCallback(() => {
    if (!ballRef.current.staged || gameStateRef.current !== 'PLAYING') return;
    const angle = -Math.PI / 4 + (Math.random() * Math.PI) / 8; // ~45 deg upward
    ballRef.current.staged = false;
    ballRef.current.vx = ballRef.current.speed * Math.cos(angle);
    ballRef.current.vy = -Math.abs(ballRef.current.speed * Math.sin(angle));
    sound.playBlip(700, 'sine', 0.05);
  }, []);

  const resetBall = useCallback(() => {
    const paddle = paddleRef.current;
    ballRef.current = {
      x: paddle.x + paddle.width / 2,
      y: paddle.y - BALL_RADIUS - 1,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      speed: 5.5,
      staged: true,
    };
  }, []);

  const resetGame = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = INITIAL_LIVES;
    gameStateRef.current = 'PLAYING';
    particlesRef.current = [];
    setScore(0);
    setLives(INITIAL_LIVES);
    setGameState('PLAYING');
    setIsNewHigh(false);

    paddleRef.current.x = WIDTH / 2 - PADDLE_WIDTH / 2;
    initBricks();
    resetBall();
    sound.playBlip(600);
  }, [initBricks, resetBall]);

  // Key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        keysRef.current.left = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        keysRef.current.right = true;
      }
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        launchBall();
      }
      if ((e.key === 'r' || e.key === 'R') && gameStateRef.current !== 'PLAYING') {
        resetGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysRef.current.left = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysRef.current.right = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [launchBall, resetGame]);

  // Main Canvas & Physics Loop
  useEffect(() => {
    initBricks();
    resetBall();
    let animId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {

      // 1. Calculate Delta Time (baseline: 60fps = 16.67ms)
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      const dt = Math.min(Math.max(elapsed / 16.667, 0.2), 2.5);

      const paddle = paddleRef.current;
      const ball = ballRef.current;

      if (gameStateRef.current === 'PLAYING') {
        // 1. Move Paddle (scaled by dt)
        if (keysRef.current.left && paddle.x > 0) {
          paddle.x -= paddle.speed * dt;
        }
        if (keysRef.current.right && paddle.x + paddle.width < WIDTH) {
          paddle.x += paddle.speed * dt;
        }

        // Staged ball stays centered on paddle
        if (ball.staged) {
          ball.x = paddle.x + paddle.width / 2;
          ball.y = paddle.y - ball.radius - 1;
        } else {
          // Move Ball
          ball.x += ball.vx * dt;
          ball.y += ball.vy * dt;

          // Side wall bounce
          if (ball.x - ball.radius <= 0) {
            ball.x = ball.radius;
            ball.vx = -ball.vx;
            sound.playBounce();
            spawnParticles(ball.x, ball.y, '#00f3ff', 6);
          } else if (ball.x + ball.radius >= WIDTH) {
            ball.x = WIDTH - ball.radius;
            ball.vx = -ball.vx;
            sound.playBounce();
            spawnParticles(ball.x, ball.y, '#00f3ff', 6);
          }

          // Top ceiling bounce
          if (ball.y - ball.radius <= 0) {
            ball.y = ball.radius;
            ball.vy = -ball.vy;
            sound.playBounce();
            spawnParticles(ball.x, ball.y, '#00f3ff', 6);
          }

          // Paddle collision
          if (
            ball.y + ball.radius >= paddle.y &&
            ball.y - ball.radius <= paddle.y + paddle.height &&
            ball.x >= paddle.x &&
            ball.x <= paddle.x + paddle.width &&
            ball.vy > 0
          ) {
            const impact = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
            const maxAngle = (Math.PI / 3); // 60 degrees
            const angle = impact * maxAngle;
            ball.speed = Math.min(10.5, ball.speed + 0.15);
            ball.vx = ball.speed * Math.sin(angle);
            ball.vy = -Math.abs(ball.speed * Math.cos(angle));
            sound.playBlip(620, 'triangle', 0.05);
            spawnParticles(ball.x, paddle.y, '#00f3ff', 8);
          }

          // Brick AABB collision
          for (const brick of bricksRef.current) {
            if (!brick.alive) continue;

            if (
              ball.x + ball.radius >= brick.x &&
              ball.x - ball.radius <= brick.x + brick.width &&
              ball.y + ball.radius >= brick.y &&
              ball.y - ball.radius <= brick.y + brick.height
            ) {
              brick.alive = false;
              scoreRef.current += brick.points;
              setScore(scoreRef.current);
              sound.playBlip(750, 'square', 0.06);
              spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 14);

              // Determine collision normal (vertical vs horizontal penetration)
              const prevX = ball.x - ball.vx * dt;
              const prevY = ball.y - ball.vy * dt;

              if (prevX + ball.radius < brick.x || prevX - ball.radius > brick.x + brick.width) {
                ball.vx = -ball.vx;
              } else {
                ball.vy = -ball.vy;
              }

              // Win check
              if (bricksRef.current.every((b) => !b.alive)) {
                gameStateRef.current = 'WON';
                setGameState('WON');
                sound.playChime();
                const isHigh = recordScoreRef.current(scoreRef.current);
                if (isHigh) setIsNewHigh(true);
              }
              break;
            }
          }

          // Bottom pit out (Lose life)
          if (ball.y - ball.radius > HEIGHT) {
            livesRef.current -= 1;
            setLives(livesRef.current);
            sound.playExplosion();
            spawnParticles(ball.x, HEIGHT - 10, '#ff007f', 16);

            if (livesRef.current <= 0) {
              gameStateRef.current = 'LOST';
              setGameState('LOST');
              const isHigh = recordScoreRef.current(scoreRef.current);
              if (isHigh) setIsNewHigh(true);
            } else {
              resetBall();
            }
          }
        }
      }

      // 2. Render Frame
      ctx.fillStyle = '#04060d';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Subtle background grid lines
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= WIDTH; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();
      }

      // Draw Bricks
      for (const b of bricksRef.current) {
        if (!b.alive) continue;
        ctx.shadowBlur = 10;
        ctx.shadowColor = b.glow;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.width, b.height);
      }

      // Draw Paddle (Cyan)
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#00f3ff';
      ctx.fillStyle = '#00f3ff';
      ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

      // Draw Ball (White photon)
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#ffffff';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Particles (scaled by dt)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.alpha -= 0.03 * dt;
        if (pt.alpha <= 0) {
          particlesRef.current.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = pt.alpha;
          ctx.fillStyle = pt.color;
          ctx.fillRect(pt.x, pt.y, 3, 3);
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    // Reset timestamp so the first frame doesn't spike
    lastTimeRef.current = 0;
    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [initBricks, resetBall]);

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto w-full">
      {/* Top HUD */}
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

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5 text-xs font-arcade text-yellow-400">
            <Trophy className="w-3.5 h-3.5" />
            <span>{highScore.toString().padStart(5, '0')}</span>
          </div>

          <div className="flex items-center gap-1 text-xs font-arcade text-red-400">
            {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
              <Heart
                key={i}
                className={`w-3.5 h-3.5 ${i < lives ? 'fill-red-500 text-red-500' : 'text-gray-700'
                  }`}
              />
            ))}
          </div>

          <div className="text-xs font-arcade text-cyan-300">
            SCORE <span className="text-white">{score.toString().padStart(5, '0')}</span>
          </div>
        </div>
      </div>

      {/* Screen Frame & Canvas */}
      <div className="relative border-2 border-amber-500/80 p-1 bg-black shadow-[0_0_20px_rgba(255,170,0,0.25)]">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block w-full max-w-[600px] h-auto"
        />

        {/* Staged Ball Instruction Prompt */}
        {ballRef.current.staged && gameState === 'PLAYING' && (
          <div className="absolute bottom-16 left-0 right-0 text-center pointer-events-none">
            <span className="font-arcade text-[10px] text-amber-400 tracking-wider animate-pulse bg-black/60 px-3 py-1 border border-amber-500/40">
              PRESS [SPACE] OR [W] TO LAUNCH PHOTON
            </span>
          </div>
        )}

        {/* Win / Loss Screen */}
        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center backdrop-blur-xs">
            <p
              className={`font-cyber font-black text-2xl tracking-wider mb-2 ${gameState === 'WON'
                ? 'text-cyan-400 drop-shadow-[0_0_10px_#00f3ff]'
                : 'text-red-500 drop-shadow-[0_0_10px_#ff0055]'
                }`}
            >
              {gameState === 'WON' ? 'FIREWALL BYPASSED' : 'CORE SHUTDOWN'}
            </p>
            {isNewHigh && (
              <p className="font-arcade text-xs text-yellow-400 mb-4 animate-pulse">
                ★ NEW HIGH SCORE RECORDED ★
              </p>
            )}
            <p className="font-arcade text-xs text-gray-400 mb-6">FINAL SCORE: {score}</p>
            <button
              onClick={resetGame}
              className="flex items-center gap-2 px-4 py-2 border border-amber-400 bg-amber-500/20 text-amber-300 hover:bg-amber-400 hover:text-black font-arcade text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(255,170,0,0.4)]"
            >
              <RotateCcw className="w-4 h-4" /> REBOOT PROTOCOL [R]
            </button>
          </div>
        )}
      </div>

      {/* Mobile Touch Controls */}
      <div className="flex gap-4 mt-6 md:hidden touch-control">
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            keysRef.current.left = true;
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            keysRef.current.left = false;
          }}
          className="p-4 border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-arcade text-sm active:bg-cyan-400 active:text-black touch-control"
        >
          ◀ LEFT
        </button>
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            launchBall();
          }}
          className="p-4 border border-amber-500/40 bg-amber-950/40 text-amber-300 font-arcade text-sm active:bg-amber-400 active:text-black touch-control"
        >
          LAUNCH
        </button>
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            keysRef.current.right = true;
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            keysRef.current.right = false;
          }}
          className="p-4 border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-arcade text-sm active:bg-cyan-400 active:text-black touch-control"
        >
          RIGHT ▶
        </button>
      </div>

      <div className="mt-4 text-[10px] font-mono text-gray-500 hidden md:block">
        STEER: [A / D] OR [ARROWS] // LAUNCH: [SPACE] // REBOOT: [R]
      </div>
    </div>
  );
};

export const VectorBreakout = memo(VectorBreakoutComponent);
// src/games/pong/TronPong.tsx
import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { sound } from '../../audio/NeonAudioSynth';
import { useHighScore } from '../../hooks/useHighScore';
import type { PongBall, Paddle, PongParticle } from './types';
import { RotateCcw, ArrowLeft, Trophy } from 'lucide-react';

interface TronPongProps {
  onExit: () => void;
}

const WIDTH = 600;
const HEIGHT = 400;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 70;
const BALL_RADIUS = 6;
const WINNING_SCORE = 7;

const TronPongComponent: React.FC<TronPongProps> = ({ onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { highScore, recordScore } = useHighScore('pong');

  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [winner, setWinner] = useState<'PLAYER' | 'AI' | null>(null);

  // Synchronous refs for 60fps canvas loop
  const ballRef = useRef<PongBall>({
    x: WIDTH / 2,
    y: HEIGHT / 2,
    vx: 5,
    vy: 0,
    radius: BALL_RADIUS,
    speed: 5.5,
  });

  const playerRef = useRef<Paddle>({
    x: 20,
    y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    speed: 6.5,
  });

  const aiRef = useRef<Paddle>({
    x: WIDTH - 20 - PADDLE_WIDTH,
    y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    speed: 4.8,
  });

  const particlesRef = useRef<PongParticle[]>([]);
  const keysRef = useRef<{ up: boolean; down: boolean }>({ up: false, down: false });
  const playerScoreRef = useRef(0);
  const aiScoreRef = useRef(0);
  const winnerRef = useRef<'PLAYER' | 'AI' | null>(null);
  const recordScoreRef = useRef(recordScore);
  recordScoreRef.current = recordScore;

  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
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

  const resetBall = useCallback((towardPlayer: boolean) => {
    const angle = (Math.random() * Math.PI) / 3 - Math.PI / 6; // -30 to +30 deg
    const baseSpeed = 5.5;
    ballRef.current = {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      vx: (towardPlayer ? -1 : 1) * baseSpeed * Math.cos(angle),
      vy: baseSpeed * Math.sin(angle),
      radius: BALL_RADIUS,
      speed: baseSpeed,
    };
  }, []);

  const resetMatch = useCallback(() => {
    playerScoreRef.current = 0;
    aiScoreRef.current = 0;
    winnerRef.current = null;
    setPlayerScore(0);
    setAiScore(0);
    setWinner(null);
    particlesRef.current = [];
    playerRef.current.y = HEIGHT / 2 - PADDLE_HEIGHT / 2;
    aiRef.current.y = HEIGHT / 2 - PADDLE_HEIGHT / 2;
    resetBall(Math.random() > 0.5);
    sound.playBlip(550);
  }, [resetBall]);

  // Key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        keysRef.current.up = true;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        keysRef.current.down = true;
      }
      if ((e.key === 'r' || e.key === 'R') && winnerRef.current) {
        resetMatch();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        keysRef.current.up = false;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        keysRef.current.down = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [resetMatch]);

  // Canvas render & physics loop
  useEffect(() => {
    resetBall(false);
    let animId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      if (!winnerRef.current) {
        const ball = ballRef.current;
        const player = playerRef.current;
        const ai = aiRef.current;

        // 1. Move Player
        if (keysRef.current.up && player.y > 0) {
          player.y -= player.speed;
        }
        if (keysRef.current.down && player.y + player.height < HEIGHT) {
          player.y += player.speed;
        }

        // 2. Reactive AI Tracking
        const aiTarget = ball.y - ai.height / 2;
        const aiDiff = aiTarget - ai.y;
        if (Math.abs(aiDiff) > 8) {
          ai.y += Math.sign(aiDiff) * ai.speed;
        }
        ai.y = Math.max(0, Math.min(HEIGHT - ai.height, ai.y));

        // 3. Move Ball
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Top / Bottom wall bounds
        if (ball.y - ball.radius <= 0) {
          ball.y = ball.radius;
          ball.vy = -ball.vy;
          sound.playBounce();
          spawnParticles(ball.x, ball.y, '#00f3ff');
        } else if (ball.y + ball.radius >= HEIGHT) {
          ball.y = HEIGHT - ball.radius;
          ball.vy = -ball.vy;
          sound.playBounce();
          spawnParticles(ball.x, ball.y, '#00f3ff');
        }

        // Paddle Collision - Player (Left)
        if (
          ball.x - ball.radius <= player.x + player.width &&
          ball.x + ball.radius >= player.x &&
          ball.y >= player.y &&
          ball.y <= player.y + player.height &&
          ball.vx < 0
        ) {
          const impact = (ball.y - (player.y + player.height / 2)) / (player.height / 2);
          const maxAngle = (Math.PI / 4) * 1.1; // ~50 degrees
          const angle = impact * maxAngle;
          ball.speed = Math.min(13, ball.speed + 0.35);
          ball.vx = Math.abs(ball.speed * Math.cos(angle));
          ball.vy = ball.speed * Math.sin(angle);
          sound.playBlip(620, 'triangle', 0.06);
          spawnParticles(player.x + player.width, ball.y, '#00f3ff');
        }

        // Paddle Collision - AI (Right)
        if (
          ball.x + ball.radius >= ai.x &&
          ball.x - ball.radius <= ai.x + ai.width &&
          ball.y >= ai.y &&
          ball.y <= ai.y + ai.height &&
          ball.vx > 0
        ) {
          const impact = (ball.y - (ai.y + ai.height / 2)) / (ai.height / 2);
          const maxAngle = (Math.PI / 4) * 1.1;
          const angle = impact * maxAngle;
          ball.speed = Math.min(13, ball.speed + 0.35);
          ball.vx = -Math.abs(ball.speed * Math.cos(angle));
          ball.vy = ball.speed * Math.sin(angle);
          sound.playBlip(520, 'triangle', 0.06);
          spawnParticles(ai.x, ball.y, '#ff007f');
        }

        // Scoring Checks
        if (ball.x + ball.radius < 0) {
          // AI Point
          aiScoreRef.current += 1;
          setAiScore(aiScoreRef.current);
          sound.playExplosion();
          spawnParticles(10, ball.y, '#ff007f');

          if (aiScoreRef.current >= WINNING_SCORE) {
            winnerRef.current = 'AI';
            setWinner('AI');
          } else {
            resetBall(false);
          }
        } else if (ball.x - ball.radius > WIDTH) {
          // Player Point
          playerScoreRef.current += 1;
          setPlayerScore(playerScoreRef.current);
          sound.playChime();
          spawnParticles(WIDTH - 10, ball.y, '#00f3ff');
          recordScoreRef.current(playerScoreRef.current);

          if (playerScoreRef.current >= WINNING_SCORE) {
            winnerRef.current = 'PLAYER';
            setWinner('PLAYER');
          } else {
            resetBall(true);
          }
        }
      }

      // 4. Render Canvas Frame
      ctx.fillStyle = '#04060d';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Center Divider Net
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(WIDTH / 2, 0);
      ctx.lineTo(WIDTH / 2, HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Player Paddle (Cyan)
      const p = playerRef.current;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00f3ff';
      ctx.fillStyle = '#00f3ff';
      ctx.fillRect(p.x, p.y, p.width, p.height);

      // Draw AI Paddle (Pink)
      const a = aiRef.current;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ff007f';
      ctx.fillStyle = '#ff007f';
      ctx.fillRect(a.x, a.y, a.width, a.height);

      // Draw Ball
      const b = ballRef.current;
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#ffffff';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.035;
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

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [resetBall]);

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

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-1.5 text-xs font-arcade text-yellow-400">
            <Trophy className="w-3.5 h-3.5" />
            <span>RECORD: {highScore.toString().padStart(2, '0')}</span>
          </div>

          <div className="flex items-center gap-4 text-sm font-arcade">
            <span className="text-cyan-400">USER: {playerScore}</span>
            <span className="text-gray-600">|</span>
            <span className="text-pink-400">AI: {aiScore}</span>
          </div>
        </div>
      </div>

      {/* Screen Frame & Canvas */}
      <div className="relative border-2 border-cyan-400/80 p-1 bg-black shadow-[0_0_20px_rgba(0,243,255,0.3)]">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block w-full max-w-[600px] h-auto"
        />

        {/* Win/Loss Modal Screen */}
        {winner && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center backdrop-blur-xs">
            <p
              className={`font-cyber font-black text-2xl tracking-wider mb-2 ${
                winner === 'PLAYER'
                  ? 'text-cyan-400 drop-shadow-[0_0_10px_#00f3ff]'
                  : 'text-red-500 drop-shadow-[0_0_10px_#ff0055]'
              }`}
            >
              {winner === 'PLAYER' ? 'SECTOR SECURED' : 'BREACH DETECTED'}
            </p>
            <p className="font-arcade text-xs text-gray-400 mb-6">
              FINAL SCORE: {playerScore} - {aiScore}
            </p>
            <button
              onClick={resetMatch}
              className="flex items-center gap-2 px-4 py-2 border border-cyan-400 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-400 hover:text-black font-arcade text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(0,243,255,0.4)]"
            >
              <RotateCcw className="w-4 h-4" /> PLAY AGAIN [R]
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 text-[10px] font-mono text-gray-500">
        DEFLECTION CONTROLS: [W / S] OR [UP / DOWN] // RESTART: [R]
      </div>
    </div>
  );
};

export const TronPong = memo(TronPongComponent);
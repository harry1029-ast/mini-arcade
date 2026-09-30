// src/games/slime/CyberSlime.tsx
import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { sound } from '../../audio/NeonAudioSynth';
import { useHighScore } from '../../hooks/useHighScore';
import type { SlimeEntity, SlimeBall, SlimeParticle } from './types';
import { RotateCcw, ArrowLeft, Trophy } from 'lucide-react';

interface CyberSlimeProps {
  onExit: () => void;
}

const WIDTH = 640;
const HEIGHT = 380;
const GROUND_Y = HEIGHT - 40;
const SLIME_RADIUS = 45;
const BALL_RADIUS = 10;
const NET_WIDTH = 8;
const NET_HEIGHT = 50;
const GRAVITY = 0.38;
const JUMP_POWER = -9.2;
const MOVE_SPEED = 4.8;
const WINNING_SCORE = 6;

const CyberSlimeComponent: React.FC<CyberSlimeProps> = ({ onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { highScore, recordScore } = useHighScore('slime');

  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [winner, setWinner] = useState<'PLAYER' | 'AI' | null>(null);

  // Synchronous refs for canvas loop
  const playerRef = useRef<SlimeEntity>({
    x: 140,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    radius: SLIME_RADIUS,
    color: '#bc13fe', // Neon Purple
    glow: '#bc13fe',
    isJumping: false,
  });

  const aiRef = useRef<SlimeEntity>({
    x: WIDTH - 140,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    radius: SLIME_RADIUS,
    color: '#00f3ff', // Neon Cyan
    glow: '#00f3ff',
    isJumping: false,
  });

  const ballRef = useRef<SlimeBall>({
    x: 140,
    y: 120,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
  });

  const particlesRef = useRef<SlimeParticle[]>([]);
  const keysRef = useRef<{ left: boolean; right: boolean; jump: boolean }>({
    left: false,
    right: false,
    jump: false,
  });

  const playerScoreRef = useRef(0);
  const aiScoreRef = useRef(0);
  const winnerRef = useRef<'PLAYER' | 'AI' | null>(null);
  const recordScoreRef = useRef(recordScore);
  recordScoreRef.current = recordScore;

  const spawnParticles = (x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
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

  const serveBall = useCallback((towardPlayer: boolean) => {
    ballRef.current = {
      x: towardPlayer ? 140 : WIDTH - 140,
      y: 130,
      vx: towardPlayer ? 1.5 : -1.5,
      vy: -2,
      radius: BALL_RADIUS,
    };
    playerRef.current.x = 140;
    playerRef.current.y = GROUND_Y;
    playerRef.current.vx = 0;
    playerRef.current.vy = 0;
    playerRef.current.isJumping = false;

    aiRef.current.x = WIDTH - 140;
    aiRef.current.y = GROUND_Y;
    aiRef.current.vx = 0;
    aiRef.current.vy = 0;
    aiRef.current.isJumping = false;
  }, []);

  const resetMatch = useCallback(() => {
    playerScoreRef.current = 0;
    aiScoreRef.current = 0;
    winnerRef.current = null;
    setPlayerScore(0);
    setAiScore(0);
    setWinner(null);
    particlesRef.current = [];
    serveBall(true);
    sound.playBlip(550);
  }, [serveBall]);

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
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        e.preventDefault();
        keysRef.current.jump = true;
      }
      if ((e.key === 'r' || e.key === 'R') && winnerRef.current) {
        resetMatch();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysRef.current.left = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysRef.current.right = false;
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        keysRef.current.jump = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [resetMatch]);

  // 60FPS Canvas Render & Physics Loop
  useEffect(() => {
    serveBall(true);
    let animId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      if (!winnerRef.current) {
        const player = playerRef.current;
        const ai = aiRef.current;
        const ball = ballRef.current;
        const netX = WIDTH / 2;

        // 1. Move Player
        if (keysRef.current.left) player.vx = -MOVE_SPEED;
        else if (keysRef.current.right) player.vx = MOVE_SPEED;
        else player.vx = 0;

        if (keysRef.current.jump && !player.isJumping) {
          player.vy = JUMP_POWER;
          player.isJumping = true;
          sound.playBlip(380, 'triangle', 0.05);
        }

        player.vy += GRAVITY;
        player.x += player.vx;
        player.y += player.vy;

        // Player bounds (Left court + Net constraint)
        if (player.x - player.radius < 0) player.x = player.radius;
        if (player.x + player.radius > netX - NET_WIDTH / 2) {
          player.x = netX - NET_WIDTH / 2 - player.radius;
        }
        if (player.y >= GROUND_Y) {
          player.y = GROUND_Y;
          player.vy = 0;
          player.isJumping = false;
        }

        // 2. Reactive AI Logic
        const aiTarget = ball.x > netX ? ball.x : WIDTH - 120;
        const distToBall = aiTarget - ai.x;
        if (Math.abs(distToBall) > 10) {
          ai.vx = Math.sign(distToBall) * (MOVE_SPEED * 0.88);
        } else {
          ai.vx = 0;
        }

        // AI Jump trigger when ball is nearby on AI side
        if (
          ball.x > netX &&
          ball.x > ai.x - 30 &&
          ball.x < ai.x + 30 &&
          ball.y < GROUND_Y - 40 &&
          ball.vy > 0 &&
          !ai.isJumping
        ) {
          ai.vy = JUMP_POWER;
          ai.isJumping = true;
        }

        ai.vy += GRAVITY;
        ai.x += ai.vx;
        ai.y += ai.vy;

        // AI Bounds (Right court + Net constraint)
        if (ai.x - ai.radius < netX + NET_WIDTH / 2) {
          ai.x = netX + NET_WIDTH / 2 + ai.radius;
        }
        if (ai.x + ai.radius > WIDTH) ai.x = WIDTH - ai.radius;
        if (ai.y >= GROUND_Y) {
          ai.y = GROUND_Y;
          ai.vy = 0;
          ai.isJumping = false;
        }

        // 3. Move Ball with Gravity
        ball.vy += GRAVITY * 0.65;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Outer wall bounces
        if (ball.x - ball.radius <= 0) {
          ball.x = ball.radius;
          ball.vx = -ball.vx * 0.85;
          sound.playBounce();
          spawnParticles(ball.x, ball.y, '#00f3ff', 5);
        } else if (ball.x + ball.radius >= WIDTH) {
          ball.x = WIDTH - ball.radius;
          ball.vx = -ball.vx * 0.85;
          sound.playBounce();
          spawnParticles(ball.x, ball.y, '#00f3ff', 5);
        }

        // Net Collision
        const netTop = GROUND_Y - NET_HEIGHT;
        if (
          ball.x + ball.radius >= netX - NET_WIDTH / 2 &&
          ball.x - ball.radius <= netX + NET_WIDTH / 2 &&
          ball.y + ball.radius >= netTop
        ) {
          if (ball.y < netTop + 5) {
            // Bounce on top of post
            ball.y = netTop - ball.radius;
            ball.vy = -Math.abs(ball.vy) * 0.85;
          } else {
            // Bounce off sides of post
            ball.vx = -ball.vx * 0.85;
            if (ball.x < netX) ball.x = netX - NET_WIDTH / 2 - ball.radius;
            else ball.x = netX + NET_WIDTH / 2 + ball.radius;
          }
          sound.playBounce();
          spawnParticles(ball.x, ball.y, '#ffff00', 6);
        }

        // Hemisphere Slime Collisions (Normal Calculation)
        const checkSlimeBounce = (slime: SlimeEntity, isPlayerSlime: boolean) => {
          const dx = ball.x - slime.x;
          const dy = ball.y - slime.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Collision occurs if within radius and ball is above the flat bottom
          if (dist < slime.radius + ball.radius && ball.y <= slime.y) {
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);

            // Position correction
            ball.x = slime.x + nx * (slime.radius + ball.radius);
            ball.y = slime.y + ny * (slime.radius + ball.radius);

            // Reflection blended with slime movement
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            const bounceSpeed = Math.min(11, Math.max(7, speed * 1.05));

            ball.vx = nx * bounceSpeed + slime.vx * 0.35;
            ball.vy = ny * bounceSpeed + slime.vy * 0.35;

            // Ensure ball bounces upward
            if (ball.vy > -3) ball.vy = -6;

            sound.playBlip(isPlayerSlime ? 650 : 520, 'sine', 0.07);
            spawnParticles(ball.x, ball.y, slime.color, 8);
          }
        };

        checkSlimeBounce(player, true);
        checkSlimeBounce(ai, false);

        // Floor / Scoring Condition
        if (ball.y + ball.radius >= GROUND_Y) {
          sound.playExplosion();
          spawnParticles(ball.x, GROUND_Y, '#ff007f', 16);

          if (ball.x < netX) {
            // Landed on player's side: AI Scores
            aiScoreRef.current += 1;
            setAiScore(aiScoreRef.current);

            if (aiScoreRef.current >= WINNING_SCORE) {
              winnerRef.current = 'AI';
              setWinner('AI');
            } else {
              serveBall(false);
            }
          } else {
            // Landed on AI's side: Player Scores
            playerScoreRef.current += 1;
            setPlayerScore(playerScoreRef.current);
            sound.playChime();
            recordScoreRef.current(playerScoreRef.current);

            if (playerScoreRef.current >= WINNING_SCORE) {
              winnerRef.current = 'PLAYER';
              setWinner('PLAYER');
            } else {
              serveBall(true);
            }
          }
        }
      }

      // 4. Render Frame
      ctx.fillStyle = '#04060d';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Floor Line
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f3ff';
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(WIDTH, GROUND_Y);
      ctx.stroke();

      // Net Post
      ctx.fillStyle = '#ffaa00';
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 8;
      ctx.fillRect(WIDTH / 2 - NET_WIDTH / 2, GROUND_Y - NET_HEIGHT, NET_WIDTH, NET_HEIGHT);

      // Function to render a slime with directional googly eye
      const drawSlime = (slime: SlimeEntity, isAi: boolean) => {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = slime.glow;
        ctx.fillStyle = slime.color;

        // Hemisphere body
        ctx.beginPath();
        ctx.arc(slime.x, slime.y, slime.radius, Math.PI, 0, false);
        ctx.closePath();
        ctx.fill();

        // Eye White
        const eyeOffsetX = isAi ? -14 : 14;
        const eyeX = slime.x + eyeOffsetX;
        const eyeY = slime.y - 20;
        const eyeRadius = 7;

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Pupil Vector Tracking
        const angle = Math.atan2(ballRef.current.y - eyeY, ballRef.current.x - eyeX);
        const pupilDist = 3.5;
        const pupilX = eyeX + Math.cos(angle) * pupilDist;
        const pupilY = eyeY + Math.sin(angle) * pupilDist;

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(pupilX, pupilY, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      drawSlime(playerRef.current, false);
      drawSlime(aiRef.current, true);

      // Draw Volleyball (Neon Energy Orb)
      const b = ballRef.current;
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#39ff14';
      ctx.fillStyle = '#39ff14';
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
  }, [serveBall]);

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
            <span className="text-purple-400">USER: {playerScore}</span>
            <span className="text-gray-600">|</span>
            <span className="text-cyan-400">AI: {aiScore}</span>
          </div>
        </div>
      </div>

      {/* Screen Frame & Canvas */}
      <div className="relative border-2 border-purple-500/80 p-1 bg-black shadow-[0_0_20px_rgba(188,19,254,0.3)]">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block w-full max-w-[640px] h-auto"
        />

        {/* Win/Loss Modal Screen */}
        {winner && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center backdrop-blur-xs">
            <p
              className={`font-cyber font-black text-2xl tracking-wider mb-2 ${
                winner === 'PLAYER'
                  ? 'text-purple-400 drop-shadow-[0_0_10px_#bc13fe]'
                  : 'text-red-500 drop-shadow-[0_0_10px_#ff0055]'
              }`}
            >
              {winner === 'PLAYER' ? 'SECTOR RECLAIMED' : 'RALLY LOST'}
            </p>
            <p className="font-arcade text-xs text-gray-400 mb-6">
              FINAL SCORE: {playerScore} - {aiScore}
            </p>
            <button
              onClick={resetMatch}
              className="flex items-center gap-2 px-4 py-2 border border-purple-400 bg-purple-500/20 text-purple-300 hover:bg-purple-400 hover:text-black font-arcade text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(188,19,254,0.4)]"
            >
              <RotateCcw className="w-4 h-4" /> PLAY AGAIN [R]
            </button>
          </div>
        )}
      </div>

      {/* Mobile Touch Controls */}
      <div className="grid grid-cols-3 gap-3 mt-6 w-full max-w-xs md:hidden">
        <button
          onTouchStart={() => (keysRef.current.left = true)}
          onTouchEnd={() => (keysRef.current.left = false)}
          className="p-3 border border-purple-500/40 bg-purple-950/40 text-purple-300 font-arcade text-xs active:bg-purple-400 active:text-black"
        >
          ◀ LEFT
        </button>
        <button
          onTouchStart={() => (keysRef.current.jump = true)}
          onTouchEnd={() => (keysRef.current.jump = false)}
          className="p-3 border border-purple-500/40 bg-purple-950/40 text-purple-300 font-arcade text-xs active:bg-purple-400 active:text-black"
        >
          ▲ JUMP
        </button>
        <button
          onTouchStart={() => (keysRef.current.right = true)}
          onTouchEnd={() => (keysRef.current.right = false)}
          className="p-3 border border-purple-500/40 bg-purple-950/40 text-purple-300 font-arcade text-xs active:bg-purple-400 active:text-black"
        >
          RIGHT ▶
        </button>
      </div>

      <div className="mt-4 text-[10px] font-mono text-gray-500 hidden md:block">
        MOVE: [A / D] OR [LEFT / RIGHT] // JUMP: [W / SPACE / UP] // REBOOT: [R]
      </div>
    </div>
  );
};

export const CyberSlime = memo(CyberSlimeComponent);
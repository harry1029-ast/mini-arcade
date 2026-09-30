// src/games/slime/CyberSlime.tsx
import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { sound } from '../../audio/NeonAudioSynth';
import { useHighScore } from '../../hooks/useHighScore';
import type { SlimeEntity, SlimeBall, SlimeParticle, AiServeTactic } from './types';
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

// Anchors calibrated with comfortable vertical clearance (y = 215)
const PLAYER_SERVE_POS = { x: 130, y: 215 };
const AI_SERVE_POS = { x: WIDTH - 130, y: 215 };

const CyberSlimeComponent: React.FC<CyberSlimeProps> = ({ onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { highScore, recordScore } = useHighScore('slime');

  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [winner, setWinner] = useState<'PLAYER' | 'AI' | null>(null);
  const [isPlayerServing, setIsPlayerServing] = useState(true);

  const aiServeTacticRef = useRef<AiServeTactic>('FAST_SPIKE');
  const aiServeDelayRef = useRef<number>(45);

  const playerRef = useRef<SlimeEntity>({
    x: 90,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    radius: SLIME_RADIUS,
    color: '#bc13fe',
    glow: '#bc13fe',
    isJumping: false,
  });

  const aiRef = useRef<SlimeEntity>({
    x: WIDTH - 80,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    radius: SLIME_RADIUS,
    color: '#00f3ff',
    glow: '#00f3ff',
    isJumping: false,
  });

  const ballRef = useRef<SlimeBall>({
    x: PLAYER_SERVE_POS.x,
    y: PLAYER_SERVE_POS.y,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    isServing: true,
    server: 'PLAYER',
  });

  const particlesRef = useRef<SlimeParticle[]>([]);
  const keysRef = useRef<{ left: boolean; right: boolean; jump: boolean }>({
    left: false,
    right: false,
    jump: false,
  });

  const aiServeTicksRef = useRef<number>(0);
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

  const stageServe = useCallback((servingPlayer: boolean) => {
    aiServeTicksRef.current = 0;

    // Reset initial court positions
    playerRef.current.x = 90;
    playerRef.current.y = GROUND_Y;
    playerRef.current.vx = 0;
    playerRef.current.vy = 0;
    playerRef.current.isJumping = false;

    aiRef.current.x = WIDTH - 80;
    aiRef.current.y = GROUND_Y;
    aiRef.current.vx = 0;
    aiRef.current.vy = 0;
    aiRef.current.isJumping = false;

    const targetPos = servingPlayer ? PLAYER_SERVE_POS : AI_SERVE_POS;
    ballRef.current = {
      x: targetPos.x,
      y: targetPos.y,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      isServing: true,
      server: servingPlayer ? 'PLAYER' : 'AI',
    };

    setIsPlayerServing(servingPlayer);

    // Pick random AI serve style
    if (!servingPlayer) {
        const roll = Math.random();
        if (roll < 0.4) {
        aiServeTacticRef.current = 'FAST_SPIKE';
        aiServeDelayRef.current = 35 + Math.floor(Math.random() * 15); // Quick trigger
        } else if (roll < 0.75) {
        aiServeTacticRef.current = 'HIGH_LOB';
        aiServeDelayRef.current = 45 + Math.floor(Math.random() * 20); // Medium pause
        } else {
        aiServeTacticRef.current = 'SHORT_DROP';
        aiServeDelayRef.current = 65 + Math.floor(Math.random() * 25); // Delayed trick serve
        }
    }
    }, []);

  const resetMatch = useCallback(() => {
    playerScoreRef.current = 0;
    aiScoreRef.current = 0;
    winnerRef.current = null;
    setPlayerScore(0);
    setAiScore(0);
    setWinner(null);
    particlesRef.current = [];
    stageServe(true);
    sound.playBlip(550);
  }, [stageServe]);

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

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    stageServe(true);
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

        // Player boundary constraints
        if (player.x - player.radius < 0) player.x = player.radius;
        if (player.x + player.radius > netX - NET_WIDTH / 2) {
          player.x = netX - NET_WIDTH / 2 - player.radius;
        }
        if (player.y >= GROUND_Y) {
          player.y = GROUND_Y;
          player.vy = 0;
          player.isJumping = false;
        }

        // 2. AI Routine: Dynamic Serve Execution vs. Active Rally
        if (ball.isServing) {
          if (ball.server === 'AI') {
            aiServeTicksRef.current += 1;

            if (aiServeTicksRef.current > aiServeDelayRef.current) {
              // Calculate target strike offset depending on the selected tactic
              let targetOffsetX = 14; // Default shoulder
              let runSpeed = MOVE_SPEED * 0.8;

              if (aiServeTacticRef.current === 'FAST_SPIKE') {
                targetOffsetX = 20; // Hit with front edge for steep angle
                runSpeed = MOVE_SPEED * 0.95;
              } else if (aiServeTacticRef.current === 'HIGH_LOB') {
                targetOffsetX = 3;  // Hit almost dead-center for high vertical arc
                runSpeed = MOVE_SPEED * 0.65;
              } else if (aiServeTacticRef.current === 'SHORT_DROP') {
                targetOffsetX = -6; // Hit rear curve for slower drop
                runSpeed = MOVE_SPEED * 0.55;
              }

              const targetX = AI_SERVE_POS.x + targetOffsetX;
              const diffX = targetX - ai.x;

              if (Math.abs(diffX) > 4) {
                ai.vx = Math.sign(diffX) * runSpeed;
              } else {
                ai.vx = 0;
                if (!ai.isJumping && ai.y >= GROUND_Y) {
                  // Adjust jump power based on tactic
                  ai.vy = aiServeTacticRef.current === 'SHORT_DROP' ? JUMP_POWER * 0.88 : JUMP_POWER;
                  ai.isJumping = true;
                }
              }
            } else {
              ai.vx = 0;
            }
          } else {
            // Player is serving: AI stays in defensive stance
            const readyX = WIDTH - 120;
            const diffX = readyX - ai.x;
            if (Math.abs(diffX) > 8) ai.vx = Math.sign(diffX) * (MOVE_SPEED * 0.6);
            else ai.vx = 0;
          }
        } else {
          // Standard Rally Tracking
          const aiTarget = ball.x > netX ? ball.x : WIDTH - 120;
          const distToBall = aiTarget - ai.x;
          if (Math.abs(distToBall) > 10) {
            ai.vx = Math.sign(distToBall) * (MOVE_SPEED * 0.88);
          } else {
            ai.vx = 0;
          }

          // Dynamic jump when ball is descending into AI reach
          if (
            ball.x > netX &&
            ball.x > ai.x - 35 &&
            ball.x < ai.x + 35 &&
            ball.y < GROUND_Y - 45 &&
            ball.vy > 0 &&
            !ai.isJumping
          ) {
            ai.vy = JUMP_POWER;
            ai.isJumping = true;
          }
        }

        ai.vy += GRAVITY;
        ai.x += ai.vx;
        ai.y += ai.vy;

        // AI boundary constraints
        if (ai.x - ai.radius < netX + NET_WIDTH / 2) {
          ai.x = netX + NET_WIDTH / 2 + ai.radius;
        }
        if (ai.x + ai.radius > WIDTH) ai.x = WIDTH - ai.radius;
        if (ai.y >= GROUND_Y) {
          ai.y = GROUND_Y;
          ai.vy = 0;
          ai.isJumping = false;
        }

        // 3. Move Ball
        if (ball.isServing) {
          const anchor = ball.server === 'PLAYER' ? PLAYER_SERVE_POS : AI_SERVE_POS;
          ball.x = anchor.x;
          ball.y = anchor.y + Math.sin(Date.now() / 160) * 3;

          // Check if server slime strikes the floating ball
          const serverSlime = ball.server === 'PLAYER' ? player : ai;
          const dx = ball.x - serverSlime.x;
          const dy = ball.y - serverSlime.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < serverSlime.radius + ball.radius && ball.y <= serverSlime.y) {
            ball.isServing = false;
            setIsPlayerServing(false);

            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);
            ball.x = serverSlime.x + nx * (serverSlime.radius + ball.radius);
            ball.y = serverSlime.y + ny * (serverSlime.radius + ball.radius);

            const baseSpeed = 8.5;
            ball.vx = nx * baseSpeed + serverSlime.vx * 0.45;
            ball.vy = ny * baseSpeed + serverSlime.vy * 0.45;
            if (ball.vy > -4) ball.vy = -6.5;

            sound.playBlip(ball.server === 'PLAYER' ? 680 : 520, 'sine', 0.08);
            spawnParticles(ball.x, ball.y, serverSlime.color, 12);
          }
        } else {
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
              ball.y = netTop - ball.radius;
              ball.vy = -Math.abs(ball.vy) * 0.85;
            } else {
              ball.vx = -ball.vx * 0.85;
              if (ball.x < netX) ball.x = netX - NET_WIDTH / 2 - ball.radius;
              else ball.x = netX + NET_WIDTH / 2 + ball.radius;
            }
            sound.playBounce();
            spawnParticles(ball.x, ball.y, '#ffff00', 6);
          }

          // Hemisphere Slime Collisions
          const checkSlimeBounce = (slime: SlimeEntity, isPlayerSlime: boolean) => {
            const dx = ball.x - slime.x;
            const dy = ball.y - slime.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < slime.radius + ball.radius && ball.y <= slime.y) {
              const nx = dx / (dist || 1);
              const ny = dy / (dist || 1);

              ball.x = slime.x + nx * (slime.radius + ball.radius);
              ball.y = slime.y + ny * (slime.radius + ball.radius);

              const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
              const bounceSpeed = Math.min(11.5, Math.max(7.5, speed * 1.05));

              ball.vx = nx * bounceSpeed + slime.vx * 0.35;
              ball.vy = ny * bounceSpeed + slime.vy * 0.35;

              if (ball.vy > -3) ball.vy = -6;

              sound.playBlip(isPlayerSlime ? 650 : 520, 'sine', 0.07);
              spawnParticles(ball.x, ball.y, slime.color, 8);
            }
          };

          checkSlimeBounce(player, true);
          checkSlimeBounce(ai, false);

          // Floor Scoring Trigger
          if (ball.y + ball.radius >= GROUND_Y) {
            sound.playExplosion();
            spawnParticles(ball.x, GROUND_Y, '#ff007f', 16);

            if (ball.x < netX) {
              aiScoreRef.current += 1;
              setAiScore(aiScoreRef.current);

              if (aiScoreRef.current >= WINNING_SCORE) {
                winnerRef.current = 'AI';
                setWinner('AI');
              } else {
                stageServe(false);
              }
            } else {
              playerScoreRef.current += 1;
              setPlayerScore(playerScoreRef.current);
              sound.playChime();
              recordScoreRef.current(playerScoreRef.current);

              if (playerScoreRef.current >= WINNING_SCORE) {
                winnerRef.current = 'PLAYER';
                setWinner('PLAYER');
              } else {
                stageServe(true);
              }
            }
          }
        }
      }

      // 4. Render Canvas
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

      // Draw Slimes
      const drawSlime = (slime: SlimeEntity, isAi: boolean) => {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = slime.glow;
        ctx.fillStyle = slime.color;

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

      // Draw Ball
      const b = ballRef.current;
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#39ff14';
      ctx.fillStyle = '#39ff14';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Serve Guide Ring
      if (b.isServing) {
        ctx.strokeStyle = b.server === 'PLAYER' ? 'rgba(188, 19, 254, 0.5)' : 'rgba(0, 243, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

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
  }, [stageServe]);

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

        {/* Player Serve Prompt */}
        {isPlayerServing && !winner && (
          <div className="absolute bottom-16 left-8 pointer-events-none">
            <span className="font-arcade text-[10px] text-purple-300 tracking-wider animate-pulse bg-black/75 px-3 py-1.5 border border-purple-500/50 shadow-[0_0_10px_rgba(188,19,254,0.4)]">
              LINE UP & LEAP TO SERVE
            </span>
          </div>
        )}

        {/* Win/Loss Modal */}
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
        POSITION: [A / D] OR [LEFT / RIGHT] // LEAP TO SERVE: [W / SPACE / UP]
      </div>
    </div>
  );
};

export const CyberSlime = memo(CyberSlimeComponent);
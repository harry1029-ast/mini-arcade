// src/games/pong/TronPong.tsx
import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { sound } from '../../audio/NeonAudioSynth';
import { useHighScore } from '../../hooks/useHighScore';
import type {
  PongBall,
  Paddle,
  PongParticle,
  PongDifficulty,
  PongDifficultyConfig,
  PongMode,
} from './types';
import { RotateCcw, ArrowLeft, Trophy, Sliders, Shield, Users, User } from 'lucide-react';

interface TronPongProps {
  onExit: () => void;
}

const WIDTH = 600;
const HEIGHT = 400;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 70;
const BALL_RADIUS = 6;
const WINNING_SCORE = 7;

const DIFFICULTY_CONFIGS: Record<PongDifficulty, PongDifficultyConfig> = {
  EASY: {
    aiSpeed: 3.4,
    aiDeadzone: 24,
    initialBallSpeed: 4.2,
    maxBallSpeed: 9.0,
    label: 'NOVICE',
    description: 'Sub-routine latency enabled. Forgiving defense.',
  },
  MEDIUM: {
    aiSpeed: 4.8,
    aiDeadzone: 10,
    initialBallSpeed: 5.5,
    maxBallSpeed: 13.0,
    label: 'TACTICAL',
    description: 'Standard security algorithm. Balanced reflexes.',
  },
  HARD: {
    aiSpeed: 6.2,
    aiDeadzone: 2,
    initialBallSpeed: 6.8,
    maxBallSpeed: 16.0,
    label: 'CYBERGRID',
    description: 'Maximum clock frequency. Zero mercy protocol.',
  },
};

const TronPongComponent: React.FC<TronPongProps> = ({ onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { highScore, recordScore } = useHighScore('pong');

  const [mode, setMode] = useState<PongMode>('1P_AI');
  const [difficulty, setDifficulty] = useState<PongDifficulty | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [winner, setWinner] = useState<'P1' | 'P2' | null>(null);

  const ballRef = useRef<PongBall>({
    x: WIDTH / 2,
    y: HEIGHT / 2,
    vx: 5,
    vy: 0,
    radius: BALL_RADIUS,
    speed: 5.5,
  });

  const p1Ref = useRef<Paddle>({
    x: 20,
    y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    speed: 6.5,
  });

  const p2Ref = useRef<Paddle>({
    x: WIDTH - 20 - PADDLE_WIDTH,
    y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    speed: 6.5,
  });

  const particlesRef = useRef<PongParticle[]>([]);
  const keysRef = useRef<{
    p1Up: boolean;
    p1Down: boolean;
    p2Up: boolean;
    p2Down: boolean;
  }>({
    p1Up: false,
    p1Down: false,
    p2Up: false,
    p2Down: false,
  });

  const p1ScoreRef = useRef(0);
  const p2ScoreRef = useRef(0);
  const winnerRef = useRef<'P1' | 'P2' | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const recordScoreRef = useRef(recordScore);
  recordScoreRef.current = recordScore;

  const modeRef = useRef<PongMode>(mode);
  modeRef.current = mode;

  const currentDiffRef = useRef<PongDifficultyConfig>(DIFFICULTY_CONFIGS.MEDIUM);

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

  const resetBall = useCallback((towardP1: boolean) => {
    const config = currentDiffRef.current;
    const baseSpeed = modeRef.current === '2P_LOCAL' ? 5.5 : config.initialBallSpeed;
    const angle = (Math.random() * Math.PI) / 3 - Math.PI / 6;

    ballRef.current = {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      vx: (towardP1 ? -1 : 1) * baseSpeed * Math.cos(angle),
      vy: baseSpeed * Math.sin(angle),
      radius: BALL_RADIUS,
      speed: baseSpeed,
    };
  }, []);

  const resetMatch = useCallback(() => {
    p1ScoreRef.current = 0;
    p2ScoreRef.current = 0;
    winnerRef.current = null;
    setPlayerScore(0);
    setP2Score(0);
    setWinner(null);
    particlesRef.current = [];
    p1Ref.current.y = HEIGHT / 2 - PADDLE_HEIGHT / 2;
    p2Ref.current.y = HEIGHT / 2 - PADDLE_HEIGHT / 2;
    resetBall(Math.random() > 0.5);
  }, [resetBall]);

  const startWithDifficulty = (selected: PongDifficulty) => {
    sound.playBlip(750);
    currentDiffRef.current = DIFFICULTY_CONFIGS[selected];
    p2Ref.current.speed = DIFFICULTY_CONFIGS[selected].aiSpeed;
    setDifficulty(selected);
    resetMatch();
  };

  const start2PLocal = () => {
    sound.playBlip(750);
    setMode('2P_LOCAL');
    p2Ref.current.speed = 6.5; // Equal speed for human P2
    setDifficulty('MEDIUM');
    resetMatch();
  };

  // Dual-Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Player 1 (W / S)
      if (e.key === 'w' || e.key === 'W') {
        keysRef.current.p1Up = true;
      }
      if (e.key === 's' || e.key === 'S') {
        keysRef.current.p1Down = true;
      }

      // Player 2 / AI (Up / Down)
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (modeRef.current === '1P_AI') {
          keysRef.current.p1Up = true; // Allow Arrow keys for P1 in solo mode
        } else {
          keysRef.current.p2Up = true;
        }
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (modeRef.current === '1P_AI') {
          keysRef.current.p1Down = true;
        } else {
          keysRef.current.p2Down = true;
        }
      }

      if ((e.key === 'r' || e.key === 'R') && winnerRef.current) {
        sound.playBlip(600);
        resetMatch();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') {
        keysRef.current.p1Up = false;
      }
      if (e.key === 's' || e.key === 'S') {
        keysRef.current.p1Down = false;
      }

      if (e.key === 'ArrowUp') {
        if (modeRef.current === '1P_AI') {
          keysRef.current.p1Up = false;
        } else {
          keysRef.current.p2Up = false;
        }
      }
      if (e.key === 'ArrowDown') {
        if (modeRef.current === '1P_AI') {
          keysRef.current.p1Down = false;
        } else {
          keysRef.current.p2Down = false;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [resetMatch]);

  // Main Canvas & Game Loop
  useEffect(() => {
    if (!difficulty) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
      const elapsed = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;
      const dt = Math.min(Math.max(elapsed / 16.667, 0.2), 2.5);

      if (!winnerRef.current) {
        const ball = ballRef.current;
        const p1 = p1Ref.current;
        const p2 = p2Ref.current;
        const config = currentDiffRef.current;

        // 1. Move Player 1
        if (keysRef.current.p1Up && p1.y > 0) {
          p1.y -= p1.speed * dt;
        }
        if (keysRef.current.p1Down && p1.y + p1.height < HEIGHT) {
          p1.y += p1.speed * dt;
        }

        // 2. Move Player 2 (Local Human vs. AI)
        if (modeRef.current === '2P_LOCAL') {
          if (keysRef.current.p2Up && p2.y > 0) {
            p2.y -= p2.speed * dt;
          }
          if (keysRef.current.p2Down && p2.y + p2.height < HEIGHT) {
            p2.y += p2.speed * dt;
          }
        } else {
          // AI Tracking
          const aiTarget = ball.y - p2.height / 2;
          const aiDiff = aiTarget - p2.y;
          if (Math.abs(aiDiff) > config.aiDeadzone) {
            p2.y += Math.sign(aiDiff) * p2.speed * dt;
          }
          p2.y = Math.max(0, Math.min(HEIGHT - p2.height, p2.y));
        }

        // 3. Move Ball
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // Wall collisions
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

        // Paddle 1 Collision (Left / Cyan)
        if (
          ball.x - ball.radius <= p1.x + p1.width &&
          ball.x + ball.radius >= p1.x &&
          ball.y >= p1.y &&
          ball.y <= p1.y + p1.height &&
          ball.vx < 0
        ) {
          const impact = (ball.y - (p1.y + p1.height / 2)) / (p1.height / 2);
          const maxAngle = (Math.PI / 4) * 1.1;
          const angle = impact * maxAngle;
          const maxSpeed = modeRef.current === '2P_LOCAL' ? 14.0 : config.maxBallSpeed;
          ball.speed = Math.min(maxSpeed, ball.speed + 0.35);
          ball.vx = Math.abs(ball.speed * Math.cos(angle));
          ball.vy = ball.speed * Math.sin(angle);
          sound.playBlip(620, 'triangle', 0.06);
          spawnParticles(p1.x + p1.width, ball.y, '#00f3ff');
        }

        // Paddle 2 Collision (Right / Pink)
        if (
          ball.x + ball.radius >= p2.x &&
          ball.x - ball.radius <= p2.x + p2.width &&
          ball.y >= p2.y &&
          ball.y <= p2.y + p2.height &&
          ball.vx > 0
        ) {
          const impact = (ball.y - (p2.y + p2.height / 2)) / (p2.height / 2);
          const maxAngle = (Math.PI / 4) * 1.1;
          const angle = impact * maxAngle;
          const maxSpeed = modeRef.current === '2P_LOCAL' ? 14.0 : config.maxBallSpeed;
          ball.speed = Math.min(maxSpeed, ball.speed + 0.35);
          ball.vx = -Math.abs(ball.speed * Math.cos(angle));
          ball.vy = ball.speed * Math.sin(angle);
          sound.playBlip(520, 'triangle', 0.06);
          spawnParticles(p2.x, ball.y, '#ff007f');
        }

        // Scoring Checks
        if (ball.x + ball.radius < 0) {
          p2ScoreRef.current += 1;
          setP2Score(p2ScoreRef.current);
          sound.playExplosion();
          spawnParticles(10, ball.y, '#ff007f');

          if (p2ScoreRef.current >= WINNING_SCORE) {
            winnerRef.current = 'P2';
            setWinner('P2');
          } else {
            resetBall(false);
          }
        } else if (ball.x - ball.radius > WIDTH) {
          p1ScoreRef.current += 1;
          setPlayerScore(p1ScoreRef.current);
          sound.playChime();
          spawnParticles(WIDTH - 10, ball.y, '#00f3ff');
          if (modeRef.current === '1P_AI') {
            recordScoreRef.current(p1ScoreRef.current);
          }

          if (p1ScoreRef.current >= WINNING_SCORE) {
            winnerRef.current = 'P1';
            setWinner('P1');
          } else {
            resetBall(true);
          }
        }
      }

      // 4. Render Frame
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

      // Draw P1 Paddle (Cyan)
      const p1 = p1Ref.current;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00f3ff';
      ctx.fillStyle = '#00f3ff';
      ctx.fillRect(p1.x, p1.y, p1.width, p1.height);

      // Draw P2 Paddle (Pink)
      const p2 = p2Ref.current;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ff007f';
      ctx.fillStyle = '#ff007f';
      ctx.fillRect(p2.x, p2.y, p2.width, p2.height);

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

    lastFrameTimeRef.current = 0;
    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [difficulty, resetBall]);

  // Direct Mobile / Touch Drag for P1
  const handleCanvasTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const clientY = touch.clientY - rect.top;
    const scaleY = HEIGHT / rect.height;
    const canvasY = clientY * scaleY;

    p1Ref.current.y = Math.max(
      0,
      Math.min(HEIGHT - p1Ref.current.height, canvasY - p1Ref.current.height / 2)
    );
  };

  // Initial Mode / Difficulty Selector Dialog
  if (!difficulty) {
    return (
      <div className="flex flex-col items-center max-w-lg mx-auto w-full p-6 bg-[#080d1a]/90 border border-cyan-500/40 backdrop-blur-md shadow-[0_0_30px_rgba(0,243,255,0.2)]">
        <div className="flex items-center gap-2 mb-2 text-cyan-400 font-arcade text-xs">
          <Shield className="w-4 h-4" /> TRON_PONG_ENGAGEMENT
        </div>
        <h2 className="font-cyber font-bold text-2xl text-white tracking-wider glow-cyan mb-2">
          SELECT MODE
        </h2>
        <p className="font-mono text-xs text-gray-400 text-center mb-6">
          Engage standard AI defense or initiate local 2-player direct link.
        </p>

        {/* 2-Player Local Option */}
        <button
          onClick={start2PLocal}
          className="w-full p-4 mb-4 border border-purple-500/50 hover:border-purple-400 bg-purple-950/20 hover:bg-purple-950/40 text-purple-300 transition-all cursor-pointer group text-left shadow-[0_0_15px_rgba(188,19,254,0.15)]"
        >
          <div className="flex justify-between items-center mb-1">
            <span className="font-arcade text-sm font-bold tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" /> LOCAL 2-PLAYER
            </span>
            <span className="font-mono text-[10px] text-purple-400">SPLIT-KEYBOARD</span>
          </div>
          <div className="font-mono text-xs text-gray-400 group-hover:text-gray-200">
            Player 1 [W / S] vs Player 2 [UP / DOWN]. Head-to-head combat.
          </div>
        </button>

        <div className="flex items-center gap-2 w-full my-2 text-gray-600 font-arcade text-[10px]">
          <div className="flex-1 h-px bg-gray-800" />
          <span>OR SOLO VS AI</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* 1-Player AI Difficulties */}
        <div className="flex flex-col gap-2.5 w-full mb-6">
          {(['EASY', 'MEDIUM', 'HARD'] as PongDifficulty[]).map((level) => {
            const cfg = DIFFICULTY_CONFIGS[level];
            const colorClass =
              level === 'EASY'
                ? 'border-emerald-500/40 hover:border-emerald-400 text-emerald-400 hover:bg-emerald-950/30'
                : level === 'MEDIUM'
                  ? 'border-cyan-500/40 hover:border-cyan-400 text-cyan-400 hover:bg-cyan-950/30'
                  : 'border-pink-500/40 hover:border-pink-400 text-pink-400 hover:bg-pink-950/30';

            return (
              <button
                key={level}
                onClick={() => {
                  setMode('1P_AI');
                  startWithDifficulty(level);
                }}
                className={`p-3.5 border text-left transition-all cursor-pointer group ${colorClass}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-arcade text-xs font-bold tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> {cfg.label}
                  </span>
                  <span className="font-mono text-[10px] text-gray-400">
                    SPEED {cfg.initialBallSpeed} - {cfg.maxBallSpeed}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-gray-400 group-hover:text-gray-200">
                  {cfg.description}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            sound.playBlip(300);
            onExit();
          }}
          className="flex items-center gap-1.5 px-4 py-2 border border-gray-700 hover:border-pink-500/60 text-xs font-arcade text-gray-400 hover:text-pink-400 cursor-pointer transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> CANCEL TO DECK
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto w-full">
      {/* Top HUD */}
      <div className="flex items-center justify-between w-full mb-3 px-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playBlip(300);
              onExit();
            }}
            className="flex items-center gap-1.5 px-3 py-1 border border-pink-500/50 hover:bg-pink-500/20 text-xs font-arcade text-[#ff007f] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> DECK
          </button>

          <button
            onClick={() => {
              sound.playBlip(400);
              setDifficulty(null);
            }}
            className="flex items-center gap-1 px-2.5 py-1 border border-cyan-500/40 hover:bg-cyan-500/20 text-[10px] font-arcade text-cyan-300 cursor-pointer"
            title="Change Mode or Difficulty"
          >
            <Sliders className="w-3 h-3" /> {mode === '2P_LOCAL' ? '2P LOCAL' : difficulty}
          </button>
        </div>

        <div className="flex items-center gap-6">
          {mode === '1P_AI' && (
            <div className="flex items-center gap-1.5 text-xs font-arcade text-yellow-400">
              <Trophy className="w-3.5 h-3.5" />
              <span>RECORD: {highScore.toString().padStart(2, '0')}</span>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm font-arcade">
            <span className="text-cyan-400">
              {mode === '2P_LOCAL' ? 'P1' : 'USER'}: {playerScore}
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-pink-400">
              {mode === '2P_LOCAL' ? 'P2' : 'AI'}: {p2Score}
            </span>
          </div>
        </div>
      </div>

      {/* Screen Frame & Canvas */}
      <div className="relative border-2 border-cyan-400/80 p-1 bg-black shadow-[0_0_20px_rgba(0,243,255,0.3)] w-full max-w-[600px] touch-control">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onTouchStart={handleCanvasTouch}
          onTouchMove={handleCanvasTouch}
          className="block w-full h-auto touch-control select-none"
        />

        {/* Win/Loss Modal Screen */}
        {winner && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center backdrop-blur-xs">
            <p
              className={`font-cyber font-black text-2xl tracking-wider mb-2 ${winner === 'P1'
                  ? 'text-cyan-400 drop-shadow-[0_0_10px_#00f3ff]'
                  : 'text-pink-500 drop-shadow-[0_0_10px_#ff007f]'
                }`}
            >
              {mode === '2P_LOCAL'
                ? winner === 'P1'
                  ? 'PLAYER 1 VICTORIOUS'
                  : 'PLAYER 2 VICTORIOUS'
                : winner === 'P1'
                  ? 'SECTOR SECURED'
                  : 'BREACH DETECTED'}
            </p>
            <p className="font-arcade text-xs text-gray-400 mb-6">
              FINAL SCORE: {playerScore} - {p2Score}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  sound.playBlip(600);
                  resetMatch();
                }}
                className="flex items-center gap-2 px-4 py-2 border border-cyan-400 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-400 hover:text-black font-arcade text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(0,243,255,0.4)]"
              >
                <RotateCcw className="w-4 h-4" /> PLAY AGAIN [R]
              </button>

              <button
                onClick={() => {
                  sound.playBlip(400);
                  setDifficulty(null);
                }}
                className="px-4 py-2 border border-pink-500/60 hover:bg-pink-500/20 text-pink-400 font-arcade text-xs transition-all cursor-pointer"
              >
                CHANGE MODE
              </button>
            </div>
          </div>
        )}
      </div>

      {/* On-Screen Touch Controls (Mobile Only) */}
      <div className="flex justify-between w-full max-w-xs mt-6 px-4 md:hidden touch-control">
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            keysRef.current.p1Up = true;
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            keysRef.current.p1Up = false;
          }}
          className="w-28 h-14 flex items-center justify-center border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-arcade text-xs rounded active:bg-cyan-400 active:text-black touch-control"
        >
          ▲ UP
        </button>

        <button
          onTouchStart={(e) => {
            e.preventDefault();
            keysRef.current.p1Down = true;
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            keysRef.current.p1Down = false;
          }}
          className="w-28 h-14 flex items-center justify-center border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-arcade text-xs rounded active:bg-cyan-400 active:text-black touch-control"
        >
          ▼ DOWN
        </button>
      </div>

      {/* Keyboard Controls Guide */}
      <div className="mt-4 text-[10px] font-mono text-gray-500 hidden md:block">
        {mode === '2P_LOCAL' ? (
          <span>
            P1 (CYAN): <strong className="text-cyan-400">[W / S]</strong> &nbsp;|&nbsp; P2 (PINK):{' '}
            <strong className="text-pink-400">[UP / DOWN]</strong> &nbsp;|&nbsp; RESTART: [R]
          </span>
        ) : (
          <span>CONTROLS: [W / S] OR [UP / DOWN] // RESTART: [R]</span>
        )}
      </div>
    </div>
  );
};

export const TronPong = memo(TronPongComponent);
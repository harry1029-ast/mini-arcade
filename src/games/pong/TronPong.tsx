// src/games/pong/TronPong.tsx
import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { sound } from '../../audio/NeonAudioSynth';
import { useHighScore } from '../../hooks/useHighScore';
import { usePeerRoom } from '../../hooks/usePeerRoom';
import type { PongNetworkPacket } from '../../types/network';
import type {
  PongBall,
  Paddle,
  PongParticle,
  PongDifficulty,
  PongDifficultyConfig,
  PongMode,
} from './types';
import { RotateCcw, ArrowLeft, Trophy, Sliders, Shield, Users, User, Globe, Copy, Check } from 'lucide-react';

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

  // Online Lobby States
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [copied, setCopied] = useState(false);

  const [ping, setPing] = useState<number | null>(null);
  const sendPacketRef = useRef<(packet: PongNetworkPacket) => void>(() => { });

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
  const modeRef = useRef<PongMode>(mode);
  modeRef.current = mode;

  const currentDiffRef = useRef<PongDifficultyConfig>(DIFFICULTY_CONFIGS.MEDIUM);

  // P2P Data Handler
  const handleNetworkData = useCallback((data: PongNetworkPacket) => {
    if (data.type === 'PING') {
      // Immediate pong echo back to sender
      sendPacketRef.current({ type: 'PONG_REPLY', timestamp: data.timestamp });
    } else if (data.type === 'PONG_REPLY') {
      const rtt = Math.round(performance.now() - data.timestamp);
      setPing(Math.max(1, Math.round(rtt / 2)));
    } else if (data.type === 'PONG_GUEST_INPUT') {
      keysRef.current.p2Up = data.up;
      keysRef.current.p2Down = data.down;
      if (typeof data.directY === 'number') {
        p2Ref.current.y = data.directY;
      }
    } else if (data.type === 'PONG_HOST_SYNC') {
      ballRef.current.x = data.ball.x;
      ballRef.current.y = data.ball.y;
      ballRef.current.vx = data.ball.vx;
      ballRef.current.vy = data.ball.vy;
      p1Ref.current.y = data.p1Y;
      p1ScoreRef.current = data.playerScore;
      p2ScoreRef.current = data.p2Score;
      setPlayerScore(data.playerScore);
      setP2Score(data.p2Score);

      if (data.winner && !winnerRef.current) {
        winnerRef.current = data.winner;
        setWinner(data.winner);
      }
    }
  }, []);

  const { role, roomId, status, errorMsg, sendPacket, createRoom, joinRoom, disconnect } =
    usePeerRoom<PongNetworkPacket>(handleNetworkData);

  // Keep ref up to date
  sendPacketRef.current = sendPacket;

  // Heartbeat ping loop: measures latency every 2 seconds when connected
  useEffect(() => {
    if (mode !== '2P_ONLINE' || status !== 'CONNECTED') {
      setPing(null);
      return;
    }

    const interval = setInterval(() => {
      sendPacketRef.current({
        type: 'PING',
        timestamp: performance.now(),
      });
    }, 2000);

    // Initial ping
    sendPacketRef.current({
      type: 'PING',
      timestamp: performance.now(),
    });

    return () => clearInterval(interval);
  }, [mode, status]);

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
    const baseSpeed = modeRef.current === '1P_AI' ? config.initialBallSpeed : 5.5;
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
    p2Ref.current.speed = 6.5;
    setDifficulty('MEDIUM');
    resetMatch();
  };

  const startOnlineMode = () => {
    sound.playBlip(750);
    setIsLobbyOpen(true);
  };

  const copyRoomCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Online Guest: W/S or Arrow Keys both control Guest paddle (P2)
      if (modeRef.current === '2P_ONLINE' && role === 'GUEST') {
        if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
          keysRef.current.p2Up = true;
          sendPacket({ type: 'PONG_GUEST_INPUT', up: true, down: false });
        }
        if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
          keysRef.current.p2Down = true;
          sendPacket({ type: 'PONG_GUEST_INPUT', up: false, down: true });
        }
        return;
      }

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
          keysRef.current.p1Up = true;
        } else if (modeRef.current === '2P_LOCAL') {
          keysRef.current.p2Up = true;
        }
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (modeRef.current === '1P_AI') {
          keysRef.current.p1Down = true;
        } else if (modeRef.current === '2P_LOCAL') {
          keysRef.current.p2Down = true;
        }
      }

      if ((e.key === 'r' || e.key === 'R') && winnerRef.current && modeRef.current !== '2P_ONLINE') {
        sound.playBlip(600);
        resetMatch();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (modeRef.current === '2P_ONLINE' && role === 'GUEST') {
        if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
          keysRef.current.p2Up = false;
          sendPacket({ type: 'PONG_GUEST_INPUT', up: false, down: keysRef.current.p2Down });
        }
        if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
          keysRef.current.p2Down = false;
          sendPacket({ type: 'PONG_GUEST_INPUT', up: keysRef.current.p2Up, down: false });
        }
        return;
      }

      if (e.key === 'w' || e.key === 'W') {
        keysRef.current.p1Up = false;
      }
      if (e.key === 's' || e.key === 'S') {
        keysRef.current.p1Down = false;
      }

      if (e.key === 'ArrowUp') {
        if (modeRef.current === '1P_AI') {
          keysRef.current.p1Up = false;
        } else if (modeRef.current === '2P_LOCAL') {
          keysRef.current.p2Up = false;
        }
      }
      if (e.key === 'ArrowDown') {
        if (modeRef.current === '1P_AI') {
          keysRef.current.p1Down = false;
        } else if (modeRef.current === '2P_LOCAL') {
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
  }, [resetMatch, role, sendPacket]);

  // Main Canvas & Simulation Loop
  useEffect(() => {
    if (!difficulty) return;

    let animId: number;
    let syncTick = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
      const elapsed = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;
      const dt = Math.min(Math.max(elapsed / 16.667, 0.2), 2.5);

      const ball = ballRef.current;
      const p1 = p1Ref.current;
      const p2 = p2Ref.current;
      const config = currentDiffRef.current;

      const isHostAuthoritative = modeRef.current !== '2P_ONLINE' || role === 'HOST';

      if (!winnerRef.current) {
        if (isHostAuthoritative) {
          // 1. Move Player 1 (Host or Local)
          if (keysRef.current.p1Up && p1.y > 0) {
            p1.y -= p1.speed * dt;
          }
          if (keysRef.current.p1Down && p1.y + p1.height < HEIGHT) {
            p1.y += p1.speed * dt;
          }

          // 2. Move Player 2 (Local Human, Remote Guest, or AI)
          if (modeRef.current === '2P_LOCAL' || modeRef.current === '2P_ONLINE') {
            if (keysRef.current.p2Up && p2.y > 0) {
              p2.y -= p2.speed * dt;
            }
            if (keysRef.current.p2Down && p2.y + p2.height < HEIGHT) {
              p2.y += p2.speed * dt;
            }
          } else {
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

          // Wall Collisions
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

          // P1 Collision (Left / Cyan)
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
            const maxSpeed = modeRef.current === '1P_AI' ? config.maxBallSpeed : 14.0;
            ball.speed = Math.min(maxSpeed, ball.speed + 0.35);
            ball.vx = Math.abs(ball.speed * Math.cos(angle));
            ball.vy = ball.speed * Math.sin(angle);
            sound.playBlip(620, 'triangle', 0.06);
            spawnParticles(p1.x + p1.width, ball.y, '#00f3ff');
          }

          // P2 Collision (Right / Pink)
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
            const maxSpeed = modeRef.current === '1P_AI' ? config.maxBallSpeed : 14.0;
            ball.speed = Math.min(maxSpeed, ball.speed + 0.35);
            ball.vx = -Math.abs(ball.speed * Math.cos(angle));
            ball.vy = ball.speed * Math.sin(angle);
            sound.playBlip(520, 'triangle', 0.06);
            spawnParticles(p2.x, ball.y, '#ff007f');
          }

          // Scoring
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
              recordScore(p1ScoreRef.current);
            }

            if (p1ScoreRef.current >= WINNING_SCORE) {
              winnerRef.current = 'P1';
              setWinner('P1');
            } else {
              resetBall(true);
            }
          }

          // Broadcast State to Guest at 30Hz
          if (modeRef.current === '2P_ONLINE' && role === 'HOST') {
            syncTick++;
            if (syncTick % 2 === 0) {
              sendPacket({
                type: 'PONG_HOST_SYNC',
                ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy },
                p1Y: p1.y,
                playerScore: p1ScoreRef.current,
                p2Score: p2ScoreRef.current,
                winner: winnerRef.current,
              });
            }
          }
        } else {
          // Guest-side: Smoothly move own paddle locally
          if (keysRef.current.p2Up && p2.y > 0) {
            p2.y -= p2.speed * dt;
          }
          if (keysRef.current.p2Down && p2.y + p2.height < HEIGHT) {
            p2.y += p2.speed * dt;
          }
        }
      }

      // Render Canvas
      ctx.fillStyle = '#04060d';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Net
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(WIDTH / 2, 0);
      ctx.lineTo(WIDTH / 2, HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      // P1 Paddle (Cyan)
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00f3ff';
      ctx.fillStyle = '#00f3ff';
      ctx.fillRect(p1.x, p1.y, p1.width, p1.height);

      // P2 Paddle (Pink)
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ff007f';
      ctx.fillStyle = '#ff007f';
      ctx.fillRect(p2.x, p2.y, p2.width, p2.height);

      // Ball
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#ffffff';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Particles
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
  }, [difficulty, resetBall, role, sendPacket, recordScore]);

  // Touch drag for mobile
  const handleCanvasTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;

    const clientY = touch.clientY - rect.top;
    const scaleY = HEIGHT / rect.height;
    const canvasY = clientY * scaleY;

    if (mode === '2P_ONLINE' && role === 'GUEST') {
      const newY = Math.max(
        0,
        Math.min(HEIGHT - p2Ref.current.height, canvasY - p2Ref.current.height / 2)
      );
      p2Ref.current.y = newY;
      // Send direct paddle position to host
      sendPacket({
        type: 'PONG_GUEST_INPUT',
        up: false,
        down: false,
        directY: newY,
      });
    } else {
      const newY = Math.max(
        0,
        Math.min(HEIGHT - p1Ref.current.height, canvasY - p1Ref.current.height / 2)
      );
      p1Ref.current.y = newY;
      // In ONLINE mode, the host physics loop already broadcasts p1Y at 30Hz
    }
  };

  // Online Lobby Setup Dialog
  if (isLobbyOpen) {
    return (
      <div className="flex flex-col items-center max-w-lg mx-auto w-full p-6 bg-[#080d1a]/95 border border-cyan-500/40 backdrop-blur-md shadow-[0_0_30px_rgba(0,243,255,0.2)]">
        <div className="flex items-center gap-2 mb-2 text-cyan-400 font-arcade text-xs">
          <Globe className="w-4 h-4" /> WEBRTC_PEER_DIRECT_LINK
        </div>
        <h2 className="font-cyber font-bold text-2xl text-white tracking-wider glow-cyan mb-2">
          ONLINE 1v1 LOBBY
        </h2>

        {status === 'CONNECTED' ? (
          <div className="w-full text-center py-6">
            <div className="text-emerald-400 font-arcade text-sm mb-2">LINK ESTABLISHED</div>
            <p className="font-mono text-xs text-gray-400 mb-6">
              Connected as <span className="text-cyan-400 font-bold">{role === 'HOST' ? 'PLAYER 1 (HOST)' : 'PLAYER 2 (GUEST)'}</span>.
            </p>
            <button
              onClick={() => {
                setMode('2P_ONLINE');
                setDifficulty('MEDIUM');
                setIsLobbyOpen(false);
                resetMatch();
              }}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-arcade text-xs tracking-wider cursor-pointer"
            >
              LAUNCH BATTLE
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 w-full my-4">
            {/* Host Section */}
            <div className="p-4 border border-cyan-500/30 bg-cyan-950/20 rounded">
              <div className="font-arcade text-xs text-cyan-300 mb-2">HOST A MATCH</div>
              {role === 'HOST' && roomId ? (
                <div>
                  <p className="font-mono text-xs text-gray-400 mb-2">Share this Room Code with your opponent:</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-yellow-300 tracking-wider bg-black/60 px-3 py-1 border border-yellow-500/40 flex-1 text-center">
                      {roomId}
                    </span>
                    <button
                      onClick={copyRoomCode}
                      className="px-3 py-2 border border-yellow-500/50 hover:bg-yellow-500/20 text-yellow-300 text-xs font-arcade cursor-pointer flex items-center gap-1"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="mt-3 text-[10px] font-mono text-cyan-400/80 animate-pulse">
                    Waiting for peer connection...
                  </div>
                </div>
              ) : (
                <button
                  onClick={createRoom}
                  className="w-full py-2 border border-cyan-500 hover:bg-cyan-500/20 text-cyan-300 font-arcade text-xs cursor-pointer transition-all"
                >
                  GENERATE ROOM CODE
                </button>
              )}
            </div>

            {/* Join Section */}
            <div className="p-4 border border-pink-500/30 bg-pink-950/20 rounded">
              <div className="font-arcade text-xs text-pink-300 mb-2">JOIN A MATCH</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="ENTER ROOM CODE"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  className="bg-black/60 border border-pink-500/40 text-pink-300 px-3 py-2 font-mono text-xs uppercase focus:outline-none flex-1"
                />
                <button
                  onClick={() => joinRoom(joinInput)}
                  disabled={!joinInput.trim() || status === 'CONNECTING'}
                  className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500 text-pink-300 hover:text-black border border-pink-500 font-arcade text-xs cursor-pointer disabled:opacity-50"
                >
                  {status === 'CONNECTING' ? 'CONNECTING...' : 'JOIN'}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="font-mono text-xs text-red-400 bg-red-950/30 p-2 border border-red-500/40">
                {errorMsg}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => {
            disconnect();
            setIsLobbyOpen(false);
          }}
          className="mt-4 flex items-center gap-1.5 px-4 py-2 border border-gray-700 text-xs font-arcade text-gray-400 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> BACK TO SELECTOR
        </button>
      </div>
    );
  }

  // Initial Mode / Difficulty Selector Dialog
  if (!difficulty) {
    return (
      <div className="flex flex-col items-center max-w-lg mx-auto w-full p-6 bg-[#080d1a]/90 border border-cyan-500/40 backdrop-blur-md shadow-[0_0_30px_rgba(0,243,255,0.2)]">
        <div className="flex items-center gap-2 mb-2 text-cyan-400 font-arcade text-xs">
          <Shield className="w-4 h-4" /> TRON_PONG_ENGAGEMENT
        </div>
        <h2 className="font-cyber font-bold text-2xl text-white tracking-wider glow-cyan mb-2">
          SELECT ENGAGEMENT
        </h2>
        <p className="font-mono text-xs text-gray-400 text-center mb-6">
          Connect across the network, play locally, or engage AI defense.
        </p>

        {/* Online 1v1 Button */}
        <button
          onClick={startOnlineMode}
          className="w-full p-4 mb-3 border border-cyan-500/60 hover:border-cyan-400 bg-cyan-950/30 hover:bg-cyan-950/60 text-cyan-300 transition-all cursor-pointer group text-left shadow-[0_0_20px_rgba(0,243,255,0.2)]"
        >
          <div className="flex justify-between items-center mb-1">
            <span className="font-arcade text-sm font-bold tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" /> ONLINE 1v1 (P2P)
            </span>
            <span className="font-mono text-[10px] text-cyan-400">ROOM CODE</span>
          </div>
          <div className="font-mono text-xs text-gray-400 group-hover:text-gray-200">
            Direct browser-to-browser WebRTC connection with a remote player.
          </div>
        </button>

        {/* Local 2-Player Option */}
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
            Player 1 [W / S] vs Player 2 [UP / DOWN] on the same keyboard.
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
      <div className="w-full mb-3 px-1 flex flex-col gap-2 sm:gap-0 sm:flex-row sm:items-center sm:justify-between">
        {/* Left Actions & Status */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                sound.playBlip(300);
                disconnect();
                onExit();
              }}
              className="flex items-center gap-1 px-2.5 py-1 border border-pink-500/50 hover:bg-pink-500/20 text-[11px] font-arcade text-[#ff007f] cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" /> DECK
            </button>

            <button
              onClick={() => {
                sound.playBlip(400);
                disconnect();
                setDifficulty(null);
              }}
              className="flex items-center gap-1 px-2 py-1 border border-cyan-500/40 hover:bg-cyan-500/20 text-[10px] font-arcade text-cyan-300 cursor-pointer"
              title="Change Mode"
            >
              <Sliders className="w-2.5 h-2.5" />
              <span>
                {mode === '2P_ONLINE'
                  ? `ONLINE (${role})`
                  : mode === '2P_LOCAL'
                    ? '2P LOCAL'
                    : difficulty}
              </span>
            </button>
          </div>

          {/* Network Ping Indicator (Online Mode Only) */}
          {mode === '2P_ONLINE' && (
            <div className="flex items-center gap-1 px-2 py-0.5 border border-gray-800 bg-black/60 rounded text-[10px] font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full ${ping === null
                  ? 'bg-yellow-400'
                  : ping < 60
                    ? 'bg-emerald-400 animate-pulse'
                    : ping < 130
                      ? 'bg-yellow-400'
                      : 'bg-red-400'
                  }`}
              />
              <span className="text-gray-400">
                {ping !== null ? `${ping}ms` : 'PINGING...'}
              </span>
            </div>
          )}
        </div>

        {/* Right Scoreboard */}
        <div className="flex items-center justify-end gap-4 text-xs sm:text-sm font-arcade bg-[#080d1a]/60 px-3 py-1 border border-cyan-500/20 sm:border-0 sm:bg-transparent rounded">
          {mode === '1P_AI' && (
            <div className="flex items-center gap-1.5 text-[11px] text-yellow-400 mr-2">
              <Trophy className="w-3 h-3" />
              <span>REC: {highScore.toString().padStart(2, '0')}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">
              {mode === '2P_ONLINE'
                ? role === 'HOST'
                  ? 'YOU'
                  : 'HOST'
                : mode === '2P_LOCAL'
                  ? 'P1'
                  : 'USER'}
              : {playerScore}
            </span>
            <span className="text-gray-600 font-normal">|</span>
            <span className="text-pink-400 font-bold">
              {mode === '2P_ONLINE'
                ? role === 'GUEST'
                  ? 'YOU'
                  : 'GUEST'
                : mode === '2P_LOCAL'
                  ? 'P2'
                  : 'AI'}
              : {p2Score}
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
          onTouchEnd={(e) => e.preventDefault()}
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
              {mode === '2P_ONLINE'
                ? (role === 'HOST' && winner === 'P1') || (role === 'GUEST' && winner === 'P2')
                  ? 'VICTORY SECURED'
                  : 'OPPONENT VICTORIOUS'
                : winner === 'P1'
                  ? 'PLAYER 1 VICTORIOUS'
                  : 'PLAYER 2 VICTORIOUS'}
            </p>
            <p className="font-arcade text-xs text-gray-400 mb-6">
              FINAL SCORE: {playerScore} - {p2Score}
            </p>
            <div className="flex items-center gap-3">
              {mode !== '2P_ONLINE' && (
                <button
                  onClick={() => {
                    sound.playBlip(600);
                    resetMatch();
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-cyan-400 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-400 hover:text-black font-arcade text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(0,243,255,0.4)]"
                >
                  <RotateCcw className="w-4 h-4" /> PLAY AGAIN [R]
                </button>
              )}

              <button
                onClick={() => {
                  sound.playBlip(400);
                  disconnect();
                  setDifficulty(null);
                }}
                className="px-4 py-2 border border-pink-500/60 hover:bg-pink-500/20 text-pink-400 font-arcade text-xs transition-all cursor-pointer"
              >
                EXIT MATCH
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
            if (mode === '2P_ONLINE' && role === 'GUEST') {
              keysRef.current.p2Up = true;
              sendPacket({ type: 'PONG_GUEST_INPUT', up: true, down: false });
            } else {
              keysRef.current.p1Up = true;
            }
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            if (mode === '2P_ONLINE' && role === 'GUEST') {
              keysRef.current.p2Up = false;
              sendPacket({ type: 'PONG_GUEST_INPUT', up: false, down: keysRef.current.p2Down });
            } else {
              keysRef.current.p1Up = false;
            }
          }}
          className="w-28 h-14 flex items-center justify-center border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-arcade text-xs rounded active:bg-cyan-400 active:text-black touch-control"
        >
          ▲ UP
        </button>

        <button
          onTouchStart={(e) => {
            e.preventDefault();
            if (mode === '2P_ONLINE' && role === 'GUEST') {
              keysRef.current.p2Down = true;
              sendPacket({ type: 'PONG_GUEST_INPUT', up: false, down: true });
            } else {
              keysRef.current.p1Down = true;
            }
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            if (mode === '2P_ONLINE' && role === 'GUEST') {
              keysRef.current.p2Down = false;
              sendPacket({ type: 'PONG_GUEST_INPUT', up: keysRef.current.p2Up, down: false });
            } else {
              keysRef.current.p1Down = false;
            }
          }}
          className="w-28 h-14 flex items-center justify-center border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-arcade text-xs rounded active:bg-cyan-400 active:text-black touch-control"
        >
          ▼ DOWN
        </button>
      </div>

      {/* Guide */}
      <div className="mt-4 text-[10px] font-mono text-gray-500 hidden md:block">
        {mode === '2P_ONLINE' ? (
          <span>
            {role === 'HOST'
              ? 'YOU ARE PLAYER 1 (CYAN) [W / S]'
              : 'YOU ARE PLAYER 2 (PINK) [W / S OR UP / DOWN]'}
          </span>
        ) : mode === '2P_LOCAL' ? (
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
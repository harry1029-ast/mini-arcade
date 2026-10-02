// src/games/slime/CyberSlime.tsx
import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { sound } from '../../audio/NeonAudioSynth';
import { useHighScore } from '../../hooks/useHighScore';
import { usePeerRoom } from '../../hooks/usePeerRoom';
import type { SlimeNetworkPacket, SlimeSoundEvent } from '../../types/network';
import type { SlimeEntity, SlimeBall, SlimeParticle, AiServeTactic, SlimeMode } from './types';
import { RotateCcw, ArrowLeft, Trophy, Users, User, Sliders, Globe, Copy, Check } from 'lucide-react';

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

const PLAYER_SERVE_POS = { x: 130, y: 215 };
const AI_SERVE_POS = { x: WIDTH - 130, y: 215 };

const CyberSlimeComponent: React.FC<CyberSlimeProps> = ({ onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { highScore, recordScore } = useHighScore('slime');

  const [mode, setMode] = useState<SlimeMode | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [winner, setWinner] = useState<'P1' | 'P2' | null>(null);
  const [isServingState, setIsServingState] = useState<{ serving: boolean; server: 'PLAYER' | 'AI' }>({
    serving: true,
    server: 'PLAYER',
  });

  // Online Lobby States
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [ping, setPing] = useState<number | null>(null);

  const sendPacketRef = useRef<(packet: SlimeNetworkPacket) => void>(() => { });

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

  const p2Ref = useRef<SlimeEntity>({
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
  const pendingSfxRef = useRef<SlimeSoundEvent | null>(null);
  const keysRef = useRef<{
    p1Left: boolean;
    p1Right: boolean;
    p1Jump: boolean;
    p2Left: boolean;
    p2Right: boolean;
    p2Jump: boolean;
  }>({
    p1Left: false,
    p1Right: false,
    p1Jump: false,
    p2Left: false,
    p2Right: false,
    p2Jump: false,
  });

  const lastTimeRef = useRef<number>(0);
  const modeRef = useRef<SlimeMode | null>(mode);
  modeRef.current = mode;

  const aiServeTicksRef = useRef<number>(0);
  const p1ScoreRef = useRef(0);
  const p2ScoreRef = useRef(0);
  const winnerRef = useRef<'P1' | 'P2' | null>(null);
  const recordScoreRef = useRef(recordScore);
  recordScoreRef.current = recordScore;

  const stageServe = useCallback((servingP1: boolean) => {
    aiServeTicksRef.current = 0;

    playerRef.current.x = 90;
    playerRef.current.y = GROUND_Y;
    playerRef.current.vx = 0;
    playerRef.current.vy = 0;
    playerRef.current.isJumping = false;

    p2Ref.current.x = WIDTH - 80;
    p2Ref.current.y = GROUND_Y;
    p2Ref.current.vx = 0;
    p2Ref.current.vy = 0;
    p2Ref.current.isJumping = false;

    const targetPos = servingP1 ? PLAYER_SERVE_POS : AI_SERVE_POS;
    ballRef.current = {
      x: targetPos.x,
      y: targetPos.y,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      isServing: true,
      server: servingP1 ? 'PLAYER' : 'AI',
    };

    setIsServingState({ serving: true, server: servingP1 ? 'PLAYER' : 'AI' });

    if (!servingP1 && modeRef.current === '1P_AI') {
      const roll = Math.random();
      if (roll < 0.4) {
        aiServeTacticRef.current = 'FAST_SPIKE';
        aiServeDelayRef.current = 35 + Math.floor(Math.random() * 15);
      } else if (roll < 0.75) {
        aiServeTacticRef.current = 'HIGH_LOB';
        aiServeDelayRef.current = 45 + Math.floor(Math.random() * 20);
      } else {
        aiServeTacticRef.current = 'SHORT_DROP';
        aiServeDelayRef.current = 65 + Math.floor(Math.random() * 25);
      }
    }
  }, []);

  const resetMatch = useCallback(() => {
    p1ScoreRef.current = 0;
    p2ScoreRef.current = 0;
    winnerRef.current = null;
    setPlayerScore(0);
    setP2Score(0);
    setWinner(null);
    particlesRef.current = [];
    stageServe(true);
    sound.playBlip(550);
  }, [stageServe]);

  // P2P Data Handler
  const handleNetworkData = useCallback((data: SlimeNetworkPacket) => {
    if (data.type === 'SLIME_START_GAME') {
      setMode('2P_ONLINE');
      setIsLobbyOpen(false);
      resetMatch();
    } else if (data.type === 'PING') {
      sendPacketRef.current({ type: 'PONG_REPLY', timestamp: data.timestamp });
    } else if (data.type === 'PONG_REPLY') {
      const rtt = Math.max(1, Math.round(performance.now() - data.timestamp));
      setPing(Math.round(rtt / 2));
    } else if (data.type === 'SLIME_GUEST_INPUT') {
      keysRef.current.p2Left = data.left;
      keysRef.current.p2Right = data.right;
      keysRef.current.p2Jump = data.jump;
    } else if (data.type === 'SLIME_HOST_SYNC') {
      // Play sound synced from host on guest side
      if (data.sfx) {
        if (data.sfx === 'BLIP_P1') sound.playBlip(650, 'sine', 0.07);
        else if (data.sfx === 'BLIP_P2') sound.playBlip(520, 'sine', 0.07);
        else if (data.sfx === 'BOUNCE') sound.playBounce();
        else if (data.sfx === 'SCORE_EXPLODE') sound.playExplosion();
        else if (data.sfx === 'CHIME') sound.playChime();
        else if (data.sfx === 'JUMP_P1') sound.playBlip(380, 'triangle', 0.05);
        else if (data.sfx === 'JUMP_P2') sound.playBlip(420, 'triangle', 0.05);
      }

      ballRef.current.x = data.ball.x;
      ballRef.current.y = data.ball.y;
      ballRef.current.vx = data.ball.vx;
      ballRef.current.vy = data.ball.vy;
      ballRef.current.isServing = data.ball.isServing;
      ballRef.current.server = data.ball.server;

      playerRef.current.x = data.p1.x;
      playerRef.current.y = data.p1.y;
      playerRef.current.vx = data.p1.vx;
      playerRef.current.vy = data.p1.vy;
      playerRef.current.isJumping = data.p1.isJumping;

      p2Ref.current.x = data.p2.x;
      p2Ref.current.y = data.p2.y;
      p2Ref.current.vx = data.p2.vx;
      p2Ref.current.vy = data.p2.vy;
      p2Ref.current.isJumping = data.p2.isJumping;

      p1ScoreRef.current = data.playerScore;
      p2ScoreRef.current = data.p2Score;
      setPlayerScore(data.playerScore);
      setP2Score(data.p2Score);
      setIsServingState({ serving: data.ball.isServing, server: data.ball.server });

      if (data.ping !== undefined) {
        setPing(data.ping);
      }

      if (data.winner && !winnerRef.current) {
        winnerRef.current = data.winner;
        setWinner(data.winner);
      }
    }
  }, [resetMatch]);

  const { role, roomId, status, errorMsg, sendPacket, createRoom, joinRoom, disconnect } =
    usePeerRoom<SlimeNetworkPacket>(handleNetworkData);

  sendPacketRef.current = sendPacket;

  // Host Heartbeat Ping Loop
  useEffect(() => {
    if (status !== 'CONNECTED' || role !== 'HOST') return;

    const interval = setInterval(() => {
      sendPacketRef.current({
        type: 'PING',
        timestamp: performance.now(),
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [status, role]);

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

  const selectMode = (newMode: SlimeMode) => {
    sound.playBlip(750);
    setMode(newMode);
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
      // Online Guest: Uses both WASD and Arrow Keys to control P2
      if (modeRef.current === '2P_ONLINE' && role === 'GUEST') {
        let changed = false;
        if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
          keysRef.current.p2Left = true;
          changed = true;
        }
        if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
          keysRef.current.p2Right = true;
          changed = true;
        }
        if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp' || e.key === ' ') {
          keysRef.current.p2Jump = true;
          changed = true;
        }
        if (changed) {
          sendPacketRef.current({
            type: 'SLIME_GUEST_INPUT',
            left: keysRef.current.p2Left,
            right: keysRef.current.p2Right,
            jump: keysRef.current.p2Jump,
          });
        }
        return;
      }

      // Player 1 (A / D / W)
      if (e.key === 'a' || e.key === 'A') keysRef.current.p1Left = true;
      if (e.key === 'd' || e.key === 'D') keysRef.current.p1Right = true;
      if (e.key === 'w' || e.key === 'W') keysRef.current.p1Jump = true;

      // Player 2 / AI (Arrow Keys)
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (modeRef.current === '1P_AI') keysRef.current.p1Left = true;
        else if (modeRef.current === '2P_LOCAL') keysRef.current.p2Left = true;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (modeRef.current === '1P_AI') keysRef.current.p1Right = true;
        else if (modeRef.current === '2P_LOCAL') keysRef.current.p2Right = true;
      }
      if (e.key === 'ArrowUp' || e.key === ' ') {
        e.preventDefault();
        if (modeRef.current === '1P_AI') keysRef.current.p1Jump = true;
        else if (modeRef.current === '2P_LOCAL') keysRef.current.p2Jump = true;
      }

      if ((e.key === 'r' || e.key === 'R') && winnerRef.current && modeRef.current !== '2P_ONLINE') {
        resetMatch();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (modeRef.current === '2P_ONLINE' && role === 'GUEST') {
        let changed = false;
        if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
          keysRef.current.p2Left = false;
          changed = true;
        }
        if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
          keysRef.current.p2Right = false;
          changed = true;
        }
        if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp' || e.key === ' ') {
          keysRef.current.p2Jump = false;
          changed = true;
        }
        if (changed) {
          sendPacketRef.current({
            type: 'SLIME_GUEST_INPUT',
            left: keysRef.current.p2Left,
            right: keysRef.current.p2Right,
            jump: keysRef.current.p2Jump,
          });
        }
        return;
      }

      if (e.key === 'a' || e.key === 'A') keysRef.current.p1Left = false;
      if (e.key === 'd' || e.key === 'D') keysRef.current.p1Right = false;
      if (e.key === 'w' || e.key === 'W') keysRef.current.p1Jump = false;

      if (e.key === 'ArrowLeft') {
        if (modeRef.current === '1P_AI') keysRef.current.p1Left = false;
        else if (modeRef.current === '2P_LOCAL') keysRef.current.p2Left = false;
      }
      if (e.key === 'ArrowRight') {
        if (modeRef.current === '1P_AI') keysRef.current.p1Right = false;
        else if (modeRef.current === '2P_LOCAL') keysRef.current.p2Right = false;
      }
      if (e.key === 'ArrowUp' || e.key === ' ') {
        if (modeRef.current === '1P_AI') keysRef.current.p1Jump = false;
        else if (modeRef.current === '2P_LOCAL') keysRef.current.p2Jump = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [resetMatch, role]);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    if (!mode) return;

    stageServe(true);
    let animId: number;
    let syncTick = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      const dt = Math.min(Math.max(elapsed / 16.667, 0.2), 2.5);

      const isHostAuthoritative = modeRef.current !== '2P_ONLINE' || role === 'HOST';

      if (!winnerRef.current) {
        const player = playerRef.current;
        const p2 = p2Ref.current;
        const ball = ballRef.current;
        const netX = WIDTH / 2;

        if (isHostAuthoritative) {
          // 1. Move Player 1
          if (keysRef.current.p1Left) player.vx = -MOVE_SPEED;
          else if (keysRef.current.p1Right) player.vx = MOVE_SPEED;
          else player.vx = 0;

          if (keysRef.current.p1Jump && !player.isJumping) {
            player.vy = JUMP_POWER;
            player.isJumping = true;
            sound.playBlip(380, 'triangle', 0.05);
            pendingSfxRef.current = 'JUMP_P1';
          }

          player.vy += GRAVITY * dt;
          player.x += player.vx * dt;
          player.y += player.vy * dt;

          if (player.x - player.radius < 0) player.x = player.radius;
          if (player.x + player.radius > netX - NET_WIDTH / 2) {
            player.x = netX - NET_WIDTH / 2 - player.radius;
          }
          if (player.y >= GROUND_Y) {
            player.y = GROUND_Y;
            player.vy = 0;
            player.isJumping = false;
          }

          // 2. Move Player 2
          if (modeRef.current === '2P_LOCAL' || modeRef.current === '2P_ONLINE') {
            if (keysRef.current.p2Left) p2.vx = -MOVE_SPEED;
            else if (keysRef.current.p2Right) p2.vx = MOVE_SPEED;
            else p2.vx = 0;

            if (keysRef.current.p2Jump && !p2.isJumping) {
              p2.vy = JUMP_POWER;
              p2.isJumping = true;
              sound.playBlip(420, 'triangle', 0.05);
              pendingSfxRef.current = 'JUMP_P2';
            }
          } else {
            // AI Routine
            if (ball.isServing) {
              if (ball.server === 'AI') {
                aiServeTicksRef.current += 1;
                if (aiServeTicksRef.current > aiServeDelayRef.current) {
                  let targetOffsetX = 14;
                  let runSpeed = MOVE_SPEED * 0.8;

                  if (aiServeTacticRef.current === 'FAST_SPIKE') {
                    targetOffsetX = 20;
                    runSpeed = MOVE_SPEED * 0.95;
                  } else if (aiServeTacticRef.current === 'HIGH_LOB') {
                    targetOffsetX = 3;
                    runSpeed = MOVE_SPEED * 0.65;
                  } else if (aiServeTacticRef.current === 'SHORT_DROP') {
                    targetOffsetX = -6;
                    runSpeed = MOVE_SPEED * 0.55;
                  }

                  const targetX = AI_SERVE_POS.x + targetOffsetX;
                  const diffX = targetX - p2.x;

                  if (Math.abs(diffX) > 4) {
                    p2.vx = Math.sign(diffX) * runSpeed;
                  } else {
                    p2.vx = 0;
                    if (!p2.isJumping && p2.y >= GROUND_Y) {
                      p2.vy = aiServeTacticRef.current === 'SHORT_DROP' ? JUMP_POWER * 0.88 : JUMP_POWER;
                      p2.isJumping = true;
                    }
                  }
                } else {
                  p2.vx = 0;
                }
              } else {
                const readyX = WIDTH - 120;
                const diffX = readyX - p2.x;
                if (Math.abs(diffX) > 8) p2.vx = Math.sign(diffX) * (MOVE_SPEED * 0.6);
                else p2.vx = 0;
              }
            } else {
              const aiTarget = ball.x > netX ? ball.x : WIDTH - 120;
              const distToBall = aiTarget - p2.x;
              if (Math.abs(distToBall) > 10) {
                p2.vx = Math.sign(distToBall) * (MOVE_SPEED * 0.88);
              } else {
                p2.vx = 0;
              }

              if (
                ball.x > netX &&
                ball.x > p2.x - 35 &&
                ball.x < p2.x + 35 &&
                ball.y < GROUND_Y - 45 &&
                ball.vy > 0 &&
                !p2.isJumping
              ) {
                p2.vy = JUMP_POWER;
                p2.isJumping = true;
              }
            }
          }

          p2.vy += GRAVITY * dt;
          p2.x += p2.vx * dt;
          p2.y += p2.vy * dt;

          if (p2.x - p2.radius < netX + NET_WIDTH / 2) {
            p2.x = netX + NET_WIDTH / 2 + p2.radius;
          }
          if (p2.x + p2.radius > WIDTH) p2.x = WIDTH - p2.radius;
          if (p2.y >= GROUND_Y) {
            p2.y = GROUND_Y;
            p2.vy = 0;
            p2.isJumping = false;
          }

          // 3. Move Ball
          if (ball.isServing) {
            const anchor = ball.server === 'PLAYER' ? PLAYER_SERVE_POS : AI_SERVE_POS;
            ball.x = anchor.x;
            ball.y = anchor.y + Math.sin(Date.now() / 160) * 3;

            const serverSlime = ball.server === 'PLAYER' ? player : p2;
            const dx = ball.x - serverSlime.x;
            const dy = ball.y - serverSlime.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < serverSlime.radius + ball.radius && ball.y <= serverSlime.y) {
              ball.isServing = false;
              setIsServingState({ serving: false, server: ball.server });

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
            ball.vy += GRAVITY * 0.65 * dt;
            ball.x += ball.vx * dt;
            ball.y += ball.vy * dt;

            // Outer wall bounces
            if (ball.x - ball.radius <= 0) {
              ball.x = ball.radius;
              ball.vx = -ball.vx * 0.85;
              sound.playBounce();
              pendingSfxRef.current = 'BOUNCE';
              spawnParticles(ball.x, ball.y, '#00f3ff', 5);
            } else if (ball.x + ball.radius >= WIDTH) {
              ball.x = WIDTH - ball.radius;
              ball.vx = -ball.vx * 0.85;
              sound.playBounce();
              pendingSfxRef.current = 'BOUNCE';
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
              pendingSfxRef.current = 'BOUNCE';
              spawnParticles(ball.x, ball.y, '#ffff00', 6);
            }

            // Hemisphere Bounce Checks
            const checkSlimeBounce = (slime: SlimeEntity, isP1: boolean) => {
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

                sound.playBlip(isP1 ? 650 : 520, 'sine', 0.07);
                pendingSfxRef.current = isP1 ? 'BLIP_P1' : 'BLIP_P2';
                spawnParticles(ball.x, ball.y, slime.color, 8);
              }
            };

            checkSlimeBounce(player, true);
            checkSlimeBounce(p2, false);

            // Floor Scoring Trigger
            if (ball.y + ball.radius >= GROUND_Y) {
              sound.playExplosion();
              pendingSfxRef.current = 'SCORE_EXPLODE';
              spawnParticles(ball.x, GROUND_Y, '#ff007f', 16);

              if (ball.x < netX) {
                p2ScoreRef.current += 1;
                setP2Score(p2ScoreRef.current);

                if (p2ScoreRef.current >= WINNING_SCORE) {
                  winnerRef.current = 'P2';
                  setWinner('P2');
                } else {
                  stageServe(false);
                }
              } else {
                p1ScoreRef.current += 1;
                setPlayerScore(p1ScoreRef.current);
                sound.playChime();
                if (modeRef.current === '1P_AI') {
                  recordScoreRef.current(p1ScoreRef.current);
                }

                if (p1ScoreRef.current >= WINNING_SCORE) {
                  winnerRef.current = 'P1';
                  setWinner('P1');
                } else {
                  stageServe(true);
                }
              }
            }
          }

          // Broadcast 30Hz Authoritative State
          if (modeRef.current === '2P_ONLINE' && role === 'HOST') {
            syncTick++;
            if (syncTick % 2 === 0 || pendingSfxRef.current !== null) {
              const currentSfx = pendingSfxRef.current;
              pendingSfxRef.current = null;

              sendPacketRef.current({
                type: 'SLIME_HOST_SYNC',
                ball: {
                  x: ball.x,
                  y: ball.y,
                  vx: ball.vx,
                  vy: ball.vy,
                  isServing: ball.isServing,
                  server: ball.server,
                },
                p1: {
                  x: player.x,
                  y: player.y,
                  vx: player.vx,
                  vy: player.vy,
                  isJumping: player.isJumping,
                },
                p2: {
                  x: p2.x,
                  y: p2.y,
                  vx: p2.vx,
                  vy: p2.vy,
                  isJumping: p2.isJumping,
                },
                playerScore: p1ScoreRef.current,
                p2Score: p2ScoreRef.current,
                winner: winnerRef.current,
                ping: ping ?? undefined,
                sfx: currentSfx ?? undefined,
              });
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
      const drawSlime = (slime: SlimeEntity, isRightSide: boolean) => {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = slime.glow;
        ctx.fillStyle = slime.color;

        ctx.beginPath();
        ctx.arc(slime.x, slime.y, slime.radius, Math.PI, 0, false);
        ctx.closePath();
        ctx.fill();

        // Eye White
        const eyeOffsetX = isRightSide ? -14 : 14;
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
      drawSlime(p2Ref.current, true);

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

    lastTimeRef.current = 0;
    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [mode, stageServe, role]);

  // Online Lobby Setup Dialog
  if (isLobbyOpen) {
    return (
      <div className="flex flex-col items-center max-w-lg mx-auto w-full p-6 bg-[#080d1a]/95 border border-purple-500/40 backdrop-blur-md shadow-[0_0_30px_rgba(188,19,254,0.2)]">
        <div className="flex items-center gap-2 mb-2 text-purple-400 font-arcade text-xs">
          <Globe className="w-4 h-4" /> WEBRTC_SLIME_LINK
        </div>
        <h2 className="font-cyber font-bold text-2xl text-white tracking-wider glow-purple mb-2">
          ONLINE 1v1 LOBBY
        </h2>

        {status === 'CONNECTED' ? (
          <div className="w-full text-center py-6">
            <div className="text-emerald-400 font-arcade text-sm mb-2">LINK ESTABLISHED</div>
            <p className="font-mono text-xs text-gray-400 mb-6">
              Connected as <span className="text-purple-400 font-bold">{role === 'HOST' ? 'PLAYER 1 (PURPLE HOST)' : 'PLAYER 2 (CYAN GUEST)'}</span>.
            </p>
            <button
              onClick={() => {
                sendPacketRef.current({ type: 'SLIME_START_GAME' });
                setMode('2P_ONLINE');
                setIsLobbyOpen(false);
                resetMatch();
              }}
              className="px-6 py-2.5 bg-purple-500 hover:bg-purple-400 text-black font-arcade text-xs tracking-wider cursor-pointer"
            >
              LAUNCH BATTLE
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 w-full my-4">
            {/* Host Section */}
            <div className="p-4 border border-purple-500/30 bg-purple-950/20 rounded">
              <div className="font-arcade text-xs text-purple-300 mb-2">HOST A MATCH</div>
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
                  <div className="mt-3 text-[10px] font-mono text-purple-400/80 animate-pulse">
                    Waiting for peer connection...
                  </div>
                </div>
              ) : (
                <button
                  onClick={createRoom}
                  className="w-full py-2 border border-purple-500 hover:bg-purple-500/20 text-purple-300 font-arcade text-xs cursor-pointer transition-all"
                >
                  GENERATE ROOM CODE
                </button>
              )}
            </div>

            {/* Join Section */}
            <div className="p-4 border border-cyan-500/30 bg-cyan-950/20 rounded">
              <div className="font-arcade text-xs text-cyan-300 mb-2">JOIN A MATCH</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="ENTER ROOM CODE"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  className="bg-black/60 border border-cyan-500/40 text-cyan-300 px-3 py-2 font-mono text-xs uppercase focus:outline-none flex-1"
                />
                <button
                  onClick={() => {
                    sound.playBlip(700); // Wakes up Guest AudioContext on user gesture
                    joinRoom(joinInput);
                  }}
                  disabled={!joinInput.trim() || status === 'CONNECTING'}
                  className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-black border border-cyan-500 font-arcade text-xs cursor-pointer disabled:opacity-50"
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

  // Initial Mode Selector
  if (!mode) {
    return (
      <div className="flex flex-col items-center max-w-lg mx-auto w-full p-6 bg-[#080d1a]/90 border border-purple-500/40 backdrop-blur-md shadow-[0_0_30px_rgba(188,19,254,0.2)]">
        <div className="flex items-center gap-2 mb-2 text-purple-400 font-arcade text-xs">
          <Trophy className="w-4 h-4" /> CYBER_SLIME_ENGAGEMENT
        </div>
        <h2 className="font-cyber font-bold text-2xl text-white tracking-wider glow-purple mb-2">
          SELECT MODE
        </h2>
        <p className="font-mono text-xs text-gray-400 text-center mb-6">
          Connect across the network, play locally on split-keyboard, or engage AI defense.
        </p>

        {/* Online 1v1 Button */}
        <button
          onClick={startOnlineMode}
          className="w-full p-4 mb-3 border border-purple-500/60 hover:border-purple-400 bg-purple-950/30 hover:bg-purple-950/60 text-purple-300 transition-all cursor-pointer group text-left shadow-[0_0_20px_rgba(188,19,254,0.2)]"
        >
          <div className="flex justify-between items-center mb-1">
            <span className="font-arcade text-sm font-bold tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400" /> ONLINE 1v1 (P2P)
            </span>
            <span className="font-mono text-[10px] text-purple-400">ROOM CODE</span>
          </div>
          <div className="font-mono text-xs text-gray-400 group-hover:text-gray-200">
            Direct WebRTC connection with a remote player. Real-time volleyball rally.
          </div>
        </button>

        {/* 2-Player Local Option */}
        <button
          onClick={() => selectMode('2P_LOCAL')}
          className="w-full p-4 mb-3 border border-cyan-500/50 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-300 transition-all cursor-pointer group text-left shadow-[0_0_15px_rgba(0,243,255,0.15)]"
        >
          <div className="flex justify-between items-center mb-1">
            <span className="font-arcade text-sm font-bold tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" /> LOCAL 2-PLAYER
            </span>
            <span className="font-mono text-[10px] text-cyan-400">SPLIT-KEYBOARD</span>
          </div>
          <div className="font-mono text-xs text-gray-400 group-hover:text-gray-200">
            P1: [A / D / W] vs P2: [Arrows]. Head-to-head volleyball rally.
          </div>
        </button>

        {/* 1-Player Solo vs AI */}
        <button
          onClick={() => selectMode('1P_AI')}
          className="w-full p-4 mb-6 border border-gray-600 hover:border-gray-400 bg-black/40 text-gray-300 transition-all cursor-pointer group text-left"
        >
          <div className="flex justify-between items-center mb-1">
            <span className="font-arcade text-sm font-bold tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" /> 1-PLAYER VS AI
            </span>
            <span className="font-mono text-[10px] text-gray-400">TACTICAL DEFENSE</span>
          </div>
          <div className="font-mono text-xs text-gray-400 group-hover:text-gray-200">
            Solo practice vs adaptive AI with dynamic spike, lob, and drop serves.
          </div>
        </button>

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
                setMode(null);
              }}
              className="flex items-center gap-1 px-2 py-1 border border-purple-500/40 hover:bg-purple-500/20 text-[10px] font-arcade text-purple-300 cursor-pointer"
              title="Change Mode"
            >
              <Sliders className="w-2.5 h-2.5" />
              <span>
                {mode === '2P_ONLINE'
                  ? `ONLINE (${role})`
                  : mode === '2P_LOCAL'
                    ? '2P LOCAL'
                    : '1P VS AI'}
              </span>
            </button>
          </div>

          {/* Network Ping Indicator */}
          {status === 'CONNECTED' && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 border border-purple-500/30 bg-black/60 rounded text-[10px] font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full ${ping === null
                  ? 'bg-yellow-400 animate-ping'
                  : ping < 60
                    ? 'bg-emerald-400 shadow-[0_0_8px_#39ff14]'
                    : ping < 130
                      ? 'bg-yellow-400'
                      : 'bg-red-400'
                  }`}
              />
              <span className="text-gray-300 font-bold">
                {ping !== null ? `${ping}ms` : 'PINGING...'}
              </span>
            </div>
          )}
        </div>

        {/* Right Scoreboard */}
        <div className="flex items-center justify-end gap-4 text-xs sm:text-sm font-arcade bg-[#080d1a]/60 px-3 py-1 border border-purple-500/20 sm:border-0 sm:bg-transparent rounded">
          {mode === '1P_AI' && (
            <div className="flex items-center gap-1.5 text-[11px] text-yellow-400 mr-2">
              <Trophy className="w-3 h-3" />
              <span>REC: {highScore.toString().padStart(2, '0')}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-purple-400 font-bold">
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
            <span className="text-cyan-400 font-bold">
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
      <div className="relative border-2 border-purple-500/80 p-1 bg-black shadow-[0_0_20px_rgba(188,19,254,0.3)] w-full max-w-[640px] touch-control">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block w-full h-auto touch-control select-none"
        />

        {/* Serve Prompt */}
        {isServingState.serving && !winner && (
          <div className="absolute bottom-16 left-8 pointer-events-none">
            <span className="font-arcade text-[10px] text-purple-300 tracking-wider animate-pulse bg-black/75 px-3 py-1.5 border border-purple-500/50 shadow-[0_0_10px_rgba(188,19,254,0.4)]">
              {isServingState.server === 'PLAYER'
                ? mode === '2P_ONLINE'
                  ? role === 'HOST'
                    ? 'YOUR SERVE: LEAP INTO BALL'
                    : 'HOST PREPARING SERVE...'
                  : mode === '2P_LOCAL'
                    ? 'PLAYER 1 SERVE: LEAP INTO BALL'
                    : 'LINE UP & LEAP TO SERVE'
                : mode === '2P_ONLINE'
                  ? role === 'GUEST'
                    ? 'YOUR SERVE: LEAP INTO BALL'
                    : 'GUEST PREPARING SERVE...'
                  : mode === '2P_LOCAL'
                    ? 'PLAYER 2 SERVE: LEAP INTO BALL'
                    : 'AI PREPARING SERVE...'}
            </span>
          </div>
        )}

        {/* Win/Loss Modal */}
        {winner && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center backdrop-blur-xs">
            <p
              className={`font-cyber font-black text-2xl tracking-wider mb-2 ${winner === 'P1'
                ? 'text-purple-400 drop-shadow-[0_0_10px_#bc13fe]'
                : 'text-cyan-400 drop-shadow-[0_0_10px_#00f3ff]'
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
                  onClick={resetMatch}
                  className="flex items-center gap-2 px-4 py-2 border border-purple-400 bg-purple-500/20 text-purple-300 hover:bg-purple-400 hover:text-black font-arcade text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(188,19,254,0.4)]"
                >
                  <RotateCcw className="w-4 h-4" /> PLAY AGAIN [R]
                </button>
              )}

              <button
                onClick={() => {
                  sound.playBlip(400);
                  disconnect();
                  setMode(null);
                }}
                className="px-4 py-2 border border-pink-500/60 hover:bg-pink-500/20 text-pink-400 font-arcade text-xs transition-all cursor-pointer"
              >
                EXIT MATCH
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Touch Controls */}
      <div className="grid grid-cols-3 gap-3 mt-6 w-full max-w-xs md:hidden touch-control">
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            if (mode === '2P_ONLINE' && role === 'GUEST') {
              keysRef.current.p2Left = true;
              sendPacketRef.current({
                type: 'SLIME_GUEST_INPUT',
                left: true,
                right: keysRef.current.p2Right,
                jump: keysRef.current.p2Jump,
              });
            } else {
              keysRef.current.p1Left = true;
            }
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            if (mode === '2P_ONLINE' && role === 'GUEST') {
              keysRef.current.p2Left = false;
              sendPacketRef.current({
                type: 'SLIME_GUEST_INPUT',
                left: false,
                right: keysRef.current.p2Right,
                jump: keysRef.current.p2Jump,
              });
            } else {
              keysRef.current.p1Left = false;
            }
          }}
          className="p-3 border border-purple-500/40 bg-purple-950/40 text-purple-300 font-arcade text-xs active:bg-purple-400 active:text-black touch-control"
        >
          ◀ LEFT
        </button>
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            if (mode === '2P_ONLINE' && role === 'GUEST') {
              keysRef.current.p2Jump = true;
              sendPacketRef.current({
                type: 'SLIME_GUEST_INPUT',
                left: keysRef.current.p2Left,
                right: keysRef.current.p2Right,
                jump: true,
              });
            } else {
              keysRef.current.p1Jump = true;
            }
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            if (mode === '2P_ONLINE' && role === 'GUEST') {
              keysRef.current.p2Jump = false;
              sendPacketRef.current({
                type: 'SLIME_GUEST_INPUT',
                left: keysRef.current.p2Left,
                right: keysRef.current.p2Right,
                jump: false,
              });
            } else {
              keysRef.current.p1Jump = false;
            }
          }}
          className="p-3 border border-purple-500/40 bg-purple-950/40 text-purple-300 font-arcade text-xs active:bg-purple-400 active:text-black touch-control"
        >
          ▲ JUMP
        </button>
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            if (mode === '2P_ONLINE' && role === 'GUEST') {
              keysRef.current.p2Right = true;
              sendPacketRef.current({
                type: 'SLIME_GUEST_INPUT',
                left: keysRef.current.p2Left,
                right: true,
                jump: keysRef.current.p2Jump,
              });
            } else {
              keysRef.current.p1Right = true;
            }
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            if (mode === '2P_ONLINE' && role === 'GUEST') {
              keysRef.current.p2Right = false;
              sendPacketRef.current({
                type: 'SLIME_GUEST_INPUT',
                left: keysRef.current.p2Left,
                right: false,
                jump: keysRef.current.p2Jump,
              });
            } else {
              keysRef.current.p1Right = false;
            }
          }}
          className="p-3 border border-purple-500/40 bg-purple-950/40 text-purple-300 font-arcade text-xs active:bg-purple-400 active:text-black touch-control"
        >
          RIGHT ▶
        </button>
      </div>

      {/* Desktop Controls Legend */}
      <div className="mt-4 text-[10px] font-mono text-gray-500 hidden md:block">
        {mode === '2P_ONLINE' ? (
          <span>
            {role === 'HOST'
              ? 'YOU ARE P1 (PURPLE) [A / D / W]'
              : 'YOU ARE P2 (CYAN) [A / D / W OR ARROWS]'}
          </span>
        ) : mode === '2P_LOCAL' ? (
          <span>
            P1 (PURPLE): <strong className="text-purple-400">[A / D / W]</strong> &nbsp;|&nbsp; P2 (CYAN):{' '}
            <strong className="text-cyan-400">[ARROWS]</strong> &nbsp;|&nbsp; RESTART: [R]
          </span>
        ) : (
          <span>MOVE: [A / D] OR [LEFT / RIGHT] // JUMP: [W / SPACE / UP] // RESTART: [R]</span>
        )}
      </div>
    </div>
  );
};

export const CyberSlime = memo(CyberSlimeComponent);
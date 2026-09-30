// src/games/tetris/NeonTetris.tsx
import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { sound } from '../../audio/NeonAudioSynth';
import { useHighScore } from '../../hooks/useHighScore';
import type { TetraminoType, ActivePiece, ClearedRowEffect } from './types';
import { COLS, ROWS, BLOCK_SIZE, SHAPES } from './constants';
import { RotateCcw, ArrowLeft, Trophy, ArrowDown } from 'lucide-react';

interface NeonTetrisProps {
  onExit: () => void;
}

const TETRAMINO_KEYS: TetraminoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

const NeonTetrisComponent: React.FC<NeonTetrisProps> = ({ onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const { highScore, recordScore } = useHighScore('tetris');

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isNewHigh, setIsNewHigh] = useState(false);

  // Synchronous refs for the 60fps render loop
  const gridRef = useRef<(string | null)[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const pieceRef = useRef<ActivePiece | null>(null);
  const nextPieceTypeRef = useRef<TetraminoType>('T');
  const lastTickRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const linesRef = useRef<number>(0);
  const levelRef = useRef<number>(1);
  const gameOverRef = useRef<boolean>(false);
  const clearEffectsRef = useRef<ClearedRowEffect[]>([]);

  const recordScoreRef = useRef(recordScore);
  recordScoreRef.current = recordScore;

  const getRandomPieceType = (): TetraminoType => {
    return TETRAMINO_KEYS[Math.floor(Math.random() * TETRAMINO_KEYS.length)];
  };

  const createPiece = (type: TetraminoType): ActivePiece => {
    const shape = SHAPES[type];
    return {
      type,
      matrix: shape.matrix.map((row) => [...row]),
      x: Math.floor(COLS / 2) - Math.ceil(shape.matrix[0].length / 2),
      y: 0,
      color: shape.color,
      glow: shape.glow,
    };
  };

  // Matrix collision test
  const checkCollision = (piece: ActivePiece, offsetX = 0, offsetY = 0, customMatrix?: number[][]): boolean => {
    const matrix = customMatrix || piece.matrix;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          const newX = piece.x + c + offsetX;
          const newY = piece.y + r + offsetY;

          if (newX < 0 || newX >= COLS || newY >= ROWS) {
            return true;
          }
          if (newY >= 0 && gridRef.current[newY][newX] !== null) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Rotate 90 degrees clockwise: (x', y') = (-y, x)
  const rotateMatrix = (matrix: number[][]): number[][] => {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        rotated[c][rows - 1 - r] = matrix[r][c];
      }
    }
    return rotated;
  };

  // Calculate Ghost Piece position (drop projection)
  const getGhostY = (piece: ActivePiece): number => {
    let ghostY = piece.y;
    while (!checkCollision(piece, 0, ghostY - piece.y + 1)) {
      ghostY++;
    }
    return ghostY;
  };

  const drawNextPiecePreview = useCallback(() => {
    const canvas = nextCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#04060d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const nextShape = SHAPES[nextPieceTypeRef.current];
    const matrix = nextShape.matrix;
    const size = 16;
    const startX = (canvas.width - matrix[0].length * size) / 2;
    const startY = (canvas.height - matrix.length * size) / 2;

    ctx.shadowBlur = 10;
    ctx.shadowColor = nextShape.glow;
    ctx.fillStyle = nextShape.color;

    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          ctx.fillRect(startX + c * size + 1, startY + r * size + 1, size - 2, size - 2);
        }
      }
    }
    ctx.shadowBlur = 0;
  }, []);

  const spawnNextPiece = useCallback(() => {
    const current = createPiece(nextPieceTypeRef.current);
    nextPieceTypeRef.current = getRandomPieceType();
    drawNextPiecePreview();

    // Game Over condition: spawn overlaps existing blocks
    if (checkCollision(current)) {
      gameOverRef.current = true;
      setGameOver(true);
      sound.playExplosion();
      const isHigh = recordScoreRef.current(scoreRef.current);
      if (isHigh) setIsNewHigh(true);
      return;
    }
    pieceRef.current = current;
  }, [drawNextPiecePreview]);

  const mergePieceToGrid = () => {
    const piece = pieceRef.current;
    if (!piece) return;

    for (let r = 0; r < piece.matrix.length; r++) {
      for (let c = 0; c < piece.matrix[r].length; c++) {
        if (piece.matrix[r][c]) {
          const targetY = piece.y + r;
          const targetX = piece.x + c;
          if (targetY >= 0 && targetY < ROWS && targetX >= 0 && targetX < COLS) {
            gridRef.current[targetY][targetX] = piece.color;
          }
        }
      }
    }

    sound.playBounce();

    // Check full lines
    let clearedCount = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (gridRef.current[r].every((cell) => cell !== null)) {
        clearedCount++;
        clearEffectsRef.current.push({ y: r, alpha: 1.0 });
        gridRef.current.splice(r, 1);
        gridRef.current.unshift(Array(COLS).fill(null));
        r++; // Check same row index again after shift
      }
    }

    if (clearedCount > 0) {
      const linePoints = [0, 100, 300, 500, 800];
      const earned = (linePoints[clearedCount] || 100) * levelRef.current;
      scoreRef.current += earned;
      linesRef.current += clearedCount;

      const nextLevel = Math.floor(linesRef.current / 5) + 1;
      levelRef.current = nextLevel;

      setScore(scoreRef.current);
      setLines(linesRef.current);
      setLevel(nextLevel);

      sound.playChime();
    }

    spawnNextPiece();
  };

  const hardDrop = useCallback(() => {
    if (!pieceRef.current || gameOverRef.current) return;
    const ghostY = getGhostY(pieceRef.current);
    const dropDistance = ghostY - pieceRef.current.y;
    scoreRef.current += dropDistance * 2;
    setScore(scoreRef.current);
    pieceRef.current.y = ghostY;
    mergePieceToGrid();
    sound.playBlip(700, 'square', 0.05);
  }, []);

  const moveHorizontal = useCallback((dir: number) => {
    if (!pieceRef.current || gameOverRef.current) return;
    if (!checkCollision(pieceRef.current, dir, 0)) {
      pieceRef.current.x += dir;
      sound.playBlip(420, 'sine', 0.03);
    }
  }, []);

  const moveDown = useCallback(() => {
    if (!pieceRef.current || gameOverRef.current) return;
    if (!checkCollision(pieceRef.current, 0, 1)) {
      pieceRef.current.y += 1;
      scoreRef.current += 1;
      setScore(scoreRef.current);
    } else {
      mergePieceToGrid();
    }
  }, []);

  const rotate = useCallback(() => {
    const piece = pieceRef.current;
    if (!piece || gameOverRef.current) return;
    const rotated = rotateMatrix(piece.matrix);

    // Basic wall kick: test current position, then shift left/right
    if (!checkCollision(piece, 0, 0, rotated)) {
      piece.matrix = rotated;
      sound.playBlip(520, 'sine', 0.04);
    } else if (!checkCollision(piece, -1, 0, rotated)) {
      piece.matrix = rotated;
      piece.x -= 1;
      sound.playBlip(520, 'sine', 0.04);
    } else if (!checkCollision(piece, 1, 0, rotated)) {
      piece.matrix = rotated;
      piece.x += 1;
      sound.playBlip(520, 'sine', 0.04);
    }
  }, []);

  const resetGame = useCallback(() => {
    gridRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    clearEffectsRef.current = [];
    scoreRef.current = 0;
    linesRef.current = 0;
    levelRef.current = 1;
    gameOverRef.current = false;
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setIsNewHigh(false);

    nextPieceTypeRef.current = getRandomPieceType();
    spawnNextPiece();
    sound.playBlip(600);
  }, [spawnNextPiece]);

  // Key bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          moveHorizontal(-1);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          moveHorizontal(1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          moveDown();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          rotate();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        case 'r':
        case 'R':
          if (gameOverRef.current) resetGame();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveHorizontal, moveDown, rotate, hardDrop, resetGame]);

  // 60FPS Canvas Render & Gravity Loop
  useEffect(() => {
    nextPieceTypeRef.current = getRandomPieceType();
    spawnNextPiece();

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      if (!lastTickRef.current) lastTickRef.current = timestamp;
      const progress = timestamp - lastTickRef.current;

      // Gravity speed scales with level
      const fallSpeed = Math.max(120, 750 - (levelRef.current - 1) * 65);

      if (progress > fallSpeed && !gameOverRef.current && pieceRef.current) {
        lastTickRef.current = timestamp;
        if (!checkCollision(pieceRef.current, 0, 1)) {
          pieceRef.current.y += 1;
        } else {
          mergePieceToGrid();
        }
      }

      // Render Canvas
      ctx.fillStyle = '#04060d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid guidelines
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * BLOCK_SIZE, 0);
        ctx.lineTo(c * BLOCK_SIZE, canvas.height);
        ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * BLOCK_SIZE);
        ctx.lineTo(canvas.width, r * BLOCK_SIZE);
        ctx.stroke();
      }

      // Render Fixed Blocks
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const color = gridRef.current[r][c];
          if (color) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = color;
            ctx.fillStyle = color;
            ctx.fillRect(c * BLOCK_SIZE + 1, r * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
          }
        }
      }

      const active = pieceRef.current;
      if (active && !gameOverRef.current) {
        // Render Ghost Piece
        const ghostY = getGhostY(active);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.5;
        for (let r = 0; r < active.matrix.length; r++) {
          for (let c = 0; c < active.matrix[r].length; c++) {
            if (active.matrix[r][c]) {
              ctx.strokeRect(
                (active.x + c) * BLOCK_SIZE + 2,
                (ghostY + r) * BLOCK_SIZE + 2,
                BLOCK_SIZE - 4,
                BLOCK_SIZE - 4
              );
            }
          }
        }

        // Render Active Piece
        ctx.shadowBlur = 12;
        ctx.shadowColor = active.glow;
        ctx.fillStyle = active.color;
        for (let r = 0; r < active.matrix.length; r++) {
          for (let c = 0; c < active.matrix[r].length; c++) {
            if (active.matrix[r][c]) {
              ctx.fillRect(
                (active.x + c) * BLOCK_SIZE + 1,
                (active.y + r) * BLOCK_SIZE + 1,
                BLOCK_SIZE - 2,
                BLOCK_SIZE - 2
              );
            }
          }
        }
      }
      ctx.shadowBlur = 0;

      // Render Line Clear Flash Overlays
      for (let i = clearEffectsRef.current.length - 1; i >= 0; i--) {
        const eff = clearEffectsRef.current[i];
        ctx.fillStyle = `rgba(255, 255, 255, ${eff.alpha})`;
        ctx.fillRect(0, eff.y * BLOCK_SIZE, canvas.width, BLOCK_SIZE);
        eff.alpha -= 0.08;
        if (eff.alpha <= 0) {
          clearEffectsRef.current.splice(i, 1);
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="flex flex-col items-center max-w-xl mx-auto w-full">
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

          <div className="text-xs font-arcade text-cyan-300">
            SCORE <span className="text-white">{score.toString().padStart(5, '0')}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* Main Tetris Grid */}
        <div className="relative border-2 border-pink-500/80 p-1 bg-black shadow-[0_0_20px_rgba(255,0,127,0.25)]">
          <canvas
            ref={canvasRef}
            width={COLS * BLOCK_SIZE}
            height={ROWS * BLOCK_SIZE}
            className="block"
          />

          {gameOver && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center backdrop-blur-xs">
              <p className="font-cyber font-black text-2xl text-red-500 tracking-wider mb-2 drop-shadow-[0_0_10px_#ff0055]">
                MATRIX OVERFLOW
              </p>
              {isNewHigh && (
                <p className="font-arcade text-xs text-yellow-400 mb-4 animate-pulse">
                  ★ NEW HIGH SCORE RECORDED ★
                </p>
              )}
              <p className="font-arcade text-xs text-gray-400 mb-6">FINAL SCORE: {score}</p>
              <button
                onClick={resetGame}
                className="flex items-center gap-2 px-4 py-2 border border-pink-500 bg-pink-500/20 text-pink-300 hover:bg-pink-500 hover:text-white font-arcade text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(255,0,127,0.4)]"
              >
                <RotateCcw className="w-4 h-4" /> PURGE MATRIX [R]
              </button>
            </div>
          )}
        </div>

        {/* Side Panel: Next Piece + Stats */}
        <div className="flex flex-col gap-3 w-28">
          <div className="border border-cyan-500/40 bg-[#080d1a]/80 p-2 text-center">
            <div className="text-[10px] font-arcade text-cyan-400 mb-2">NEXT</div>
            <canvas ref={nextCanvasRef} width={80} height={80} className="mx-auto block" />
          </div>

          <div className="border border-cyan-500/40 bg-[#080d1a]/80 p-2 text-center">
            <div className="text-[9px] font-arcade text-gray-400 mb-1">LINES</div>
            <div className="font-arcade text-xs text-emerald-400">{lines}</div>
          </div>

          <div className="border border-cyan-500/40 bg-[#080d1a]/80 p-2 text-center">
            <div className="text-[9px] font-arcade text-gray-400 mb-1">LEVEL</div>
            <div className="font-arcade text-xs text-purple-400">{level}</div>
          </div>

          <button
            onClick={hardDrop}
            className="border border-pink-500/50 bg-pink-950/30 hover:bg-pink-500 hover:text-white text-pink-300 p-2 font-arcade text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all"
            title="Instant Hard Drop"
          >
            <ArrowDown className="w-3 h-3" /> DROP
          </button>
        </div>
      </div>

      {/* Mobile Touch Controls */}
      <div className="grid grid-cols-4 gap-2 mt-6 w-full max-w-xs md:hidden">
        <button
          onClick={() => moveHorizontal(-1)}
          className="p-3 border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-arcade text-xs active:bg-cyan-400 active:text-black"
        >
          ◀
        </button>
        <button
          onClick={rotate}
          className="p-3 border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-arcade text-xs active:bg-cyan-400 active:text-black"
        >
          ↻
        </button>
        <button
          onClick={moveDown}
          className="p-3 border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-arcade text-xs active:bg-cyan-400 active:text-black"
        >
          ▼
        </button>
        <button
          onClick={() => moveHorizontal(1)}
          className="p-3 border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-arcade text-xs active:bg-cyan-400 active:text-black"
        >
          ▶
        </button>
      </div>

      <div className="mt-4 text-[10px] font-mono text-gray-500 hidden md:block">
        ROTATE: [W / UP] // MOVE: [A,D / ARROWS] // SOFT DROP: [S] // HARD DROP: [SPACE]
      </div>
    </div>
  );
};

export const NeonTetris = memo(NeonTetrisComponent);
// src/games/tank/BattleTank.tsx
import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { sound } from '../../audio/NeonAudioSynth';
import { useHighScore } from '../../hooks/useHighScore';
import type { Direction, TankEntity, Bullet, BrickTile, SparkParticle } from './types';
import {
    CELL_SIZE,
    GRID_COLS,
    GRID_ROWS,
    CANVAS_SIZE,
    TANK_SIZE,
    BULLET_SIZE,
    BULLET_SPEED,
    PLAYER_SPEED,
    ENEMY_SPEED,
    TOTAL_ENEMIES_WAVE,
    MAX_ACTIVE_ENEMIES,
    LEVEL_MAPS,
    TOTAL_LEVELS,
} from './constants';
import type { TankMode } from './types';
import { ArrowLeft, RotateCcw, Trophy, Shield, Crosshair, Users, User, Sliders } from 'lucide-react';

interface BattleTankProps {
    onExit: () => void;
}

const BattleTankComponent: React.FC<BattleTankProps> = ({ onExit }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const { highScore, recordScore } = useHighScore('tank');

    const [mode, setMode] = useState<TankMode | null>(null);
    const [score, setScore] = useState(0);
    const [p1Lives, setP1Lives] = useState(3);
    const [p2Lives, setP2Lives] = useState(3);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [enemiesRemaining, setEnemiesRemaining] = useState(TOTAL_ENEMIES_WAVE);
    const [gameState, setGameState] = useState<'PLAYING' | 'LEVEL_CLEARED' | 'VICTORY' | 'GAME_OVER'>('PLAYING');

    // Authoritative Refs
    const modeRef = useRef<TankMode | null>(null);
    modeRef.current = mode;
    const scoreRef = useRef(0);
    const p1LivesRef = useRef(3);
    const p2LivesRef = useRef(3);
    const levelRef = useRef(1);
    const gameStateRef = useRef<'PLAYING' | 'LEVEL_CLEARED' | 'VICTORY' | 'GAME_OVER'>('PLAYING');
    const remainingEnemiesRef = useRef(TOTAL_ENEMIES_WAVE);

    // Eagle Base state
    const baseAliveRef = useRef(true);
    const baseRect = { x: 12 * CELL_SIZE, y: 22 * CELL_SIZE, size: CELL_SIZE * 2 };

    // Map Bricks
    const bricksRef = useRef<BrickTile[]>([]);

    // Player 1 (Cyan)
    const p1Ref = useRef<TankEntity>({
        x: 9 * CELL_SIZE,
        y: 24 * CELL_SIZE,
        dir: 'UP',
        speed: PLAYER_SPEED,
        size: TANK_SIZE,
        alive: true,
        color: '#00f3ff',
        glow: '#00f3ff',
        shootCooldown: 0,
    });

    // Player 2 (Red)
    const p2Ref = useRef<TankEntity>({
        x: 16 * CELL_SIZE,
        y: 24 * CELL_SIZE,
        dir: 'UP',
        speed: PLAYER_SPEED,
        size: TANK_SIZE,
        alive: false,
        color: '#ff0055',
        glow: '#ff0055',
        shootCooldown: 0,
    });

    const enemiesRef = useRef<TankEntity[]>([]);
    const bulletsRef = useRef<Bullet[]>([]);
    const particlesRef = useRef<SparkParticle[]>([]);
    const lastTimeRef = useRef<number>(0);

    const keysRef = useRef<{
        p1Up: boolean;
        p1Down: boolean;
        p1Left: boolean;
        p1Right: boolean;
        p1Fire: boolean;
        p2Up: boolean;
        p2Down: boolean;
        p2Left: boolean;
        p2Right: boolean;
        p2Fire: boolean;
    }>({
        p1Up: false,
        p1Down: false,
        p1Left: false,
        p1Right: false,
        p1Fire: false,
        p2Up: false,
        p2Down: false,
        p2Left: false,
        p2Right: false,
        p2Fire: false,
    });

    // Keep a stable ref so scoring updates do not re-trigger canvas useEffect
    const recordScoreRef = useRef(recordScore);
    recordScoreRef.current = recordScore;

    // Load Wall Bricks from Current Level Pattern
    const initMap = useCallback((lvlIndex = 0) => {
        const bricks: BrickTile[] = [];
        const map = LEVEL_MAPS[lvlIndex] || LEVEL_MAPS[0];
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (map[r][c] === 'B') {
                    bricks.push({ x: c * CELL_SIZE, y: r * CELL_SIZE, alive: true });
                }
            }
        }
        bricksRef.current = bricks;
    }, []);

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

    const spawnEnemy = () => {
        if (enemiesRef.current.length >= MAX_ACTIVE_ENEMIES || remainingEnemiesRef.current <= 0) return;
        const spawnPoints = [
            { x: 0 * CELL_SIZE, y: 0 * CELL_SIZE },
            { x: 12 * CELL_SIZE, y: 0 * CELL_SIZE },
            { x: 24 * CELL_SIZE, y: 0 * CELL_SIZE },
        ];
        const pt = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];

        enemiesRef.current.push({
            x: pt.x,
            y: pt.y,
            dir: 'DOWN',
            speed: ENEMY_SPEED,
            size: TANK_SIZE,
            alive: true,
            color: '#b026ff',
            glow: '#d946ef',
            shootCooldown: 40,
        });
        remainingEnemiesRef.current -= 1;
        setEnemiesRemaining(remainingEnemiesRef.current);
    };

    const clearKeys = useCallback(() => {
        keysRef.current = {
            p1Up: false,
            p1Down: false,
            p1Left: false,
            p1Right: false,
            p1Fire: false,
            p2Up: false,
            p2Down: false,
            p2Left: false,
            p2Right: false,
            p2Fire: false,
        };
    }, []);

    const startLevel = useCallback((lvlNum: number) => {
        clearKeys();
        levelRef.current = lvlNum;
        setCurrentLevel(lvlNum);
        remainingEnemiesRef.current = TOTAL_ENEMIES_WAVE;
        setEnemiesRemaining(TOTAL_ENEMIES_WAVE);
        baseAliveRef.current = true;
        gameStateRef.current = 'PLAYING';
        setGameState('PLAYING');

        p1Ref.current = {
            x: 9 * CELL_SIZE,
            y: 24 * CELL_SIZE,
            dir: 'UP',
            speed: PLAYER_SPEED,
            size: TANK_SIZE,
            alive: p1LivesRef.current > 0,
            color: '#00f3ff',
            glow: '#00f3ff',
            shootCooldown: 0,
        };

        p2Ref.current = {
            x: 16 * CELL_SIZE,
            y: 24 * CELL_SIZE,
            dir: 'UP',
            speed: PLAYER_SPEED,
            size: TANK_SIZE,
            alive: modeRef.current === 'LOCAL_2P' && p2LivesRef.current > 0,
            color: '#ff0055',
            glow: '#ff0055',
            shootCooldown: 0,
        };

        enemiesRef.current = [];
        bulletsRef.current = [];
        particlesRef.current = [];
        initMap(lvlNum - 1);
        sound.playBlip(620);
    }, [initMap]);

    const resetGame = useCallback(() => {
        clearKeys();
        scoreRef.current = 0;
        p1LivesRef.current = 3;
        p2LivesRef.current = 3;
        setScore(0);
        setP1Lives(3);
        setP2Lives(3);
        startLevel(1);
    }, [startLevel, clearKeys]);

    const selectMode = useCallback((selectedMode: TankMode) => {
        sound.playBlip(750);
        setMode(selectedMode);
        modeRef.current = selectedMode;
        resetGame();
    }, [resetGame]);

    const nextLevel = useCallback(() => {
        clearKeys();
        if (levelRef.current < TOTAL_LEVELS) {
            startLevel(levelRef.current + 1);
        }
    }, [startLevel, clearKeys]);

    // AABB Bounding Box Check against walls and base
    const collidesWithBricksOrBase = (x: number, y: number, size: number) => {
        // Screen bounds
        if (x < 0 || x + size > CANVAS_SIZE || y < 0 || y + size > CANVAS_SIZE) return true;

        // Eagle base
        if (
            x < baseRect.x + baseRect.size &&
            x + size > baseRect.x &&
            y < baseRect.y + baseRect.size &&
            y + size > baseRect.y
        ) {
            return true;
        }

        // Active Bricks
        for (const b of bricksRef.current) {
            if (!b.alive) continue;
            if (
                x < b.x + CELL_SIZE &&
                x + size > b.x &&
                y < b.y + CELL_SIZE &&
                y + size > b.y
            ) {
                return true;
            }
        }
        return false;
    };

    // Dual Split-Keyboard Listeners with Window Blur Protection
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // P1: W / A / S / D + Space
            if (e.key === 'w' || e.key === 'W') { e.preventDefault(); keysRef.current.p1Up = true; }
            if (e.key === 's' || e.key === 'S') { e.preventDefault(); keysRef.current.p1Down = true; }
            if (e.key === 'a' || e.key === 'A') { e.preventDefault(); keysRef.current.p1Left = true; }
            if (e.key === 'd' || e.key === 'D') { e.preventDefault(); keysRef.current.p1Right = true; }
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                keysRef.current.p1Fire = true;
            }

            // Arrow Keys + Enter: P2 in LOCAL_2P mode, or alternative P1 in SOLO mode
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (modeRef.current === 'LOCAL_2P') keysRef.current.p2Up = true;
                else keysRef.current.p1Up = true;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (modeRef.current === 'LOCAL_2P') keysRef.current.p2Down = true;
                else keysRef.current.p1Down = true;
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (modeRef.current === 'LOCAL_2P') keysRef.current.p2Left = true;
                else keysRef.current.p1Left = true;
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (modeRef.current === 'LOCAL_2P') keysRef.current.p2Right = true;
                else keysRef.current.p1Right = true;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (modeRef.current === 'LOCAL_2P') keysRef.current.p2Fire = true;
                else keysRef.current.p1Fire = true;
            }

            if ((e.key === 'r' || e.key === 'R') && gameStateRef.current !== 'PLAYING') {
                resetGame();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            // P1 key releases
            if (e.key === 'w' || e.key === 'W') keysRef.current.p1Up = false;
            if (e.key === 's' || e.key === 'S') keysRef.current.p1Down = false;
            if (e.key === 'a' || e.key === 'A') keysRef.current.p1Left = false;
            if (e.key === 'd' || e.key === 'D') keysRef.current.p1Right = false;
            if (e.key === ' ' || e.code === 'Space') keysRef.current.p1Fire = false;

            // Mirror keyup behavior cleanly for both modes
            if (e.key === 'ArrowUp') {
                if (modeRef.current === 'LOCAL_2P') keysRef.current.p2Up = false;
                else keysRef.current.p1Up = false;
            }
            if (e.key === 'ArrowDown') {
                if (modeRef.current === 'LOCAL_2P') keysRef.current.p2Down = false;
                else keysRef.current.p1Down = false;
            }
            if (e.key === 'ArrowLeft') {
                if (modeRef.current === 'LOCAL_2P') keysRef.current.p2Left = false;
                else keysRef.current.p1Left = false;
            }
            if (e.key === 'ArrowRight') {
                if (modeRef.current === 'LOCAL_2P') keysRef.current.p2Right = false;
                else keysRef.current.p1Right = false;
            }
            if (e.key === 'Enter') {
                if (modeRef.current === 'LOCAL_2P') keysRef.current.p2Fire = false;
                else keysRef.current.p1Fire = false;
            }
        };

        const handleBlur = () => {
            clearKeys();
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, [resetGame, clearKeys]);

    // Main 60fps Game Loop
    useEffect(() => {
        if (!mode) return;
        initMap(levelRef.current - 1);
        let animId: number;
        let spawnTimer = 0;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const fireBullet = (tank: TankEntity, owner: 'P1' | 'P2' | 'ENEMY') => {
            let bx = tank.x + tank.size / 2 - BULLET_SIZE / 2;
            let by = tank.y + tank.size / 2 - BULLET_SIZE / 2;

            if (tank.dir === 'UP') by = tank.y - BULLET_SIZE;
            if (tank.dir === 'DOWN') by = tank.y + tank.size;
            if (tank.dir === 'LEFT') bx = tank.x - BULLET_SIZE;
            if (tank.dir === 'RIGHT') bx = tank.x + tank.size;

            bulletsRef.current.push({
                x: bx,
                y: by,
                dir: tank.dir,
                speed: BULLET_SPEED,
                size: BULLET_SIZE,
                owner,
                color: tank.color,
            });

            if (owner === 'P1' || owner === 'P2') {
                sound.playBlip(owner === 'P1' ? 780 : 640, 'square', 0.05);
            }
        };

        const gameLoop = (timestamp: number) => {
            if (!lastTimeRef.current) lastTimeRef.current = timestamp;
            const elapsed = timestamp - lastTimeRef.current;
            lastTimeRef.current = timestamp;
            const dt = Math.min(Math.max(elapsed / 16.667, 0.2), 2.5);

            if (gameStateRef.current === 'PLAYING') {
                // Enemy Wave Spawner
                spawnTimer += dt;
                if (spawnTimer > 120 && enemiesRef.current.length < MAX_ACTIVE_ENEMIES) {
                    spawnEnemy();
                    spawnTimer = 0;
                }

                // Player 1 (Cyan) Update
                const p1 = p1Ref.current;
                if (p1.alive) {
                    let nextX = p1.x;
                    let nextY = p1.y;
                    let moved = false;

                    if (keysRef.current.p1Up) {
                        p1.dir = 'UP';
                        nextY -= p1.speed * dt;
                        moved = true;
                    } else if (keysRef.current.p1Down) {
                        p1.dir = 'DOWN';
                        nextY += p1.speed * dt;
                        moved = true;
                    } else if (keysRef.current.p1Left) {
                        p1.dir = 'LEFT';
                        nextX -= p1.speed * dt;
                        moved = true;
                    } else if (keysRef.current.p1Right) {
                        p1.dir = 'RIGHT';
                        nextX += p1.speed * dt;
                        moved = true;
                    }

                    if (moved && !collidesWithBricksOrBase(nextX, nextY, p1.size)) {
                        p1.x = nextX;
                        p1.y = nextY;
                    }

                    const p1HasBullet = bulletsRef.current.some((b) => b.owner === 'P1');
                    if (keysRef.current.p1Fire && !p1HasBullet) {
                        fireBullet(p1, 'P1');
                    }
                }

                // Player 2 (Red) Update (2P Local Mode)
                const p2 = p2Ref.current;
                if (modeRef.current === 'LOCAL_2P' && p2.alive) {
                    let nextX = p2.x;
                    let nextY = p2.y;
                    let moved = false;

                    if (keysRef.current.p2Up) {
                        p2.dir = 'UP';
                        nextY -= p2.speed * dt;
                        moved = true;
                    } else if (keysRef.current.p2Down) {
                        p2.dir = 'DOWN';
                        nextY += p2.speed * dt;
                        moved = true;
                    } else if (keysRef.current.p2Left) {
                        p2.dir = 'LEFT';
                        nextX -= p2.speed * dt;
                        moved = true;
                    } else if (keysRef.current.p2Right) {
                        p2.dir = 'RIGHT';
                        nextX += p2.speed * dt;
                        moved = true;
                    }

                    if (moved && !collidesWithBricksOrBase(nextX, nextY, p2.size)) {
                        p2.x = nextX;
                        p2.y = nextY;
                    }

                    const p2HasBullet = bulletsRef.current.some((b) => b.owner === 'P2');
                    if (keysRef.current.p2Fire && !p2HasBullet) {
                        fireBullet(p2, 'P2');
                    }
                }

                // Enemy AI Movement & Firing
                for (const enemy of enemiesRef.current) {
                    let nx = enemy.x;
                    let ny = enemy.y;

                    if (enemy.dir === 'UP') ny -= enemy.speed * dt;
                    if (enemy.dir === 'DOWN') ny += enemy.speed * dt;
                    if (enemy.dir === 'LEFT') nx -= enemy.speed * dt;
                    if (enemy.dir === 'RIGHT') nx += enemy.speed * dt;

                    if (!collidesWithBricksOrBase(nx, ny, enemy.size)) {
                        enemy.x = nx;
                        enemy.y = ny;
                    } else {
                        // Pick an unblocked cardinal direction to avoid spinning in place
                        const allDirs: Direction[] = ['DOWN', 'LEFT', 'RIGHT', 'UP'];
                        const validDirs = allDirs.filter((d) => {
                            if (d === enemy.dir) return false;
                            let tx = enemy.x;
                            let ty = enemy.y;
                            if (d === 'UP') ty -= 4;
                            if (d === 'DOWN') ty += 4;
                            if (d === 'LEFT') tx -= 4;
                            if (d === 'RIGHT') tx += 4;
                            return !collidesWithBricksOrBase(tx, ty, enemy.size);
                        });

                        if (validDirs.length > 0) {
                            enemy.dir = validDirs[Math.floor(Math.random() * validDirs.length)];
                        } else {
                            // If fully surrounded, reverse heading
                            const opposite: Record<Direction, Direction> = {
                                UP: 'DOWN',
                                DOWN: 'UP',
                                LEFT: 'RIGHT',
                                RIGHT: 'LEFT',
                            };
                            enemy.dir = opposite[enemy.dir];
                        }
                    }

                    // Enemy Random Firing
                    enemy.shootCooldown -= dt;
                    if (enemy.shootCooldown <= 0) {
                        fireBullet(enemy, 'ENEMY');
                        enemy.shootCooldown = 60 + Math.random() * 60;
                    }
                }

                // --- BULLET PHYSICS & DESTRUCTION ---
                const deadBulletIndices = new Set<number>();

                for (let i = 0; i < bulletsRef.current.length; i++) {
                    const b = bulletsRef.current[i];
                    if (!b || deadBulletIndices.has(i)) continue;

                    if (b.dir === 'UP') b.y -= b.speed * dt;
                    if (b.dir === 'DOWN') b.y += b.speed * dt;
                    if (b.dir === 'LEFT') b.x -= b.speed * dt;
                    if (b.dir === 'RIGHT') b.x += b.speed * dt;

                    // Out of screen
                    if (b.x < 0 || b.x > CANVAS_SIZE || b.y < 0 || b.y > CANVAS_SIZE) {
                        deadBulletIndices.add(i);
                        continue;
                    }

                    // Bullet vs Bullet collision cancellation
                    for (let j = 0; j < bulletsRef.current.length; j++) {
                        if (i === j || deadBulletIndices.has(j)) continue;
                        const other = bulletsRef.current[j];
                        if (!other) continue;

                        if (
                            b.x < other.x + other.size &&
                            b.x + b.size > other.x &&
                            b.y < other.y + other.size &&
                            b.y + b.size > other.y
                        ) {
                            spawnParticles(b.x, b.y, '#ffffff', 6);
                            deadBulletIndices.add(i);
                            deadBulletIndices.add(j);
                            break;
                        }
                    }
                    if (deadBulletIndices.has(i)) continue;

                    // Hit Brick Walls
                    let hitBrick = false;
                    for (const brick of bricksRef.current) {
                        if (!brick.alive) continue;
                        if (
                            b.x < brick.x + CELL_SIZE &&
                            b.x + b.size > brick.x &&
                            b.y < brick.y + CELL_SIZE &&
                            b.y + b.size > brick.y
                        ) {
                            brick.alive = false;
                            hitBrick = true;
                            sound.playBounce();
                            spawnParticles(brick.x + 8, brick.y + 8, '#b83b1d', 6);
                            break;
                        }
                    }
                    if (hitBrick) {
                        deadBulletIndices.add(i);
                        continue;
                    }

                    // Hit Base Eagle
                    if (
                        b.x < baseRect.x + baseRect.size &&
                        b.x + b.size > baseRect.x &&
                        b.y < baseRect.y + baseRect.size &&
                        b.y + b.size > baseRect.y
                    ) {
                        baseAliveRef.current = false;
                        deadBulletIndices.add(i);
                        spawnParticles(baseRect.x + 16, baseRect.y + 16, '#ffe600', 30);
                        sound.playExplosion();
                        gameStateRef.current = 'GAME_OVER';
                        setGameState('GAME_OVER');
                        continue;
                    }

                    // Hit Player 1 (Cyan)
                    if (b.owner === 'ENEMY' && p1.alive) {
                        if (
                            b.x < p1.x + p1.size &&
                            b.x + b.size > p1.x &&
                            b.y < p1.y + p1.size &&
                            b.y + b.size > p1.y
                        ) {
                            deadBulletIndices.add(i);
                            spawnParticles(p1.x + 8, p1.y + 8, '#00f3ff', 20);
                            sound.playExplosion();
                            p1LivesRef.current -= 1;
                            setP1Lives(p1LivesRef.current);

                            if (p1LivesRef.current <= 0) {
                                p1.alive = false;
                                const p2Dead = modeRef.current === 'LOCAL_2P' ? p2LivesRef.current <= 0 : true;
                                if (p2Dead) {
                                    gameStateRef.current = 'GAME_OVER';
                                    setGameState('GAME_OVER');
                                }
                            } else {
                                p1.x = 9 * CELL_SIZE;
                                p1.y = 24 * CELL_SIZE;
                                p1.dir = 'UP';
                            }
                            continue;
                        }
                    }

                    // Hit Player 2 (Red)
                    if (b.owner === 'ENEMY' && modeRef.current === 'LOCAL_2P' && p2.alive) {
                        if (
                            b.x < p2.x + p2.size &&
                            b.x + b.size > p2.x &&
                            b.y < p2.y + p2.size &&
                            b.y + b.size > p2.y
                        ) {
                            deadBulletIndices.add(i);
                            spawnParticles(p2.x + 8, p2.y + 8, '#ff0055', 20);
                            sound.playExplosion();
                            p2LivesRef.current -= 1;
                            setP2Lives(p2LivesRef.current);

                            if (p2LivesRef.current <= 0) {
                                p2.alive = false;
                                if (p1LivesRef.current <= 0) {
                                    gameStateRef.current = 'GAME_OVER';
                                    setGameState('GAME_OVER');
                                }
                            } else {
                                p2.x = 16 * CELL_SIZE;
                                p2.y = 24 * CELL_SIZE;
                                p2.dir = 'UP';
                            }
                            continue;
                        }
                    }

                    // Hit Enemies from P1 or P2
                    if (b.owner === 'P1' || b.owner === 'P2') {
                        let hitEnemyIdx = -1;
                        for (let eIdx = 0; eIdx < enemiesRef.current.length; eIdx++) {
                            const enemy = enemiesRef.current[eIdx];
                            if (
                                b.x < enemy.x + enemy.size &&
                                b.x + b.size > enemy.x &&
                                b.y < enemy.y + enemy.size &&
                                b.y + b.size > enemy.y
                            ) {
                                hitEnemyIdx = eIdx;
                                break;
                            }
                        }

                        if (hitEnemyIdx !== -1) {
                            const enemy = enemiesRef.current[hitEnemyIdx];
                            spawnParticles(enemy.x + 8, enemy.y + 8, '#b026ff', 20);
                            sound.playExplosion();
                            enemiesRef.current.splice(hitEnemyIdx, 1);
                            deadBulletIndices.add(i);

                            scoreRef.current += 100;
                            setScore(scoreRef.current);
                            recordScoreRef.current(scoreRef.current);

                            if (enemiesRef.current.length === 0 && remainingEnemiesRef.current <= 0) {
                                if (levelRef.current >= TOTAL_LEVELS) {
                                    gameStateRef.current = 'VICTORY';
                                    setGameState('VICTORY');
                                    sound.playChime();
                                } else {
                                    gameStateRef.current = 'LEVEL_CLEARED';
                                    setGameState('LEVEL_CLEARED');
                                    sound.playChime();
                                }
                            }
                            continue;
                        }
                    }
                }

                // Cleanly filter out expired bullets in one safe batch
                if (deadBulletIndices.size > 0) {
                    bulletsRef.current = bulletsRef.current.filter((_, idx) => !deadBulletIndices.has(idx));
                }
            }

            // --- RENDERING PASS ---
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

            // Draw Destructible Brick Tiles (Red/Brown Arcade Pattern)
            for (const b of bricksRef.current) {
                if (!b.alive) continue;
                ctx.fillStyle = '#b83b1d';
                ctx.fillRect(b.x, b.y, CELL_SIZE, CELL_SIZE);
                // Brick Mortar line
                ctx.strokeStyle = '#2b1008';
                ctx.lineWidth = 1;
                ctx.strokeRect(b.x + 0.5, b.y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
            }

            // Draw Base Eagle Icon
            if (baseAliveRef.current) {
                ctx.fillStyle = '#ffe600';
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 8;
                // Stylized Eagle Wings & Head
                ctx.fillRect(baseRect.x + 4, baseRect.y + 8, 24, 16);
                ctx.fillRect(baseRect.x + 12, baseRect.y + 2, 8, 8);
                ctx.fillRect(baseRect.x + 6, baseRect.y + 24, 6, 6);
                ctx.fillRect(baseRect.x + 20, baseRect.y + 24, 6, 6);
                ctx.shadowBlur = 0;
            } else {
                // Destroyed Base Flag/Rubble
                ctx.fillStyle = '#555555';
                ctx.fillRect(baseRect.x + 8, baseRect.y + 8, 16, 16);
            }

            // Render Tank Sprite Helper
            const drawTank = (tank: TankEntity) => {
                ctx.save();
                ctx.fillStyle = tank.color;
                ctx.shadowColor = tank.glow;
                ctx.shadowBlur = 6;

                // Tank Center
                const cx = tank.x + tank.size / 2;
                const cy = tank.y + tank.size / 2;

                ctx.translate(cx, cy);
                if (tank.dir === 'UP') ctx.rotate(0);
                if (tank.dir === 'RIGHT') ctx.rotate(Math.PI / 2);
                if (tank.dir === 'DOWN') ctx.rotate(Math.PI);
                if (tank.dir === 'LEFT') ctx.rotate(-Math.PI / 2);

                // Chassis & Dual Treads
                ctx.fillRect(-tank.size / 2, -tank.size / 2, 3, tank.size);
                ctx.fillRect(tank.size / 2 - 3, -tank.size / 2, 3, tank.size);
                ctx.fillRect(-4, -5, 8, 10);
                // Cannon Turret
                ctx.fillRect(-1.5, -tank.size / 2 - 2, 3, 7);

                ctx.restore();
            };

            // Draw Players & Enemies
            if (p1Ref.current.alive) drawTank(p1Ref.current);
            if (modeRef.current === 'LOCAL_2P' && p2Ref.current.alive) drawTank(p2Ref.current);
            for (const e of enemiesRef.current) drawTank(e);

            // Bullets
            for (const b of bulletsRef.current) {
                ctx.fillStyle = b.color;
                ctx.shadowColor = b.color;
                ctx.shadowBlur = 4;
                ctx.fillRect(b.x, b.y, b.size, b.size);
            }
            ctx.shadowBlur = 0;

            // Explosion Particles
            for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                const pt = particlesRef.current[i];
                pt.x += pt.vx;
                pt.y += pt.vy;
                pt.alpha -= 0.04;
                if (pt.alpha <= 0) {
                    particlesRef.current.splice(i, 1);
                } else {
                    ctx.fillStyle = pt.color;
                    ctx.globalAlpha = pt.alpha;
                    ctx.fillRect(pt.x, pt.y, 2, 2);
                    ctx.globalAlpha = 1;
                }
            }

            animId = requestAnimationFrame(gameLoop);
        };

        lastTimeRef.current = 0;
        animId = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animId);
    }, [mode, initMap]);

    // Initial Engagement Mode Selector
    if (!mode) {
        return (
            <div className="flex flex-col items-center max-w-lg mx-auto w-full p-6 bg-[#080d1a]/90 border border-green-500/40 backdrop-blur-md shadow-[0_0_30px_rgba(34,197,94,0.2)] select-none">
                <div className="flex items-center gap-2 mb-2 text-green-400 font-arcade text-xs">
                    <Shield className="w-4 h-4" /> BATTLE_TANK_PROTOCOL
                </div>
                <h2 className="font-cyber font-bold text-2xl text-white tracking-wider glow-cyan mb-2">
                    SELECT ENGAGEMENT
                </h2>
                <p className="font-mono text-xs text-gray-400 text-center mb-6">
                    Defend the core eagle matrix. Play solo or mobilize in split-keyboard co-op.
                </p>

                {/* 1-Player Solo Mode */}
                <button
                    onClick={() => selectMode('SOLO')}
                    className="w-full p-4 mb-3 border border-cyan-500/50 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-300 transition-all cursor-pointer group text-left shadow-[0_0_15px_rgba(0,243,255,0.15)]"
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-arcade text-sm font-bold tracking-wider flex items-center gap-2">
                            <User className="w-4 h-4 text-cyan-400" /> 1-PLAYER SOLO
                        </span>
                        <span className="font-mono text-[10px] text-cyan-400">DEFEND BASE</span>
                    </div>
                    <div className="font-mono text-xs text-gray-400 group-hover:text-gray-200">
                        Player 1 (Cyan): [W/A/S/D] or [ARROWS] + [SPACE] to fire.
                    </div>
                </button>

                {/* 2-Player Local Co-op Mode */}
                <button
                    onClick={() => selectMode('LOCAL_2P')}
                    className="w-full p-4 mb-6 border border-pink-500/50 hover:border-pink-400 bg-pink-950/20 hover:bg-pink-950/40 text-pink-300 transition-all cursor-pointer group text-left shadow-[0_0_15px_rgba(255,0,85,0.15)]"
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-arcade text-sm font-bold tracking-wider flex items-center gap-2">
                            <Users className="w-4 h-4 text-pink-400" /> LOCAL 2-PLAYER CO-OP
                        </span>
                        <span className="font-mono text-[10px] text-pink-400">SPLIT-KEYBOARD</span>
                    </div>
                    <div className="font-mono text-xs text-gray-400 group-hover:text-gray-200">
                        P1 (Cyan): [W/A/S/D] + [SPACE] &nbsp;|&nbsp; P2 (Red): [ARROWS] + [ENTER]
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
        <div className="flex flex-col items-center max-w-xl mx-auto w-full select-none">
            {/* Responsive Top HUD */}
            <div className="w-full mb-3 px-1 flex flex-col gap-2 sm:gap-0 sm:flex-row sm:items-center sm:justify-between font-arcade text-xs">
                {/* Left Action Buttons */}
                <div className="flex items-center justify-between sm:justify-start gap-2">
                    <button
                        onClick={() => {
                            sound.playBlip(300);
                            onExit();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 border border-pink-500/50 hover:bg-pink-500/20 text-[#ff007f] cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> DECK
                    </button>

                    <button
                        onClick={() => {
                            sound.playBlip(400);
                            setMode(null);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 border border-cyan-500/40 hover:bg-cyan-500/20 text-[10px] text-cyan-300 cursor-pointer shadow-[0_0_10px_rgba(0,243,255,0.15)]"
                        title="Change Engagement Mode"
                    >
                        <Sliders className="w-3 h-3" />
                        <span>{mode === 'SOLO' ? '1P SOLO' : '2P LOCAL'}</span>
                    </button>
                </div>

                {/* Right Status / Telemetry Chips */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 text-[11px] bg-[#080d1a]/60 px-2.5 py-1.5 border border-cyan-500/20 sm:border-0 sm:bg-transparent rounded">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 border border-emerald-500/40 bg-emerald-950/30 rounded text-emerald-400">
                        <span>LVL {currentLevel}/{TOTAL_LEVELS}</span>
                    </div>

                    <div className="flex items-center gap-1 text-yellow-400">
                        <Crosshair className="w-3 h-3" />
                        <span>{enemiesRemaining + enemiesRef.current.length}</span>
                    </div>

                    {/* Lives Counter */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-cyan-400 font-bold">P1: {p1Lives}</span>
                        {mode === 'LOCAL_2P' && (
                            <>
                                <span className="text-gray-600">|</span>
                                <span className="text-red-500 font-bold">P2: {p2Lives}</span>
                            </>
                        )}
                    </div>

                    <div className="text-white font-mono">PTS: {score}</div>
                </div>
            </div>

            {/* Screen Frame & Canvas */}
            <div className="relative border-4 border-green-700/80 p-1 bg-black shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_SIZE}
                    height={CANVAS_SIZE}
                    className="block w-full max-w-[416px] h-auto object-contain touch-control"
                />

                {/* Level Cleared Transition Screen */}
                {gameState === 'LEVEL_CLEARED' && (
                    <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center backdrop-blur-xs">
                        <p className="font-cyber font-black text-2xl tracking-wider mb-2 text-cyan-400 drop-shadow-[0_0_10px_#00f3ff]">
                            LEVEL {currentLevel} CLEARED
                        </p>
                        <p className="font-arcade text-xs text-gray-300 mb-6">
                            PREPARE FOR SECTOR {currentLevel + 1}...
                        </p>
                        <button
                            onClick={nextLevel}
                            className="flex items-center gap-2 px-5 py-2.5 border border-cyan-400 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-400 hover:text-black font-arcade text-xs cursor-pointer shadow-[0_0_15px_rgba(0,243,255,0.4)]"
                        >
                            ENGAGE LEVEL {currentLevel + 1}
                        </button>
                    </div>
                )}

                {/* Final Victory / Game Over Screen */}
                {(gameState === 'VICTORY' || gameState === 'GAME_OVER') && (
                    <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center backdrop-blur-xs">
                        <p
                            className={`font-cyber font-black text-2xl tracking-wider mb-2 ${gameState === 'VICTORY' ? 'text-yellow-400 drop-shadow-[0_0_10px_#ffe600]' : 'text-red-500 drop-shadow-[0_0_10px_#ff0055]'
                                }`}
                        >
                            {gameState === 'VICTORY' ? 'ALL SECTORS LIBERATED' : 'BASE DESTROYED'}
                        </p>
                        <p className="font-arcade text-xs text-gray-400 mb-6">FINAL SCORE: {score}</p>
                        <button
                            onClick={resetGame}
                            className="flex items-center gap-2 px-4 py-2 border border-yellow-400 bg-yellow-500/20 text-yellow-300 hover:bg-yellow-400 hover:text-black font-arcade text-xs cursor-pointer shadow-[0_0_15px_rgba(255,230,0,0.3)]"
                        >
                            <RotateCcw className="w-4 h-4" /> PLAY AGAIN [R]
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile Touch Controls - Expanded Ergonomic Layout */}
            <div className="flex items-center justify-between w-full max-w-md mt-6 px-4 md:hidden touch-control select-none">
                {/* 4-Way Cardinal D-Pad */}
                <div className="grid grid-cols-3 gap-2 w-44">
                    <div />
                    <button
                        onTouchStart={(e) => { e.preventDefault(); keysRef.current.p1Up = true; }}
                        onTouchEnd={(e) => { e.preventDefault(); keysRef.current.p1Up = false; }}
                        className="h-14 w-14 flex items-center justify-center border-2 border-cyan-500/60 bg-cyan-950/60 text-cyan-200 text-lg rounded-lg active:bg-cyan-400 active:text-black transition-colors shadow-[0_0_12px_rgba(0,243,255,0.2)] touch-control"
                        aria-label="Move Up"
                    >
                        ▲
                    </button>
                    <div />

                    <button
                        onTouchStart={(e) => { e.preventDefault(); keysRef.current.p1Left = true; }}
                        onTouchEnd={(e) => { e.preventDefault(); keysRef.current.p1Left = false; }}
                        className="h-14 w-14 flex items-center justify-center border-2 border-cyan-500/60 bg-cyan-950/60 text-cyan-200 text-lg rounded-lg active:bg-cyan-400 active:text-black transition-colors shadow-[0_0_12px_rgba(0,243,255,0.2)] touch-control"
                        aria-label="Move Left"
                    >
                        ◀
                    </button>
                    <button
                        onTouchStart={(e) => { e.preventDefault(); keysRef.current.p1Down = true; }}
                        onTouchEnd={(e) => { e.preventDefault(); keysRef.current.p1Down = false; }}
                        className="h-14 w-14 flex items-center justify-center border-2 border-cyan-500/60 bg-cyan-950/60 text-cyan-200 text-lg rounded-lg active:bg-cyan-400 active:text-black transition-colors shadow-[0_0_12px_rgba(0,243,255,0.2)] touch-control"
                        aria-label="Move Down"
                    >
                        ▼
                    </button>
                    <button
                        onTouchStart={(e) => { e.preventDefault(); keysRef.current.p1Right = true; }}
                        onTouchEnd={(e) => { e.preventDefault(); keysRef.current.p1Right = false; }}
                        className="h-14 w-14 flex items-center justify-center border-2 border-cyan-500/60 bg-cyan-950/60 text-cyan-200 text-lg rounded-lg active:bg-cyan-400 active:text-black transition-colors shadow-[0_0_12px_rgba(0,243,255,0.2)] touch-control"
                        aria-label="Move Right"
                    >
                        ▶
                    </button>
                </div>

                {/* Primary Fire Button */}
                <button
                    onTouchStart={(e) => { e.preventDefault(); keysRef.current.p1Fire = true; }}
                    onTouchEnd={(e) => { e.preventDefault(); keysRef.current.p1Fire = false; }}
                    className="w-24 h-24 flex items-center justify-center border-2 border-cyan-400 bg-cyan-950/60 text-cyan-300 font-arcade text-sm font-bold rounded-2xl active:bg-cyan-400 active:text-black shadow-[0_0_20px_rgba(0,243,255,0.35)] transition-all touch-control"
                    aria-label="Fire Cannon"
                >
                    FIRE
                </button>
            </div>

            <div className="mt-4 text-[10px] font-mono text-gray-500 text-center hidden md:block">
                {mode === 'LOCAL_2P' ? (
                    <span>
                        P1 (CYAN): <strong className="text-cyan-400">[W/A/S/D] + [SPACE]</strong> &nbsp;|&nbsp; P2 (RED):{' '}
                        <strong className="text-red-500">[ARROWS] + [ENTER]</strong> &nbsp;|&nbsp; [R] RESTART
                    </span>
                ) : (
                    <span>[W/A/S/D] or [ARROWS] 90° MOVEMENT // [SPACE] FIRE // [R] RESTART</span>
                )}
            </div>
        </div>
    );
};

export const BattleTank = memo(BattleTankComponent);
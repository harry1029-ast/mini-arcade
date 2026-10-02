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
import { ArrowLeft, RotateCcw, Trophy, Shield, Crosshair } from 'lucide-react';

interface BattleTankProps {
    onExit: () => void;
}

const BattleTankComponent: React.FC<BattleTankProps> = ({ onExit }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const { highScore, recordScore } = useHighScore('tank');

    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [enemiesRemaining, setEnemiesRemaining] = useState(TOTAL_ENEMIES_WAVE);
    const [gameState, setGameState] = useState<'PLAYING' | 'LEVEL_CLEARED' | 'VICTORY' | 'GAME_OVER'>('PLAYING');

    // Authoritative Refs
    const scoreRef = useRef(0);
    const livesRef = useRef(3);
    const levelRef = useRef(1);
    const gameStateRef = useRef<'PLAYING' | 'LEVEL_CLEARED' | 'VICTORY' | 'GAME_OVER'>('PLAYING');
    const remainingEnemiesRef = useRef(TOTAL_ENEMIES_WAVE);

    // Eagle Base state
    const baseAliveRef = useRef(true);
    const baseRect = { x: 12 * CELL_SIZE, y: 22 * CELL_SIZE, size: CELL_SIZE * 2 };

    // Map Bricks
    const bricksRef = useRef<BrickTile[]>([]);

    // Entities
    const playerRef = useRef<TankEntity>({
        x: 9 * CELL_SIZE,
        y: 24 * CELL_SIZE,
        dir: 'UP',
        speed: PLAYER_SPEED,
        size: TANK_SIZE,
        alive: true,
        color: '#ffe600',
        glow: '#ffd700',
        shootCooldown: 0,
    });

    const enemiesRef = useRef<TankEntity[]>([]);
    const bulletsRef = useRef<Bullet[]>([]);
    const particlesRef = useRef<SparkParticle[]>([]);
    const lastTimeRef = useRef<number>(0);

    const keysRef = useRef<{
        up: boolean;
        down: boolean;
        left: boolean;
        right: boolean;
        fire: boolean;
    }>({
        up: false,
        down: false,
        left: false,
        right: false,
        fire: false,
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
            color: '#00f3ff',
            glow: '#00f3ff',
            shootCooldown: 40,
        });
        remainingEnemiesRef.current -= 1;
        setEnemiesRemaining(remainingEnemiesRef.current);
    };

    const startLevel = useCallback((lvlNum: number) => {
        levelRef.current = lvlNum;
        setCurrentLevel(lvlNum);
        remainingEnemiesRef.current = TOTAL_ENEMIES_WAVE;
        setEnemiesRemaining(TOTAL_ENEMIES_WAVE);
        baseAliveRef.current = true;
        gameStateRef.current = 'PLAYING';
        setGameState('PLAYING');

        playerRef.current = {
            x: 9 * CELL_SIZE,
            y: 24 * CELL_SIZE,
            dir: 'UP',
            speed: PLAYER_SPEED,
            size: TANK_SIZE,
            alive: true,
            color: '#ffe600',
            glow: '#ffd700',
            shootCooldown: 0,
        };

        enemiesRef.current = [];
        bulletsRef.current = [];
        particlesRef.current = [];
        initMap(lvlNum - 1);
        sound.playBlip(620);
    }, [initMap]);

    const resetGame = useCallback(() => {
        scoreRef.current = 0;
        livesRef.current = 3;
        setScore(0);
        setLives(3);
        startLevel(1);
    }, [startLevel]);

    const nextLevel = useCallback(() => {
        if (levelRef.current < TOTAL_LEVELS) {
            startLevel(levelRef.current + 1);
        }
    }, [startLevel]);

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

    // Keyboard Event Listeners
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
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                keysRef.current.left = true;
            }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                e.preventDefault();
                keysRef.current.right = true;
            }
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                keysRef.current.fire = true;
            }
            if ((e.key === 'r' || e.key === 'R') && gameStateRef.current !== 'PLAYING') {
                resetGame();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.up = false;
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = false;
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
            if (e.key === ' ' || e.code === 'Space') keysRef.current.fire = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [resetGame]);

    // Main 60fps Game Loop
    useEffect(() => {
        initMap();
        let animId: number;
        let spawnTimer = 0;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const fireBullet = (tank: TankEntity, owner: 'PLAYER' | 'ENEMY') => {
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

            if (owner === 'PLAYER') {
                sound.playBlip(750, 'square', 0.05);
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

                const player = playerRef.current;

                // Player Cardinal 90-Degree Movement
                if (player.alive) {
                    let nextX = player.x;
                    let nextY = player.y;
                    let moved = false;

                    if (keysRef.current.up) {
                        player.dir = 'UP';
                        nextY -= player.speed * dt;
                        moved = true;
                    } else if (keysRef.current.down) {
                        player.dir = 'DOWN';
                        nextY += player.speed * dt;
                        moved = true;
                    } else if (keysRef.current.left) {
                        player.dir = 'LEFT';
                        nextX -= player.speed * dt;
                        moved = true;
                    } else if (keysRef.current.right) {
                        player.dir = 'RIGHT';
                        nextX += player.speed * dt;
                        moved = true;
                    }

                    if (moved && !collidesWithBricksOrBase(nextX, nextY, player.size)) {
                        player.x = nextX;
                        player.y = nextY;
                    }

                    // Player Shoot Trigger (Rule: Only 1 player bullet at a time)
                    const playerHasBullet = bulletsRef.current.some((b) => b.owner === 'PLAYER');
                    if (keysRef.current.fire && !playerHasBullet) {
                        fireBullet(player, 'PLAYER');
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

                    // Hit Player
                    if (b.owner === 'ENEMY') {
                        if (
                            b.x < player.x + player.size &&
                            b.x + b.size > player.x &&
                            b.y < player.y + player.size &&
                            b.y + b.size > player.y
                        ) {
                            deadBulletIndices.add(i);
                            spawnParticles(player.x + 8, player.y + 8, '#ffe600', 20);
                            sound.playExplosion();
                            livesRef.current -= 1;
                            setLives(livesRef.current);

                            if (livesRef.current <= 0) {
                                gameStateRef.current = 'GAME_OVER';
                                setGameState('GAME_OVER');
                            } else {
                                player.x = 9 * CELL_SIZE;
                                player.y = 24 * CELL_SIZE;
                                player.dir = 'UP';
                            }
                            continue;
                        }
                    }

                    // Hit Enemies
                    if (b.owner === 'PLAYER') {
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
                            spawnParticles(enemy.x + 8, enemy.y + 8, '#00f3ff', 20);
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

            // Draw Player & Enemies
            if (playerRef.current.alive) drawTank(playerRef.current);
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
    }, [initMap]);

    return (
        <div className="flex flex-col items-center max-w-xl mx-auto w-full select-none">
            {/* Top HUD */}
            <div className="w-full mb-3 px-1 flex items-center justify-between font-arcade text-xs">
                <button
                    onClick={() => {
                        sound.playBlip(300);
                        onExit();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 border border-pink-500/50 hover:bg-pink-500/20 text-[#ff007f] cursor-pointer"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> DECK
                </button>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1.5 text-yellow-400">
                        <Trophy className="w-3.5 h-3.5" />
                        <span>{highScore.toString().padStart(5, '0')}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-emerald-400">
                        <span>LVL {currentLevel}/{TOTAL_LEVELS}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-cyan-400">
                        <Crosshair className="w-3.5 h-3.5" />
                        <span>REMAIN: {enemiesRemaining + enemiesRef.current.length}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-amber-400">
                        <Shield className="w-3.5 h-3.5" />
                        <span>LIVES: {lives}</span>
                    </div>

                    <div className="text-white">SCORE: {score}</div>
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

            {/* Mobile Touch Controls */}
            <div className="flex items-center justify-between w-full max-w-xs mt-4 px-2 md:hidden">
                <div className="grid grid-cols-3 gap-1">
                    <div />
                    <button
                        onTouchStart={(e) => { e.preventDefault(); keysRef.current.up = true; }}
                        onTouchEnd={(e) => { e.preventDefault(); keysRef.current.up = false; }}
                        className="p-3 border border-yellow-500/40 bg-yellow-950/40 text-yellow-300 font-arcade text-xs rounded active:bg-yellow-400 active:text-black"
                    >
                        ▲
                    </button>
                    <div />
                    <button
                        onTouchStart={(e) => { e.preventDefault(); keysRef.current.left = true; }}
                        onTouchEnd={(e) => { e.preventDefault(); keysRef.current.left = false; }}
                        className="p-3 border border-yellow-500/40 bg-yellow-950/40 text-yellow-300 font-arcade text-xs rounded active:bg-yellow-400 active:text-black"
                    >
                        ◀
                    </button>
                    <button
                        onTouchStart={(e) => { e.preventDefault(); keysRef.current.down = true; }}
                        onTouchEnd={(e) => { e.preventDefault(); keysRef.current.down = false; }}
                        className="p-3 border border-yellow-500/40 bg-yellow-950/40 text-yellow-300 font-arcade text-xs rounded active:bg-yellow-400 active:text-black"
                    >
                        ▼
                    </button>
                    <button
                        onTouchStart={(e) => { e.preventDefault(); keysRef.current.right = true; }}
                        onTouchEnd={(e) => { e.preventDefault(); keysRef.current.right = false; }}
                        className="p-3 border border-yellow-500/40 bg-yellow-950/40 text-yellow-300 font-arcade text-xs rounded active:bg-yellow-400 active:text-black"
                    >
                        ▶
                    </button>
                </div>

                <button
                    onTouchStart={(e) => { e.preventDefault(); keysRef.current.fire = true; }}
                    onTouchEnd={(e) => { e.preventDefault(); keysRef.current.fire = false; }}
                    className="px-6 py-5 border border-yellow-500/60 bg-yellow-950/40 text-yellow-300 font-arcade text-xs rounded active:bg-yellow-500 active:text-black shadow-[0_0_12px_rgba(255,230,0,0.3)]"
                >
                    FIRE
                </button>
            </div>

            <div className="mt-4 text-[10px] font-mono text-gray-500 text-center hidden md:block">
                [W/A/S/D] or [ARROWS] 90° MOVEMENT // [SPACE] FIRE CANNON // [R] RESTART
            </div>
        </div>
    );
};

export const BattleTank = memo(BattleTankComponent);
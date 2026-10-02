// src/components/3d/ScreenCanvases.ts
import { CanvasTexture, NearestFilter } from 'three';
import type { GameId } from '../../types/arcade';

interface ActiveScreenAnimation {
    texture: CanvasTexture;
    update: () => void;
}

export function createCabinetScreenTexture(id: GameId, accentColor: string): ActiveScreenAnimation {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 192;
    const ctx = canvas.getContext('2d')!;

    const texture = new CanvasTexture(canvas);
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;

    let tick = 0;

    const state: any = {
        pong: { bx: 128, by: 96, bvx: 2.4, bvy: 1.6, p1y: 80, p2y: 80 },
        snake: {
            body: [{ x: 6, y: 5 }, { x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
            dir: { x: 1, y: 0 },
            target: { x: 14, y: 8 },
        },
        breakout: { bx: 128, by: 130, bvx: 1.8, bvy: -2, padX: 108 },
        tetris: {
            grid: Array(14).fill(null).map(() => Array(10).fill(0)),
            px: 4,
            py: 0,
            dropTimer: 0,
        },
        slime: {
            bx: 70,
            by: 80,
            bvx: 2.2,
            bvy: -2.0,
            s1x: 60,
            s1y: 155,
            s2x: 196,
            s2y: 155,
        },
        // Realistic Battle Tank State
        battleTank: {
            // Player Tank (Yellow)
            pX: 100,
            pY: 154,
            pDir: 'UP',
            // Enemy Tank (Purple)
            eX: 148,
            eY: 26,
            eDir: 'DOWN',
            eMoveTimer: 0,
            // Bullets
            pBullet: null as { x: number; y: number; vy: number } | null,
            eBullet: null as { x: number; y: number; vy: number } | null,
            // Destructible brick columns (x, y, alive)
            bricks: [
                // Top corridors
                { x: 40, y: 30, alive: true }, { x: 52, y: 30, alive: true },
                { x: 92, y: 30, alive: true }, { x: 104, y: 30, alive: true },
                { x: 144, y: 30, alive: true }, { x: 156, y: 30, alive: true },
                { x: 196, y: 30, alive: true }, { x: 208, y: 30, alive: true },
                // Mid barrier
                { x: 92, y: 80, alive: true }, { x: 104, y: 80, alive: true },
                { x: 144, y: 80, alive: true }, { x: 156, y: 80, alive: true },
                // Base shielding bricks
                { x: 116, y: 162, alive: true }, { x: 116, y: 174, alive: true },
                { x: 128, y: 162, alive: true },
                { x: 140, y: 162, alive: true }, { x: 140, y: 174, alive: true },
            ],
            sparks: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
        },
    };

    // Seed Tetris
    for (let r = 10; r < 14; r++) {
        for (let c = 0; c < 10; c++) {
            if (Math.random() > 0.35) state.tetris.grid[r][c] = 1;
        }
    }

    const update = () => {
        tick++;
        ctx.fillStyle = '#03050a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Phosphor scanlines
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        for (let y = 0; y < canvas.height; y += 4) {
            ctx.fillRect(0, y, canvas.width, 1);
        }

        // --- PONG ---
        if (id === 'pong') {
            const s = state.pong;
            s.bx += s.bvx;
            s.by += s.bvy;
            if (s.by < 8 || s.by > 184) s.bvy *= -1;
            if (s.bx < 24 || s.bx > 232) s.bvx *= -1;
            s.p1y += (s.by - (s.p1y + 18)) * 0.12;
            s.p2y += (s.by - (s.p2y + 18)) * 0.12;

            ctx.fillStyle = accentColor;
            ctx.fillRect(12, s.p1y, 6, 36);
            ctx.fillRect(238, s.p2y, 6, 36);
            ctx.fillRect(s.bx - 3, s.by - 3, 6, 6);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(128, 0, 0, 192);
            ctx.setLineDash([]);
        }

        // --- SNAKE ---
        else if (id === 'snake') {
            const s = state.snake;
            if (tick % 6 === 0) {
                const head = { ...s.body[0] };
                if (head.x < s.target.x) s.dir = { x: 1, y: 0 };
                else if (head.x > s.target.x) s.dir = { x: -1, y: 0 };
                else if (head.y < s.target.y) s.dir = { x: 0, y: 1 };
                else if (head.y > s.target.y) s.dir = { x: 0, y: -1 };

                const next = {
                    x: (head.x + s.dir.x + 20) % 20,
                    y: (head.y + s.dir.y + 15) % 15,
                };

                if (next.x === s.target.x && next.y === s.target.y) {
                    s.target = {
                        x: Math.floor(Math.random() * 18) + 1,
                        y: Math.floor(Math.random() * 13) + 1,
                    };
                } else {
                    s.body.pop();
                }
                s.body.unshift(next);
            }

            ctx.fillStyle = accentColor;
            s.body.forEach((seg: any) => {
                ctx.fillRect(seg.x * 12 + 8, seg.y * 12 + 6, 10, 10);
            });
            ctx.fillStyle = '#ff007f';
            ctx.fillRect(s.target.x * 12 + 9, s.target.y * 12 + 7, 8, 8);
        }

        // --- BREAKOUT ---
        else if (id === 'breakout') {
            const s = state.breakout;
            s.bx += s.bvx;
            s.by += s.bvy;
            if (s.bx < 8 || s.bx > 248) s.bvx *= -1;
            if (s.by < 8) s.bvy *= -1;
            if (s.by > 165) {
                s.bvy *= -1;
                s.padX = s.bx - 20;
            }
            ctx.fillStyle = accentColor;
            ctx.fillRect(s.padX, 172, 44, 6);
            ctx.fillRect(s.bx - 3, s.by - 3, 6, 6);
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 8; c++) {
                    ctx.fillStyle = r % 2 === 0 ? accentColor : '#ff007f';
                    ctx.fillRect(16 + c * 28, 20 + r * 12, 24, 8);
                }
            }
        }

        // --- TETRIS ---
        else if (id === 'tetris') {
            const s = state.tetris;
            s.dropTimer++;
            if (s.dropTimer % 10 === 0) {
                s.py++;
                if (s.py > 11) {
                    s.py = 0;
                    s.px = Math.floor(Math.random() * 7);
                }
            }

            const offsetX = 78;
            const offsetY = 14;
            const sz = 10;

            ctx.strokeStyle = 'rgba(255, 0, 127, 0.3)';
            ctx.strokeRect(offsetX, offsetY, 10 * sz, 14 * sz);

            ctx.fillStyle = '#00f3ff';
            for (let r = 0; r < 14; r++) {
                for (let c = 0; c < 10; c++) {
                    if (s.grid[r][c]) {
                        ctx.fillRect(offsetX + c * sz + 1, offsetY + r * sz + 1, sz - 2, sz - 2);
                    }
                }
            }

            ctx.fillStyle = '#ff007f';
            ctx.fillRect(offsetX + s.px * sz + 1, offsetY + s.py * sz + 1, sz - 2, sz - 2);
            ctx.fillRect(offsetX + (s.px + 1) * sz + 1, offsetY + s.py * sz + 1, sz - 2, sz - 2);
            ctx.fillRect(offsetX + s.px * sz + 1, offsetY + (s.py + 1) * sz + 1, sz - 2, sz - 2);
            ctx.fillRect(offsetX + (s.px + 1) * sz + 1, offsetY + (s.py + 1) * sz + 1, sz - 2, sz - 2);
        }

        // --- SLIME ---
        else if (id === 'slime') {
            const s = state.slime;
            s.by += s.bvy;
            s.bx += s.bvx;
            s.bvy += 0.15;

            if (s.bx < 20 || s.bx > 236) s.bvx *= -1;
            if (s.by > 146) {
                s.by = 146;
                s.bvy = -4.2;
            }

            s.s1x += (Math.min(110, s.bx) - s.s1x) * 0.08;
            s.s2x += (Math.max(146, s.bx) - s.s2x) * 0.08;

            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(126, 120, 4, 40);

            ctx.fillStyle = 'rgba(0, 243, 255, 0.4)';
            ctx.fillRect(10, 160, 236, 2);

            ctx.fillStyle = '#bc13fe';
            ctx.beginPath();
            ctx.arc(s.s1x, s.s1y, 18, Math.PI, 0, false);
            ctx.fill();

            ctx.fillStyle = '#00f3ff';
            ctx.beginPath();
            ctx.arc(s.s2x, s.s2y, 18, Math.PI, 0, false);
            ctx.fill();

            ctx.fillStyle = '#39ff14';
            ctx.beginPath();
            ctx.arc(s.bx, s.by, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- BATTLE TANK (BATTLE CITY STYLE) ---
        else if (id === 'tank') {
            const bt = state.battleTank;

            // Enemy Patrol & Firing
            bt.eMoveTimer++;
            if (bt.eMoveTimer % 45 === 0) {
                bt.eX = bt.eX === 148 ? 100 : 148;
            }
            if (tick % 50 === 0 && !bt.eBullet) {
                bt.eBullet = { x: bt.eX + 7, y: bt.eY + 16, vy: 2.8 };
            }

            // Player Firing
            if (tick % 40 === 0 && !bt.pBullet) {
                bt.pBullet = { x: bt.pX + 7, y: bt.pY - 4, vy: -3.4 };
            }

            // Move Bullets & Check Collisions
            if (bt.pBullet) {
                bt.pBullet.y += bt.pBullet.vy;
                for (const b of bt.bricks) {
                    if (b.alive && Math.abs(bt.pBullet.x - (b.x + 6)) < 8 && Math.abs(bt.pBullet.y - (b.y + 6)) < 8) {
                        b.alive = false;
                        for (let i = 0; i < 6; i++) {
                            bt.sparks.push({ x: b.x + 6, y: b.y + 6, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 12, color: '#b83b1d' });
                        }
                        bt.pBullet = null;
                        break;
                    }
                }
                if (bt.pBullet && bt.pBullet.y < 12) bt.pBullet = null;
            }

            if (bt.eBullet) {
                bt.eBullet.y += bt.eBullet.vy;
                for (const b of bt.bricks) {
                    if (b.alive && Math.abs(bt.eBullet.x - (b.x + 6)) < 8 && Math.abs(bt.eBullet.y - (b.y + 6)) < 8) {
                        b.alive = false;
                        bt.eBullet = null;
                        break;
                    }
                }
                if (bt.eBullet && bt.eBullet.y > 180) bt.eBullet = null;
            }

            // Respawn bricks if mostly cleared
            if (bt.bricks.filter((b: any) => b.alive).length < 5) {
                bt.bricks.forEach((b: any) => (b.alive = true));
            }

            // 1. Draw Brick Walls (Red/Brown Arcade Tile)
            ctx.fillStyle = '#b83b1d';
            ctx.strokeStyle = '#2b1008';
            ctx.lineWidth = 1;
            for (const b of bt.bricks) {
                if (!b.alive) continue;
                ctx.fillRect(b.x, b.y, 12, 12);
                ctx.strokeRect(b.x, b.y, 12, 12);
            }

            // 2. Draw Golden Eagle Base at Bottom Center
            ctx.fillStyle = '#ffe600';
            ctx.fillRect(124, 168, 8, 14); // Eagle body
            ctx.fillRect(122, 172, 12, 6); // Wings
            ctx.fillRect(126, 165, 4, 3); // Head

            // 3. Helper to draw 90° Sprite Tanks
            const drawMiniTank = (x: number, y: number, color: string, dir: 'UP' | 'DOWN') => {
                ctx.save();
                ctx.fillStyle = color;
                // Dual Treads
                ctx.fillRect(x, y, 3, 14);
                ctx.fillRect(x + 11, y, 3, 14);
                // Center Body
                ctx.fillRect(x + 3, y + 2, 8, 10);
                // Cannon Turret
                if (dir === 'UP') {
                    ctx.fillRect(x + 6, y - 4, 2, 6);
                } else {
                    ctx.fillRect(x + 6, y + 12, 2, 6);
                }
                ctx.restore();
            };

            // Player Tank (Yellow)
            drawMiniTank(bt.pX, bt.pY, '#ffe600', 'UP');

            // Enemy Tank (Neon Purple)
            drawMiniTank(bt.eX, bt.eY, '#b026ff', 'DOWN');

            // Bullets
            ctx.fillStyle = '#ffffff';
            if (bt.pBullet) ctx.fillRect(bt.pBullet.x - 1, bt.pBullet.y - 1, 3, 3);
            if (bt.eBullet) ctx.fillRect(bt.eBullet.x - 1, bt.eBullet.y - 1, 3, 3);

            // Brick Destruction Sparks
            for (let i = bt.sparks.length - 1; i >= 0; i--) {
                const sp = bt.sparks[i];
                sp.x += sp.vx;
                sp.y += sp.vy;
                sp.life--;
                ctx.fillStyle = sp.color;
                ctx.fillRect(sp.x, sp.y, 2, 2);
                if (sp.life <= 0) bt.sparks.splice(i, 1);
            }
        }

        texture.needsUpdate = true;
    };

    return { texture, update };
}
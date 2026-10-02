// src/games/tank/constants.ts
export const CELL_SIZE = 16;
export const GRID_COLS = 26;
export const GRID_ROWS = 26;
export const CANVAS_SIZE = CELL_SIZE * GRID_COLS; // 416 x 416

export const TANK_SIZE = 16;
export const BULLET_SIZE = 4;
export const BULLET_SPEED = 4.2;
export const PLAYER_SPEED = 1.8;
export const ENEMY_SPEED = 1.3;
export const TOTAL_ENEMIES_WAVE = 12;
export const MAX_ACTIVE_ENEMIES = 3;

// Map representation matching the original Battle City layout
// 'B' = Brick, 'E' = Base Eagle (2x2), ' ' = empty corridor
export const LEVEL_MAPS: string[][] = [
    // LEVEL 1: Classic Corridors
    [
        "                          ",
        "  BB  BB  BB  BB  BB  BB  ",
        "  BB  BB  BB  BB  BB  BB  ",
        "  BB  BB  BB  BB  BB  BB  ",
        "  BB  BB  BB  BB  BB  BB  ",
        "  BB  BB  BBBBBB  BB  BB  ",
        "  BB  BB  BBBBBB  BB  BB  ",
        "  BB  BB    BB    BB  BB  ",
        "  BB  BB    BB    BB  BB  ",
        "BB  BB  BB      BB  BB  BB",
        "BB  BB  BB      BB  BB  BB",
        "        BB      BB        ",
        "        BB      BB        ",
        "BBBBBB      BB      BBBBBB",
        "  BB        BB        BB  ",
        "  BB  BBBBBBBBBBBBBB  BB  ",
        "  BB  BBBBBBBBBBBBBB  BB  ",
        "  BB  BB          BB  BB  ",
        "  BB  BB          BB  BB  ",
        "  BB  BB          BB  BB  ",
        "  BB  BB   BBBB   BB  BB  ",
        "  BB  BB  BB  BB  BB  BB  ",
        "          BBEEBB          ",
        "  BB  BB  BBEEBB  BB  BB  ",
        "  BB  BB  BBBBBB  BB  BB  ",
        "                          "
    ],
    // LEVEL 2: Fortress Perimeter & Dense Channels
    [
        "                          ",
        "  BBBBBB      BB      BBBB",
        "  BBBBBB      BB      BBBB",
        "      BB  BBBBBBBBBB  BB  ",
        "      BB  BBBBBBBBBB  BB  ",
        "  BB          BB          ",
        "  BB  BBBB    BB    BBBB  ",
        "      BBBB    BB    BBBB  ",
        "  BBBBBBBB          BBBBBB",
        "  BBBBBBBB          BBBBBB",
        "      BB  BBBBBBBBBB  BB  ",
        "  BB  BB  BBBBBBBBBB  BB  ",
        "  BB                      ",
        "  BB  BBBBBB      BBBBBB  ",
        "  BB  BBBBBB      BBBBBB  ",
        "          BB      BB      ",
        "  BBBBBB  BB      BB  BBBB",
        "  BBBBBB  BBBBBBBBBB  BBBB",
        "  BB      BBBBBBBBBB    BB",
        "  BB                    BB",
        "  BBBB    BBBBBBBB    BBBB",
        "  BBBB    BB    BB    BBBB",
        "          BBEEBB          ",
        "  BB  BB  BBEEBB  BB  BB  ",
        "  BB  BB  BBBBBB  BB  BB  ",
        "                          "
    ],
    // LEVEL 3: Labyrinth Defense Grid
    [
        "                          ",
        "  BB  BBBBBB  BBBBBB  BB  ",
        "  BB  BBBBBB  BBBBBB  BB  ",
        "  BB      BB  BB      BB  ",
        "  BBBBBB  BB  BB  BBBBBB  ",
        "  BBBBBB  BB  BB  BBBBBB  ",
        "  BB          BB      BB  ",
        "  BB  BBBBBBBBBBBBBB  BB  ",
        "  BB  BBBBBBBBBBBBBB  BB  ",
        "      BB          BB      ",
        "BBBB  BB  BBBBBB  BB  BBBB",
        "BBBB  BB  BBBBBB  BB  BBBB",
        "          BB  BB          ",
        "BBBBBBBB  BB  BB  BBBBBBBB",
        "BBBBBBBB          BBBBBBBB",
        "      BB  BBBBBB  BB      ",
        "  BB  BB  BBBBBB  BB  BB  ",
        "  BB  BB          BB  BB  ",
        "  BB  BBBBBBBBBBBBBB  BB  ",
        "  BB  BBBBBBBBBBBBBB  BB  ",
        "          BB  BB          ",
        "  BBBBBB  BB  BB  BBBBBB  ",
        "          BBEEBB          ",
        "  BB  BB  BBEEBB  BB  BB  ",
        "  BB  BB  BBBBBB  BB  BB  ",
        "                          "
    ]
];

export const TOTAL_LEVELS = LEVEL_MAPS.length;
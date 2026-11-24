/**
 * Hand-authored campaign. Coordinates are in the 960x540 design grid.
 * Every required gap is jumpable by every character; upper routes are optional.
 */

const ground = (x, w, y = 500, style = 'grass') => ({ x, y, w, h: 140, style });
const platform = (x, y, w, oneWay = true, style = 'cloud') => ({ x, y, w, oneWay, style });
const pipe = (x, h = 80, y = 500) => ({ x, y, w: 80, h, style: 'pipe' });
const block = (x, y, type = 'brick', contents = null) => ({ x, y, type, contents });
const blocks = (x, y, count, type = 'brick', contents = null) =>
  Array.from({ length: count }, (_, index) => block(x + index * 40, y, type, Array.isArray(contents) ? contents[index] : contents));
const coin = (x, y, kind = 'coin') => ({ x, y, kind });
const coinArc = (x, y, count = 5, spacing = 34, height = 48) =>
  Array.from({ length: count }, (_, index) => coin(x + index * spacing, y - Math.sin(index / (count - 1) * Math.PI) * height));
const coinRow = (x, y, count = 5, spacing = 40) =>
  Array.from({ length: count }, (_, index) => coin(x + index * spacing, y));
const enemy = (kind, x, y = 500, options = {}) => ({ kind, x, y, options });
const sign = (x, text, y = 500) => ({ x, y, text });
const hazard = (x, y, w, type = 'lava') => ({ x, y, w, h: 80, type });

export const LEVELS = [
  {
    id: 1,
    key: 'Mushroom Meadow',
    title: 'MUSHROOM MEADOW',
    subtitle: 'Run, jump and find your feet',
    theme: 'meadow',
    music: 'level1',
    width: 3600,
    spawn: { x: 80, y: 500 },
    goal: { x: 3450, y: 500 },
    terrain: [
      ground(0, 840), ground(960, 480), ground(1560, 680), ground(2360, 1240),
      pipe(400, 80), pipe(1090, 80), pipe(1900, 80),
      { x: 2920, y: 420, w: 120, h: 80, style: 'stone' },
      platform(840, 405, 120), platform(2260, 410, 100),
      ...blocks(670, 360, 3), ...blocks(1980, 340, 2),
      block(300, 360, 'question', 'mushroom'),
      block(1290, 365, 'question', 'fireflower'),
      block(1690, 365, 'question', 'coin'),
      ...blocks(1745, 365, 2),
      ...blocks(2520, 360, 4),
      block(2580, 265, 'question', 'star')
    ],
    coins: [
      ...coinArc(500, 420, 5), ...coinArc(850, 380, 5, 32, 50),
      ...coinRow(1120, 365, 3), ...coinArc(1450, 405, 5, 34, 58),
      ...coinRow(2000, 290, 3), ...coinArc(2250, 385, 5, 32, 45),
      ...coinRow(2550, 315, 3), coin(2940, 365, 'seed')
    ],
    enemies: [
      enemy('goomba', 660, 500, { direction: -1, minX: 570, maxX: 800 }),
      enemy('goomba', 1210, 500, { direction: 1, minX: 1000, maxX: 1400 }),
      enemy('paratroopa', 1470, 320, { direction: -1, speed: 58, minX: 1380, maxX: 1580 }),
      enemy('koopa', 1740, 500, { direction: -1, minX: 1600, maxX: 1860 }),
      enemy('goomba', 2130, 500, { direction: 1, minX: 2010, maxX: 2220 }),
      enemy('goomba', 2680, 500, { direction: -1, minX: 2440, maxX: 2860 }),
      enemy('koopa', 3060, 500, { direction: -1, minX: 2990, maxX: 3300 })
    ],
    checkpoints: [{ x: 1605, y: 500 }],
    signs: [
      sign(190, 'ARROWS / A D\nTO MOVE'),
      sign(600, 'SPACE / Z\nTO JUMP'),
      sign(2380, 'COINS +100\nSTOMPS + MORE')
    ]
  },
  {
    id: 2,
    key: 'Wonder Bloom Cavern',
    title: 'WONDER BLOOM CAVERN',
    subtitle: 'Mind the ceiling. Bash the blocks.',
    theme: 'cavern',
    music: 'level2',
    width: 3200,
    spawn: { x: 80, y: 500 },
    goal: { x: 3070, y: 500 },
    terrain: [
      ground(0, 720), ground(820, 640), ground(1580, 520), ground(2220, 980),
      { x: 0, y: 120, w: 3200, h: 40, style: 'stone' },
      pipe(560, 80), pipe(1810, 80),
      ...blocks(280, 310, 5), ...blocks(980, 350, 4),
      ...blocks(1410, 285, 3), ...blocks(2320, 365, 5),
      block(720, 360, 'question', 'fireflower'),
      block(1200, 300, 'question', 'mushroom'),
      block(2020, 360, 'question', 'star'),
      platform(720, 410, 100), platform(1460, 410, 120),
      platform(2100, 410, 120), platform(2780, 330, 160, true, 'stone')
    ],
    coins: [
      ...coinRow(290, 265, 5), ...coinArc(800, 390, 5, 32, 48),
      ...coinRow(990, 305, 4), ...coinArc(1460, 380, 5, 32, 46),
      ...coinRow(1780, 400, 3), ...coinArc(2100, 385, 5, 32, 52),
      ...coinRow(2330, 320, 5), ...coinRow(2790, 285, 4), coin(2855, 255, 'seed')
    ],
    enemies: [
      enemy('goomba', 430, 500, { direction: -1, minX: 350, maxX: 530 }),
      enemy('koopa', 1030, 500, { direction: 1, minX: 880, maxX: 1250 }),
      enemy('boo', 1300, 280, { direction: -1, minX: 1100, maxX: 1510, speed: 45 }),
      enemy('piranha', 600, 500, { phase: 0 }), enemy('piranha', 1850, 500, { phase: 2 }),
      enemy('goomba', 1950, 500, { direction: -1, minX: 1640, maxX: 2070 }),
      enemy('beetle', 2470, 500, { direction: 1, minX: 2280, maxX: 2710 }),
      enemy('boo', 2750, 250, { direction: 1, minX: 2500, maxX: 3010, speed: 48 })
    ],
    checkpoints: [{ x: 1630, y: 500 }],
    signs: [sign(170, 'BASH ? BLOCKS\nFROM BELOW'), sign(2250, 'BOOS HIDE\nWHEN WATCHED')]
  },
  {
    id: 3,
    key: 'Sky Drift Isles',
    title: 'SKY DRIFT ISLES',
    subtitle: 'Leap from cloud to cloud',
    theme: 'sky',
    music: 'level3',
    width: 3400,
    spawn: { x: 80, y: 500 },
    goal: { x: 3260, y: 500 },
    terrain: [
      ground(0, 560), ground(760, 380), ground(1320, 420), ground(1920, 340), ground(2520, 880),
      platform(560, 410, 200), platform(900, 330, 160), platform(1140, 410, 180),
      platform(1740, 400, 180), platform(2260, 400, 180), platform(2440, 440, 80),
      ...blocks(360, 360, 3), block(1510, 330, 'question', 'mushroom'),
      ...blocks(2680, 360, 4), block(2740, 260, 'question', 'star')
    ],
    coins: [
      ...coinArc(550, 390, 6, 32, 55), ...coinRow(910, 285, 4),
      ...coinArc(1140, 390, 6, 32, 52), ...coinRow(1400, 350, 3),
      ...coinArc(1740, 380, 6, 32, 55), ...coinArc(2260, 380, 6, 32, 52),
      ...coinRow(2690, 315, 4), coin(2790, 220, 'seed')
    ],
    enemies: [
      enemy('paratroopa', 480, 310, { direction: -1, speed: 60, minX: 400, maxX: 650 }),
      enemy('goomba', 970, 500, { direction: 1, minX: 790, maxX: 1110 }),
      enemy('paratroopa', 1490, 260, { direction: -1, speed: 66, minX: 1370, maxX: 1700 }),
      enemy('koopa', 2070, 500, { direction: -1, minX: 1950, maxX: 2220 }),
      enemy('paratroopa', 2370, 260, { direction: 1, speed: 62, minX: 2200, maxX: 2550 }),
      enemy('goomba', 2780, 500, { direction: -1, minX: 2560, maxX: 3030 })
    ],
    checkpoints: [{ x: 1970, y: 500 }],
    signs: [sign(170, 'HOLD JUMP\nTO GLIDE / FLOAT'), sign(2560, 'CLOUDS ARE\nONE-WAY')]
  },
  {
    id: 4,
    key: 'Tidal Reef',
    title: 'TIDAL REEF',
    subtitle: 'Time the tides and ride the lift',
    theme: 'ocean',
    music: 'level4',
    width: 3400,
    spawn: { x: 80, y: 500 },
    goal: { x: 3270, y: 500 },
    terrain: [
      ground(0, 600), ground(850, 420), ground(1510, 400), ground(2160, 360), ground(2780, 620),
      pipe(430, 80), pipe(1730, 80),
      ...blocks(290, 360, 3), ...blocks(1110, 340, 4),
      ...blocks(2320, 355, 4), block(2500, 275, 'question', 'bell'),
      platform(600, 420, 250, true, 'stone'), platform(1270, 400, 240, true, 'stone'),
      platform(1910, 405, 250, true, 'stone'), platform(2520, 410, 260, true, 'stone')
    ],
    movers: [
      { x: 610, y: 350, w: 120, dx: 0, dy: 95, period: 3200 },
      { x: 1940, y: 345, w: 120, dx: 0, dy: 105, period: 2800 }
    ],
    hazards: [hazard(0, 520, 3400, 'water')],
    coins: [
      ...coinRow(300, 315, 3), ...coinArc(600, 400, 6, 32, 45),
      ...coinRow(1120, 295, 4), ...coinArc(1310, 380, 6, 32, 48),
      ...coinRow(1770, 390, 3), ...coinArc(1940, 370, 6, 32, 46),
      ...coinRow(2330, 310, 4), ...coinArc(2520, 390, 6, 32, 48), coin(2810, 350, 'seed')
    ],
    enemies: [
      enemy('cheep', 680, 400, { direction: -1, speed: 65, minX: 570, maxX: 850 }),
      enemy('goomba', 1030, 500, { direction: 1, minX: 880, maxX: 1230 }),
      enemy('blooper', 1390, 280, { direction: -1, speed: 50, minX: 1250, maxX: 1490 }),
      enemy('koopa', 1650, 500, { direction: -1, minX: 1550, maxX: 1870 }),
      enemy('cheep', 2050, 390, { direction: 1, speed: 65, minX: 1900, maxX: 2170 }),
      enemy('beetle', 2400, 500, { direction: 1, minX: 2200, maxX: 2730 }),
      enemy('blooper', 2670, 280, { direction: -1, speed: 52, minX: 2500, maxX: 2780 }),
      enemy('goomba', 2990, 500, { direction: -1, minX: 2830, maxX: 3160 })
    ],
    checkpoints: [{ x: 2210, y: 500 }],
    signs: [sign(160, 'WATER HURTS\nUSE THE CLOUDS'), sign(2820, 'RIDE THE LIFT\nWAIT FOR THE TIDE')]
  },
  {
    id: 5,
    key: 'Molten Bonekeep',
    title: 'MOLTEN BONEKEEP',
    subtitle: 'One last stand in Bowser’s keep',
    theme: 'castle',
    music: 'level5',
    width: 3700,
    spawn: { x: 80, y: 500 },
    goal: { x: 3540, y: 500, requiresBoss: true },
    terrain: [
      ground(0, 650), ground(810, 520), ground(1510, 470), ground(2160, 420), ground(2760, 940),
      { x: 0, y: 100, w: 3700, h: 40, style: 'stone' },
      ...blocks(350, 355, 4), ...blocks(1060, 340, 4),
      ...blocks(1690, 350, 4), ...blocks(2290, 350, 3),
      block(560, 300, 'question', 'fireflower'),
      block(1390, 260, 'question', 'mushroom'),
      block(2100, 260, 'question', 'star'),
      platform(650, 405, 160, true, 'stone'), platform(1330, 405, 180, true, 'stone'),
      platform(1980, 400, 180, true, 'stone'), platform(2580, 410, 180, true, 'stone')
    ],
    hazards: [hazard(0, 520, 3700, 'lava')],
    coins: [
      ...coinRow(360, 310, 4), ...coinArc(650, 385, 6, 32, 45),
      ...coinRow(1070, 295, 4), ...coinArc(1330, 385, 6, 32, 48),
      ...coinRow(1700, 305, 4), ...coinArc(1980, 375, 6, 32, 46),
      ...coinRow(2300, 305, 3), ...coinArc(2580, 390, 6, 32, 48), coin(2880, 350, 'seed')
    ],
    enemies: [
      enemy('drybones', 490, 500, { direction: -1, minX: 380, maxX: 610 }),
      enemy('hammerbro', 1080, 500, { direction: -1, minX: 860, maxX: 1280 }),
      enemy('bobomb', 1710, 500, { direction: 1, speed: 38, minX: 1550, maxX: 1920 }),
      enemy('drybones', 2320, 500, { direction: 1, minX: 2200, maxX: 2530 }),
      enemy('hammerbro', 2670, 500, { direction: -1, minX: 2600, maxX: 2760 }),
      enemy('bowserjr', 3180, 500, { direction: -1, speed: 88, minX: 2880, maxX: 3420 })
    ],
    checkpoints: [{ x: 2800, y: 500 }],
    signs: [sign(160, 'FIRE FLOWER\nPRESS X / F'), sign(2820, 'THREE STOMPS\nTO WIN')]
  }
];

export function getLevel(id) {
  return LEVELS.find(level => level.id === Number(id)) || LEVELS[0];
}

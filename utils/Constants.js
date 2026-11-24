/** Shared design grid and character feel constants. */

export const GAME_W = 960;
export const GAME_H = 540;
export const TILE = 40;

export const PHYSICS = Object.freeze({
  GRAVITY_Y: 1500,
  PLAYER_MAX_VELOCITY_X: 380,
  PLAYER_MAX_VELOCITY_Y: 940,
  PLAYER_DRAG_X: 0,
  SPRINT_MULTIPLIER: 1.32,
  STOMP_VELOCITY: -430,
  COYOTE_MS: 140,
  JUMP_BUFFER_MS: 170,
  RUN_ACCELERATION: 1750,
  AIR_ACCELERATION: 1150,
  GROUND_DECELERATION: 2100,
  AIR_DECELERATION: 260,
  MAX_FALL_SPEED: 860
});

export const CHARACTER_STATS = {
  mario:     { speed: 255, jump: -625, name: 'Mario',      special: 'balanced',   color: '#e83b32', trait: 'Balanced hero' },
  luigi:     { speed: 240, jump: -700, name: 'Luigi',      special: 'highjump',   color: '#39b54a', trait: 'Highest jump' },
  peach:     { speed: 220, jump: -650, name: 'Peach',      special: 'float',      color: '#f278ad', trait: 'Float jump' },
  toad:      { speed: 305, jump: -565, name: 'Toad',       special: 'fast',       color: '#3986e8', trait: 'Super speed' },
  toadette:  { speed: 290, jump: -585, name: 'Toadette',   special: 'fast',       color: '#ef72b5', trait: 'Quick & nimble' },
  yoshi:     { speed: 255, jump: -640, name: 'Yoshi',      special: 'flutter',    color: '#61c74f', trait: 'Flutter jump' },
  daisy:     { speed: 250, jump: -680, name: 'Daisy',      special: 'petal',      color: '#f3a638', trait: 'Petal guard' },
  rosalina:  { speed: 230, jump: -655, name: 'Rosalina',   special: 'glide',      color: '#77d7e8', trait: 'Glide descent' },
  goombella: { speed: 275, jump: -615, name: 'Goombella',  special: 'headbonk',   color: '#b87548', trait: 'Brick breaker' },
  bowserjr:  { speed: 250, jump: -635, name: 'Bowser Jr.', special: 'spinshell',  color: '#58a83c', trait: 'Shell spin' },
  wario:     { speed: 225, jump: -595, name: 'Wario',      special: 'groundpound',color: '#e7bb32', trait: 'Ground pound' },
  waluigi:   { speed: 255, jump: -625, name: 'Waluigi',    special: 'longreach',  color: '#9270cf', trait: 'Coin magnet' }
};

export const CHARACTER_ORDER = Object.keys(CHARACTER_STATS);

export const DEPTH = {
  BACKGROUND: -20,
  DECOR: -10,
  TERRAIN: 0,
  ITEMS: 5,
  ENEMIES: 10,
  PLAYER: 20,
  PROJECTILES: 25,
  PARTICLES: 30,
  HUD: 100
};

export const COLORS = {
  SKY_BLUE: 0x69bdf2,
  INK: 0x20203c,
  CREAM: 0xfff1cf,
  GOLD: 0xffcc3d,
  RED: 0xe83b32,
  GREEN: 0x42b94d
};

export const ITEM_TYPES = {
  COIN: 'coin', MUSHROOM: 'mushroom', FIRE_FLOWER: 'fireflower', STAR: 'star',
  BELL: 'bell', ONE_UP: 'oneup', WONDER_SEED: 'seed'
};

export const ENEMY_TYPES = {
  GOOMBA: 'goomba', KOOPA: 'koopa', SPINY: 'spiny', BEETLE: 'beetle',
  PIRANHA: 'piranha', BOO: 'boo', PARATROOPA: 'paratroopa',
  HAMMER_BRO: 'hammerbro', BOB_OMB: 'bobomb', DRY_BONES: 'drybones',
  CHEEP_CHEEP: 'cheep', BLOOPER: 'blooper', BOWSER_JR: 'bowserjr'
};

export const PARTICLE_TYPES = {
  WHITE: 'particle_white', GOLD: 'particle_gold', PINK: 'particle_pink',
  CYAN: 'particle_cyan', GREEN: 'particle_green', ORANGE: 'particle_orange'
};

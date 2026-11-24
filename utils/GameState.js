/** Persistent settings, records and resumable run state. Storage is optional. */

const PREFIX = 'superWonderBros_v3_';
const DEFAULT_SETTINGS = Object.freeze({
  musicVolume: 0.28,
  sfxVolume: 0.55,
  muted: false,
  reducedMotion: false,
  screenShake: true,
  highContrast: false,
  assistMode: true,
  showTouch: 'auto',
  controlSize: 'comfortable',
  handedness: 'right',
  autoDash: false
});

const CHARACTER_IDS = [
  'mario', 'luigi', 'peach', 'toad', 'toadette', 'yoshi',
  'daisy', 'rosalina', 'goombella', 'bowserjr', 'wario', 'waluigi'
];

function read(key, fallback) {
  try {
    const value = localStorage.getItem(PREFIX + key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Private browsing, storage quotas and embedded previews must not break play.
  }
}

function finiteNumber(value, fallback, min, max) {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

export const settings = {
  ...DEFAULT_SETTINGS,
  reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false,
  ...read('settings', {})
};

export function updateSettings(patch) {
  const next = { ...settings };
  if ('musicVolume' in patch) next.musicVolume = finiteNumber(Number(patch.musicVolume), 0.28, 0, 1);
  if ('sfxVolume' in patch) next.sfxVolume = finiteNumber(Number(patch.sfxVolume), 0.55, 0, 1);
  for (const key of ['muted', 'reducedMotion', 'screenShake', 'highContrast', 'assistMode', 'autoDash']) {
    if (key in patch) next[key] = !!patch[key];
  }
  if (['auto', 'on', 'off'].includes(patch.showTouch)) next.showTouch = patch.showTouch;
  if (['comfortable', 'large'].includes(patch.controlSize)) next.controlSize = patch.controlSize;
  if (['right', 'left'].includes(patch.handedness)) next.handedness = patch.handedness;
  Object.assign(settings, next);
  write('settings', settings);
  return settings;
}

export function resetSettings() {
  Object.assign(settings, DEFAULT_SETTINGS, {
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false
  });
  write('settings', settings);
  return settings;
}

Object.assign(settings, updateSettings({ ...settings }));

export const records = {
  highScore: finiteNumber(read('highScore', 0), 0, 0, 999999999),
  unlockedLevel: finiteNumber(read('unlockedLevel', 1), 1, 1, 5),
  bestTimes: read('bestTimes', {}) || {}
};

export const gameState = {
  character: 'mario',
  level: 1,
  score: 0,
  coins: 0,
  seeds: 0,
  lives: 5,
  maxLives: 5,
  elapsedMs: 0,
  powerup: null,
  checkpoint: null,
  collected: new Set(),
  levelTimes: {},
  highScore: records.highScore,
  started: false
};

export function startRun(character = 'mario') {
  const id = CHARACTER_IDS.includes(character) ? character : 'mario';
  const maxLives = settings.assistMode ? 5 : 3;
  Object.assign(gameState, {
    character: id,
    level: 1,
    score: 0,
    coins: 0,
    seeds: 0,
    lives: maxLives,
    maxLives,
    elapsedMs: 0,
    powerup: null,
    checkpoint: { level: 1, x: 80, y: 500 },
    collected: new Set(),
    levelTimes: {},
    started: true
  });
  clearContinue();
  return gameState;
}

export function addScore(points) {
  gameState.score += Math.max(0, Math.round(points || 0));
  if (gameState.score > records.highScore) {
    records.highScore = gameState.score;
    gameState.highScore = records.highScore;
    write('highScore', records.highScore);
  }
}

export function collect(id, kind = 'coin') {
  if (!id) return false;
  if (gameState.collected.has(id)) return false;
  gameState.collected.add(id);
  if (kind === 'coin') gameState.coins += 1;
  if (kind === 'seed') gameState.seeds += 1;
  addScore(kind === 'seed' ? 500 : 100);
  return true;
}

export function saveCheckpoint(level, x, y) {
  gameState.checkpoint = { level, x, y };
  write('continue', {
    version: 3,
    character: gameState.character,
    level,
    x,
    y,
    score: gameState.score,
    coins: gameState.coins,
    seeds: gameState.seeds,
    lives: gameState.lives,
    maxLives: gameState.maxLives,
    elapsedMs: gameState.elapsedMs,
    collected: Array.from(gameState.collected),
    levelTimes: gameState.levelTimes
  });
}

export function getContinue() {
  const data = read('continue', null);
  if (!data || data.version !== 3 || !CHARACTER_IDS.includes(data.character)) return null;
  const level = finiteNumber(Number(data.level), 1, 1, 5);
  if (!Number.isFinite(data.x) || !Number.isFinite(data.y)) return null;
  return data;
}

export function restoreContinue() {
  const data = getContinue();
  if (!data) return false;
  const level = finiteNumber(Number(data.level), 1, 1, 5);
  Object.assign(gameState, {
    character: data.character,
    level,
    score: finiteNumber(data.score, 0, 0, 999999999),
    coins: finiteNumber(data.coins, 0, 0, 999999),
    seeds: finiteNumber(data.seeds, 0, 0, 999999),
    lives: finiteNumber(data.lives, settings.assistMode ? 5 : 3, 1, 5),
    maxLives: finiteNumber(data.maxLives, settings.assistMode ? 5 : 3, 3, 5),
    elapsedMs: finiteNumber(data.elapsedMs, 0, 0, 999999999),
    powerup: null,
    checkpoint: { level, x: data.x, y: data.y },
    collected: new Set(Array.isArray(data.collected) ? data.collected : []),
    levelTimes: data.levelTimes && typeof data.levelTimes === 'object' ? data.levelTimes : {},
    started: true
  });
  return true;
}

export function hasContinue() {
  return getContinue() !== null;
}

export function clearContinue() {
  try { localStorage.removeItem(PREFIX + 'continue'); } catch { /* optional storage */ }
}

export function completeLevel(level, elapsedMs) {
  const previous = Number(records.bestTimes[level]) || Infinity;
  if (elapsedMs < previous) {
    records.bestTimes[level] = elapsedMs;
    write('bestTimes', records.bestTimes);
  }
  gameState.levelTimes[level] = elapsedMs;
  records.unlockedLevel = Math.max(records.unlockedLevel, Math.min(5, level + 1));
  write('unlockedLevel', records.unlockedLevel);
  if (level < 5) saveCheckpoint(level + 1, 80, 500);
  else clearContinue();
}

export function loseLife() {
  gameState.lives = Math.max(0, gameState.lives - 1);
  return gameState.lives;
}

export function resetRun() {
  gameState.started = false;
  gameState.powerup = null;
  gameState.checkpoint = null;
}

// Compatibility with older debug tooling and external embeds.
window.gameState = gameState;
window.gameSettings = settings;
window.gameSave = { hasContinue, getContinue };

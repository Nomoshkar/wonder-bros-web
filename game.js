import * as Phaser from 'phaser';
import { gameConfig } from './config/gameConfig.js';
import { BootScene } from './scenes/BootScene.js';
import { PlatformerScene } from './scenes/PlatformerScene.js';
import { GameUI } from './ui/GameUI.js';
import { InputManager } from './utils/InputManager.js';
import { AudioManager } from './utils/AudioManager.js';
import {
  settings, updateSettings, gameState, startRun, restoreContinue,
  resetRun, records
} from './utils/GameState.js';

gameConfig.scene = [];

const input = new InputManager();
input.attach();
input.setOptions(settings);
window.gameInput = input;
window.dispatchEvent(new CustomEvent('game:input-ready', { detail: { input } }));

function applySettings() {
  AudioManager.setMusicVolume(settings.musicVolume);
  AudioManager.setSfxVolume(settings.sfxVolume);
  AudioManager.muteAll(settings.muted);
  input.setOptions(settings);
  document.documentElement.classList.toggle('reduce-motion', settings.reducedMotion);
  document.documentElement.classList.toggle('high-contrast', settings.highContrast);
}

applySettings();
AudioManager.init();

const game = new Phaser.Game(gameConfig);
window.game = game;
const ui = new GameUI(game);
window.gameUI = ui;
window.dispatchEvent(new CustomEvent('game:ui-ready', { detail: { ui } }));
game.scene.add('BootScene', BootScene, true);
game.scene.add('PlatformerScene', PlatformerScene);

function activeScene() {
  return game.scene.getScene('PlatformerScene');
}

function focusGame() {
  requestAnimationFrame(() => {
    if (!game.canvas) return;
    game.canvas.tabIndex = 0;
    game.canvas.focus({ preventScroll: true });
  });
}

function launch(level, character, respawn = false) {
  const scene = activeScene();
  if (scene?.scene.isPaused()) game.scene.resume('PlatformerScene');
  game.scene.start('PlatformerScene', { level, character, respawn });
  focusGame();
}

function togglePause() {
  const scene = activeScene();
  if (!scene || (!scene.scene.isActive() && !scene.scene.isPaused())) return;
  const paused = !scene.scene.isPaused();
  if (paused) game.scene.pause('PlatformerScene');
  else game.scene.resume('PlatformerScene');
  scene.setPaused(paused);
  ui.setPaused(paused);
  if (!paused) focusGame();
}

window.addEventListener('game:command', event => {
  const { action, payload = {} } = event.detail || {};
  switch (action) {
    case 'start': {
      const character = startRun(payload.character).character;
      launch(1, character);
      break;
    }
    case 'continue': {
      if (!restoreContinue()) {
        window.dispatchEvent(new CustomEvent('game:launch-failed'));
        ui.showToast('That saved adventure is no longer available.', 'warning');
        break;
      }
      launch(gameState.level, gameState.character, true);
      break;
    }
    case 'pause': {
      const scene = activeScene();
      if (scene && (scene.scene.isActive() || scene.scene.isPaused())) togglePause();
      break;
    }
    case 'resume':
      if (activeScene()?.scene.isPaused()) togglePause();
      break;
    case 'restartCheckpoint': {
      const level = gameState.checkpoint?.level || gameState.level;
      launch(level, gameState.character, true);
      break;
    }
    case 'retryLevel': {
      gameState.lives = gameState.maxLives;
      gameState.powerup = null;
      launch(gameState.level, gameState.character, true);
      break;
    }
    case 'replay': {
      const character = startRun(gameState.character).character;
      launch(1, character);
      break;
    }
    case 'menu':
      game.scene.stop('PlatformerScene');
      input.setActive(false);
      resetRun();
      ui.showCharacterSelect(window.gameUI.characters || []);
      AudioManager.music('menu');
      break;
    case 'settings':
      updateSettings(payload);
      applySettings();
      activeScene()?.refreshMotionSettings?.();
      break;
    case 'toggleRun':
      input.autoDash = false;
      input.runToggle = payload.enabled !== undefined ? !!payload.enabled : !input.runToggle;
      window.dispatchEvent(new CustomEvent('game:run-toggle', { detail: { enabled: input.runToggle } }));
      break;
    case 'fullscreen':
      if (document.fullscreenElement) {
        document.exitFullscreen?.().then(focusGame).catch(() => {});
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().then(focusGame).catch(() => {
          ui.showToast('Fullscreen is not available in this browser', 'warning');
        });
      } else {
        ui.showToast('Fullscreen is not available in this browser', 'warning');
      }
      break;
    default:
      break;
  }
});

window.addEventListener('resize', () => game.scale.refresh());
game.canvas.addEventListener('contextmenu', event => event.preventDefault());

function pauseOnFocusLoss() {
  const scene = activeScene();
  if (scene?.scene.isActive() && !scene.scene.isPaused()) togglePause();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseOnFocusLoss();
});
window.addEventListener('blur', pauseOnFocusLoss);

window.addEventListener('pagehide', () => {
  pauseOnFocusLoss();
  input.setActive(false);
  AudioManager.stopMusic(150);
});

window.addEventListener('pageshow', event => {
  if (!event.persisted) return;
  AudioManager.music(activeScene()?.level?.music || 'menu');
});

window.gameCommands = {
  start: (character = 'mario') => startRun(character),
  launch,
  pause: togglePause,
  get records() { return records; },
  get settings() { return settings; }
};

export { game, gameState };
export default game;

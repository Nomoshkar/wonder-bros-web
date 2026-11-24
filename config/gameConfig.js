import * as Phaser from 'phaser';
import { GAME_W, GAME_H, PHYSICS, COLORS } from '../utils/Constants.js';

/**
 * Canvas2D is intentional: the stylized 2.5D art is resolution-independent and
 * the scenes are small, giving phones a reliable renderer without WebGL flags.
 */
export const gameConfig = {
  type: Phaser.CANVAS,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: COLORS.SKY_BLUE,
  pixelArt: false,
  roundPixels: false,
  antialias: true,
  input: {
    keyboard: false,
    activePointers: 4,
    touch: { capture: true }
  },
  audio: { noAudio: true },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: PHYSICS.GRAVITY_Y },
      fps: 60,
      fixedStep: true,
      debug: false,
      tileBias: 16
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: false
  },
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: false,
    powerPreference: 'low-power'
  },
  fps: { target: 60, smoothStep: false },
  scene: [],
  callbacks: {
    postBoot(game) {
      game.canvas.setAttribute('aria-label', 'Super Wonder Bros platform game');
      game.canvas.setAttribute('role', 'img');
      game.canvas.style.imageRendering = 'auto';
    }
  }
};

export const SCENE_KEYS = {
  BOOT: 'BootScene',
  GAME: 'PlatformerScene'
};

export default gameConfig;

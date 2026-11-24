import * as Phaser from 'phaser';
import { generateAllTextures } from '../utils/ModernTextures.js';
import { CHARACTER_STATS } from '../utils/Constants.js';
import { AudioManager } from '../utils/AudioManager.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    try {
      const portraits = generateAllTextures(this);
      const characters = portraits.map(({ id, color }) => ({
        id,
        name: CHARACTER_STATS[id].name,
        description: CHARACTER_STATS[id].trait,
        color,
        stats: {
          speed: Math.max(1, Math.round(CHARACTER_STATS[id].speed / 65)),
          jump: Math.max(1, Math.round(Math.abs(CHARACTER_STATS[id].jump) / 160)),
          handling: id === 'luigi' ? 3 : 4
        }
      }));
      window.gameArtwork = portraits;
      for (const portrait of portraits) {
        window.dispatchEvent(new CustomEvent('game:artwork', { detail: portrait }));
      }
      window.gameUI?.hideLoading();
      window.gameUI?.showCharacterSelect(characters);
      AudioManager.music('menu');
      window.dispatchEvent(new CustomEvent('game:ready'));
    } catch (error) {
      console.error('Game initialization failed:', error);
      window.gameUI?.showError(error);
    }
  }
}

export default BootScene;

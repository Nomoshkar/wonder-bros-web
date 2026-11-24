import * as Phaser from 'phaser';
import { GAME_W, GAME_H, DEPTH } from '../utils/Constants.js';
import { settings } from '../utils/GameState.js';

const THEMES = {
  meadow: { top: '#43a7ee', bottom: '#c8efff', far: '#8bc9d8', mountain: '#68a7a0', hill: '#3e9b59', near: '#237349', light: '#fff2b8' },
  cavern: { top: '#100d26', bottom: '#302252', far: '#292044', mountain: '#403568', hill: '#2d2852', near: '#191631', light: '#bc9cff' },
  sky: { top: '#4aa9eb', bottom: '#e0f6ff', far: '#b7ddec', mountain: '#88b6cc', hill: '#d7edf1', near: '#a9cedd', light: '#fff0b5' },
  ocean: { top: '#329dc4', bottom: '#8de2dc', far: '#72c6d2', mountain: '#3e96a7', hill: '#247c8c', near: '#18586d', light: '#c9fff0' },
  castle: { top: '#21182f', bottom: '#603448', far: '#493044', mountain: '#65404e', hill: '#422b3e', near: '#271e30', light: '#ffad67' }
};

function colorNumber(hex) { return typeof hex === 'number' ? hex : Phaser.Display.Color.HexStringToColor(hex).color; }

function skyTexture(scene, themeName, theme) {
  const key = `sky_${themeName}`;
  if (scene.textures.exists(key)) return key;
  const canvas = document.createElement('canvas');
  canvas.width = GAME_W;
  canvas.height = GAME_H;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, GAME_H);
  gradient.addColorStop(0, theme.top);
  gradient.addColorStop(1, theme.bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  const sunX = GAME_W * 0.78;
  const sunY = GAME_H * 0.19;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 190);
  glow.addColorStop(0, `${theme.light}ee`);
  glow.addColorStop(0.2, `${theme.light}66`);
  glow.addColorStop(1, `${theme.light}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  scene.textures.addCanvas(key, canvas);
  return key;
}

function smoothHill(g, base, width, topColor, bottomColor, seed, amplitude = 70, alpha = 1) {
  g.fillGradientStyle(colorNumber(topColor), colorNumber(topColor), colorNumber(bottomColor), colorNumber(bottomColor), alpha);
  g.beginPath();
  g.moveTo(-160, GAME_H + 40);
  for (let x = -160; x <= width + 320; x += 8) {
    const wave = Math.sin((x + seed) * 0.0055) * 0.62 + Math.sin((x + seed) * 0.014) * 0.25;
    g.lineTo(x, base - amplitude * (wave + 1) * 0.5);
  }
  g.lineTo(width + 320, GAME_H + 40);
  g.closePath();
  g.fillPath();
}

function cloud(g, x, y, scale = 1, alpha = 1) {
  g.fillStyle(0x315d7c, 0.10 * alpha);
  g.fillEllipse(x + 5 * scale, y + 15 * scale, 104 * scale, 26 * scale);
  g.fillStyle(0xffffff, 0.96 * alpha);
  g.fillCircle(x - 30 * scale, y + 8 * scale, 20 * scale);
  g.fillCircle(x - 8 * scale, y - 2 * scale, 29 * scale);
  g.fillCircle(x + 23 * scale, y + 2 * scale, 24 * scale);
  g.fillCircle(x + 45 * scale, y + 10 * scale, 17 * scale);
  g.fillRoundedRect(x - 47 * scale, y + 7 * scale, 99 * scale, 20 * scale, 10 * scale);
  g.fillStyle(0xd7edf7, 0.55 * alpha);
  g.fillEllipse(x + 2 * scale, y + 20 * scale, 76 * scale, 10 * scale);
  g.fillStyle(0xffffff, 0.55 * alpha);
  g.fillEllipse(x - 10 * scale, y - 11 * scale, 27 * scale, 10 * scale);
}

function tree(g, x, y, scale, palette) {
  g.fillStyle(0x6c4934, 0.22);
  g.fillEllipse(x + 5 * scale, y + 3 * scale, 58 * scale, 13 * scale);
  g.fillGradientStyle(colorNumber('#936747'), colorNumber('#6d4532'), colorNumber('#60402f'), colorNumber('#8a6041'), 1);
  g.fillRoundedRect(x - 7 * scale, y - 72 * scale, 14 * scale, 78 * scale, 5 * scale);
  g.fillStyle(0xe0b47c, 0.32);
  g.fillRoundedRect(x - 4 * scale, y - 67 * scale, 3 * scale, 62 * scale, 2 * scale);
  g.fillGradientStyle(colorNumber(palette.hill), colorNumber(palette.near), colorNumber(palette.near), colorNumber(palette.hill), 1);
  g.fillCircle(x - 22 * scale, y - 75 * scale, 30 * scale);
  g.fillCircle(x + 23 * scale, y - 73 * scale, 29 * scale);
  g.fillCircle(x, y - 100 * scale, 37 * scale);
  g.fillStyle(0xffffff, 0.14);
  g.fillEllipse(x - 13 * scale, y - 118 * scale, 31 * scale, 15 * scale);
  g.fillStyle(0xffffff, 0.07);
  g.fillCircle(x + 24 * scale, y - 77 * scale, 18 * scale);
}

function mountain(g, x, base, width, height, top, bottom) {
  g.fillGradientStyle(colorNumber(top), colorNumber(top), colorNumber(bottom), colorNumber(bottom), 0.92);
  g.beginPath();
  g.moveTo(x - width * 0.58, base);
  g.lineTo(x - width * 0.18, base - height * 0.56);
  g.lineTo(x, base - height);
  g.lineTo(x + width * 0.16, base - height * 0.61);
  g.lineTo(x + width * 0.58, base);
  g.closePath();
  g.fillPath();
  g.fillStyle(0xffffff, 0.22);
  g.beginPath();
  g.moveTo(x - width * 0.13, base - height * 0.72);
  g.lineTo(x, base - height);
  g.lineTo(x + width * 0.14, base - height * 0.7);
  g.lineTo(x + width * 0.03, base - height * 0.76);
  g.closePath();
  g.fillPath();
}

function crystal(g, x, y, scale, hue) {
  g.fillStyle(hue, 0.10);
  g.fillCircle(x, y - 20 * scale, 48 * scale);
  g.fillGradientStyle(0xd9c8ff, hue, hue, 0x59449b, 0.92);
  g.fillTriangle(x, y - 82 * scale, x - 19 * scale, y - 18 * scale, x + 19 * scale, y - 18 * scale);
  g.fillTriangle(x - 4 * scale, y - 62 * scale, x - 26 * scale, y - 6 * scale, x + 2 * scale, y - 6 * scale);
  g.fillStyle(0xffffff, 0.42);
  g.fillTriangle(x, y - 78 * scale, x - 5 * scale, y - 24 * scale, x + 3 * scale, y - 24 * scale);
}

function addMotes(scene, worldWidth, color, count) {
  const motes = [];
  if (settings.reducedMotion) return motes;
  for (let index = 0; index < count; index++) {
    const x = 80 + Math.random() * (worldWidth - 160);
    const y = 90 + Math.random() * 330;
    const mote = scene.add.circle(x, y, 1.5 + Math.random() * 1.8, color, 0.18 + Math.random() * 0.25).setDepth(DEPTH.DECOR - 1);
    const tween = scene.tweens.add({
      targets: mote, y: y - 20 - Math.random() * 25, alpha: 0.05,
      duration: 2600 + Math.random() * 2800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      delay: Math.random() * 1800
    });
    motes.push({ mote, tween });
  }
  return motes;
}

export function createBackdrop(scene, themeName, worldWidth) {
  scene.ambientMotes = [];
  const source = THEMES[themeName] || THEMES.meadow;
  const palette = Object.fromEntries(Object.entries(source).map(([key, value]) => [key, colorNumber(value)]));
  scene.cameras.main.setBackgroundColor(source.top);
  scene.add.image(0, 0, skyTexture(scene, themeName, source)).setOrigin(0).setDepth(DEPTH.BACKGROUND).setScrollFactor(0);

  const far = scene.add.graphics().setDepth(DEPTH.BACKGROUND + 1).setScrollFactor(0.12);
  const mid = scene.add.graphics().setDepth(DEPTH.BACKGROUND + 2).setScrollFactor(0.28);
  const near = scene.add.graphics().setDepth(DEPTH.BACKGROUND + 3).setScrollFactor(0.52);

  if (themeName === 'meadow') {
    for (let x = -100; x < worldWidth + 500; x += 390) mountain(far, x + 150, 440, 430, 175 + (x % 3) * 22, '#b9e2e4', palette.far);
    smoothHill(mid, 458, worldWidth + 500, '#78b68b', '#3e8e62', 160, 92);
    smoothHill(near, 505, worldWidth + 700, '#4ca95e', '#226f47', 520, 78);
    for (let x = 50; x < worldWidth + 400; x += 165) tree(near, x, 486 + Math.sin(x * 0.01) * 9, 0.72 + (x % 4) * 0.06, palette);
    for (let x = 110; x < worldWidth + 500; x += 490) cloud(far, x, 82 + (x % 130), 0.8 + (x % 3) * 0.12, 0.92);
    scene.ambientMotes = addMotes(scene, worldWidth, 0xfff2b0, 14);
  } else if (themeName === 'sky') {
    for (let x = -120; x < worldWidth + 500; x += 420) mountain(far, x + 160, 470, 480, 150 + (x % 3) * 25, '#d9f1f5', palette.far);
    smoothHill(mid, 500, worldWidth + 500, '#eaf9fa', '#c2e1e8', 90, 58);
    for (let x = 90; x < worldWidth + 500; x += 330) cloud(mid, x, 330 + (x % 120), 1.15, 0.72);
    for (let x = 130; x < worldWidth + 500; x += 520) cloud(far, x, 80 + (x % 100), 0.9, 0.95);
    near.fillStyle(0xffffff, 0.16);
    for (let x = 100; x < worldWidth + 400; x += 380) near.fillEllipse(x, 510, 210, 22);
    scene.ambientMotes = addMotes(scene, worldWidth, 0xffffff, 18);
  } else if (themeName === 'cavern') {
    far.fillGradientStyle(palette.far, palette.far, palette.mountain, palette.mountain, 1);
    far.fillRect(-200, 0, worldWidth + 600, 250);
    for (let x = -40; x < worldWidth + 400; x += 150) {
      far.fillGradientStyle(palette.mountain, palette.mountain, palette.hill, palette.hill, 1);
      far.beginPath();
      far.moveTo(x - 45, 0); far.lineTo(x + 45, 0); far.lineTo(x + 12, 125 + (x % 130)); far.closePath(); far.fillPath();
    }
    mid.fillStyle(palette.light, 0.055);
    for (let x = 210; x < worldWidth + 400; x += 540) {
      mid.fillTriangle(x, 0, x + 150, 0, x - 90, 520);
      mid.fillTriangle(x + 35, 0, x + 110, 0, x - 40, 520);
    }
    smoothHill(mid, 500, worldWidth + 500, '#45406d', '#252144', 20, 120);
    for (let x = 80; x < worldWidth + 300; x += 250) crystal(mid, x, 486, 0.7 + (x % 3) * 0.16, x % 500 ? 0x8c72d8 : 0x4ac8c3);
    scene.ambientMotes = addMotes(scene, worldWidth, 0xc7a6ff, 22);
  } else if (themeName === 'ocean') {
    for (let x = -100; x < worldWidth + 500; x += 300) mountain(far, x + 140, 465, 360, 120 + (x % 4) * 18, '#a1e1df', palette.far);
    smoothHill(mid, 492, worldWidth + 500, '#56aeb4', '#277d90', 110, 95);
    mid.fillStyle(palette.light, 0.07);
    for (let x = 120; x < worldWidth + 400; x += 430) mid.fillTriangle(x, 0, x + 95, 0, x - 100, 520);
    for (let x = 160; x < worldWidth + 400; x += 360) {
      mid.fillStyle(0xe78383, 0.55);
      mid.fillRoundedRect(x, 470, 13, 55, 6);
      mid.fillRoundedRect(x - 19, 486, 18, 9, 5);
      mid.fillRoundedRect(x + 13, 475, 19, 9, 5);
      mid.fillStyle(0xf5b28f, 0.6);
      mid.fillCircle(x + 6, 468, 8);
    }
    near.fillGradientStyle(palette.hill, palette.hill, palette.near, palette.near, 0.92);
    near.fillRect(-100, 512, worldWidth + 500, 90);
    for (let x = 100; x < worldWidth + 500; x += 490) cloud(far, x, 78 + (x % 110), 0.76, 0.82);
    scene.ambientMotes = addMotes(scene, worldWidth, 0xc9fff0, 16);
  } else {
    far.fillGradientStyle(palette.far, palette.far, palette.mountain, palette.mountain, 0.9);
    far.fillRect(-100, 60, worldWidth + 500, 480);
    for (let x = -60; x < worldWidth + 400; x += 260) {
      far.fillGradientStyle('#654052', '#654052', '#392638', '#392638', 1);
      far.fillRoundedRect(x, 145, 135, 395, 12);
      far.fillRoundedRect(x + 25, 92, 85, 90, 8);
      for (let crenel = 0; crenel < 4; crenel++) far.fillRoundedRect(x + 15 + crenel * 32, 70, 20, 48, 4);
      far.fillStyle(palette.light, 0.24);
      far.fillRoundedRect(x + 32, 215, 20, 52, 10);
      far.fillRoundedRect(x + 84, 215, 20, 52, 10);
      far.fillStyle(0x140f20, 0.5);
      far.fillRoundedRect(x + 49, 365, 38, 175, 18);
    }
    mid.fillStyle(palette.light, 0.06);
    for (let x = 170; x < worldWidth + 400; x += 390) mid.fillTriangle(x, 0, x + 80, 0, x - 140, 540);
    smoothHill(near, 520, worldWidth + 500, '#4b3040', '#241b2b', 60, 45);
    scene.ambientMotes = addMotes(scene, worldWidth, 0xffa65e, 24);
  }

  // Soft cinematic edge shading, kept subtle so hazards retain full contrast.
  const vignetteKey = 'wb_vignette';
  if (!scene.textures.exists(vignetteKey)) {
    const canvas = document.createElement('canvas');
    canvas.width = GAME_W; canvas.height = GAME_H;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(GAME_W / 2, GAME_H / 2, 160, GAME_W / 2, GAME_H / 2, 590);
    gradient.addColorStop(0, 'rgba(8,14,30,0)');
    gradient.addColorStop(1, 'rgba(8,14,30,0.20)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, GAME_W, GAME_H);
    scene.textures.addCanvas(vignetteKey, canvas);
  }
  scene.add.image(0, 0, vignetteKey).setOrigin(0).setDepth(DEPTH.BACKGROUND + 8).setScrollFactor(0).setAlpha(0.65);
  return palette;
}

export function addMeadowDecor(scene, width, palette) {
  const decor = scene.add.graphics().setDepth(DEPTH.DECOR);
  const colors = [0xffd65b, 0xf278ad, 0xfff1cf];
  for (let x = 130; x < width - 80; x += 175) {
    if (x % 350 < 200) {
      decor.fillStyle(0x267344, 0.8);
      decor.fillRoundedRect(x - 1, 488, 3, 12, 2);
      decor.fillStyle(colors[(x / 175 | 0) % colors.length]);
      for (let petal = 0; petal < 5; petal++) {
        const angle = petal * Math.PI * 2 / 5;
        decor.fillCircle(x + Math.cos(angle) * 4, 487 + Math.sin(angle) * 4, 3);
      }
      decor.fillStyle(0xfff1cf);
      decor.fillCircle(x, 487, 2.4);
    }
  }
  void palette;
}

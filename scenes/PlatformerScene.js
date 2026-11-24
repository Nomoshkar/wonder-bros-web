import * as Phaser from 'phaser';
import { GAME_W, GAME_H, TILE, DEPTH, PHYSICS } from '../utils/Constants.js';
import { getLevel } from '../config/levels.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { createBackdrop, addMeadowDecor } from './Backdrop.js';
import { AudioManager } from '../utils/AudioManager.js';
import {
  gameState, settings, addScore, collect, saveCheckpoint,
  completeLevel, loseLife, records
} from '../utils/GameState.js';

const SOLID_STYLES = new Set(['grass', 'stone']);

export class PlatformerScene extends Phaser.Scene {
  constructor() { super('PlatformerScene'); }

  init(data) {
    this.levelId = Number(data?.level) || gameState.level || 1;
    this.level = getLevel(this.levelId);
    this.levelId = this.level.id;
    gameState.level = this.levelId;
    this.characterId = data?.character || gameState.character || 'mario';
    this.respawnData = data?.respawn ? gameState.checkpoint : null;
  }

  create() {
    this.transitioning = false;
    this.hurt = false;
    this.bossDefeated = !this.level.goal.requiresBoss;
    this.stompCombo = 0;
    this.lastStompAt = -1000;
    this.levelElapsed = 0;
    this.levelStartTime = this.time.now;
    this.lastHudUpdate = 0;
    this.lastActionAt = 0;
    this.seenSigns = new Set();
    this.activatedCheckpoints = new Set();
    this.blocks = [];
    this.lavaImages = [];
    this.decorativeTweens = [];
    this.collectibles = [];
    this.projectiles = [];
    this.worldWidth = this.level.width;

    this.physics.world.setBounds(0, -140, this.worldWidth, GAME_H + 420);
    this.physics.world.setBoundsCollision(true, true, true, false);
    this.physics.world.gravity.y = PHYSICS.GRAVITY_Y;
    this.cameras.main.setBounds(0, 0, this.worldWidth, GAME_H);
    this.cameras.main.removeAllListeners('camerafadeoutcomplete');
    this.cameras.main.resetFX();
    this.cameras.main.fadeIn(350, 0, 0, 0);

    this.palette = createBackdrop(this, this.level.theme, this.worldWidth);
    if (this.level.theme === 'meadow') addMeadowDecor(this, this.worldWidth, this.palette);

    this.terrain = this.physics.add.staticGroup();
    this.oneWayPlatforms = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();
    this.enemyGroup = this.physics.add.group();
    this.itemGroup = this.physics.add.group();
    this.projectileGroup = this.physics.add.group();
    this.buildTerrain();
    this.buildHazards();
    this.buildCollectibles();
    this.buildBlocks();
    this.buildMovers();
    this.buildCheckpoints();
    this.buildSigns();
    this.buildGoal();
    this.buildEnemies();

    const checkpoint = this.respawnData?.level === this.levelId ? this.respawnData : null;
    const spawn = checkpoint || this.level.spawn;
    this.player = new Player(this, spawn.x, spawn.y, this.characterId);
    this.buildPlayerShadow();
    if (this.characterId === 'daisy') this.player.petalGuard = true;
    this.physics.add.collider(this.player, this.terrain, this.onTerrainCollide, null, this);
    this.physics.add.collider(this.player, this.oneWayPlatforms, this.onOneWayCollide, this.canLandOnPlatform, this);
    this.physics.add.collider(this.player, this.enemyGroup, this.onEnemyContact, null, this);
    this.physics.add.overlap(this.player, this.itemGroup, this.onItemContact, null, this);
    this.physics.add.overlap(this.player, this.hazards, this.onHazardContact, null, this);
    this.physics.add.overlap(this.player, this.projectileGroup, this.onProjectileContact, null, this);
    for (const checkpoint of this.checkpoints) {
      this.physics.add.overlap(this.player, checkpoint.zone, () => this.activateCheckpoint(checkpoint), null, this);
    }
    this.physics.add.overlap(this.player, this.goalZone, () => this.touchGoal(), null, this);
    for (const mover of this.movers) this.physics.add.collider(this.player, mover.sprite);
    this.physics.add.collider(this.enemyGroup, this.terrain);
    this.physics.add.overlap(this.enemyGroup, this.enemyGroup, this.onEnemyEnemyContact, null, this);
    this.physics.add.collider(this.itemGroup, this.terrain);
    this.physics.add.collider(this.projectileGroup, this.terrain, this.onProjectileTerrain, null, this);

    this.cameras.main.startFollow(this.player, true, 0.11, 0.11);
    this.cameras.main.setDeadzone(70, 45);
    this.cameras.main.setRoundPixels(true);

    window.gameScene = this;
    window.gameInput.setActive(true);
    window.gameInput.clear();
    window.gameUI.showGame({ character: this.characterId, levelName: this.level.key });
    window.gameUI.showLevelCard(this.level.title, this.level.subtitle);
    window.gameUI.updateHUD(this.hudData());
    if (this.levelId === 1 && !checkpoint) {
      const touch = window.matchMedia?.('(pointer: coarse)').matches;
      this.time.delayedCall(900, () => window.gameUI?.showToast(
        touch ? 'Hold ← → to move · Tap Jump to leap' : 'Move with ← → or A D · Jump with Space', 'hint'));
    }
    if (checkpoint) window.gameUI.showToast('Back at your checkpoint', 'checkpoint');
    AudioManager.music(this.level.music);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.gameInput.setActive(false);
      if (window.gameScene === this) window.gameScene = null;
    });
  }

  buildTerrain() {
    for (const definition of this.level.terrain) {
      if (definition.style === 'pipe') this.buildPipe(definition);
      else if (definition.oneWay) this.buildPlatform(definition);
      else this.buildSolid(definition);
    }
  }

  addStaticBody(group, x, y, w, h) {
    const body = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xffffff, 0).setVisible(false);
    this.physics.add.existing(body, true);
    group.add(body);
    return body;
  }

  tileField(x, y, w, h, topTexture, fillTexture) {
    for (let tx = x; tx < x + w; tx += TILE) {
      this.add.image(tx + TILE / 2, y + TILE / 2, topTexture).setDepth(DEPTH.TERRAIN);
      for (let ty = y + TILE; ty < Math.min(y + h, GAME_H + 70); ty += TILE) {
        this.add.image(tx + TILE / 2, ty + TILE / 2, fillTexture).setDepth(DEPTH.TERRAIN);
      }
    }
  }

  buildSolid(definition) {
    const { x, y, w, h, style = 'stone' } = definition;
    if (!SOLID_STYLES.has(style)) return;
    this.addStaticBody(this.terrain, x, y, w, h);
    this.tileField(x, y, w, h, style === 'grass' ? 'tile_grass' : 'tile_stone', style === 'grass' ? 'tile_ground' : 'tile_stone');
    if (style === 'grass' && y === 500 && this.level.theme === 'meadow') {
      // A dark earth band makes pit edges readable at a glance.
      const edge = this.add.graphics().setDepth(DEPTH.TERRAIN + 1);
      edge.fillStyle(0x5c382b, 0.45);
      edge.fillRect(x, y + 38, 4, 54);
      edge.fillRect(x + w - 4, y + 38, 4, 54);
    }
  }

  buildPipe(definition) {
    const { x, y, w, h } = definition;
    this.addStaticBody(this.terrain, x, y - h, w, h);
    this.add.image(x + w / 2, y - h + 20, 'tile_pipe_top').setDepth(DEPTH.TERRAIN);
    for (let py = y - h + 40; py < y; py += 40) {
      this.add.image(x + w / 2, py + 20, 'tile_pipe_body').setDepth(DEPTH.TERRAIN);
    }
  }

  buildPlatform(definition) {
    const { x, y, w, style = 'cloud' } = definition;
    this.addStaticBody(this.oneWayPlatforms, x, y, w, 14);
    const texture = style === 'stone' ? 'tile_stone' : 'tile_cloud';
    for (let px = x; px < x + w; px += TILE) {
      const image = this.add.image(px + TILE / 2, y + (style === 'stone' ? 7 : 8), texture)
        .setDepth(DEPTH.TERRAIN);
      if (style === 'stone') image.setDisplaySize(TILE, 14).setCrop(0, 0, TILE, 14);
    }
  }

  buildHazards() {
    for (const definition of this.level.hazards || []) {
      const { x, y, w, h, type } = definition;
      this.addStaticBody(this.hazards, x, y, w, h);
      if (type === 'water') {
        this.add.rectangle(x + w / 2, y + 28, w, 56, 0x2e9fc4, 0.88).setDepth(DEPTH.DECOR);
        const waves = this.add.graphics().setDepth(DEPTH.DECOR + 1);
        waves.lineStyle(4, 0xb8f5ed, 0.9);
        for (let wx = x; wx < x + w; wx += 80) {
          waves.beginPath();
          waves.moveTo(wx, y + 4);
          waves.lineTo(wx + 20, y - 4);
          waves.lineTo(wx + 40, y + 4);
          waves.lineTo(wx + 60, y - 4);
          waves.lineTo(wx + 80, y + 4);
          waves.strokePath();
        }
      } else {
        for (let lx = x; lx < x + w; lx += TILE) {
          const lava = this.add.image(lx + TILE / 2, y + TILE / 2, 'tile_lava').setDepth(DEPTH.DECOR);
          this.lavaImages.push(lava);
          if (!settings.reducedMotion) {
            this.decorativeTweens.push(this.tweens.add({ targets: lava, alpha: { from: 0.82, to: 1 }, duration: 650, yoyo: true, repeat: -1 }));
          }
        }
      }
    }
  }

  buildCollectibles() {
    (this.level.coins || []).forEach((definition, index) => {
      const id = `${this.levelId}:coin:${index}`;
      if (gameState.collected.has(id)) return;
      const item = this.physics.add.sprite(definition.x, definition.y, `item_${definition.kind || 'coin'}`)
        .setScale(0.5).setDepth(DEPTH.ITEMS);
      item.body.setAllowGravity(false).setImmovable(true);
      item.body.setCircle(definition.kind === 'seed' ? 26 : 22, definition.kind === 'seed' ? 6 : 10, definition.kind === 'seed' ? 6 : 10);
      item.collectId = id;
      item.collectKind = definition.kind === 'seed' ? 'seed' : 'coin';
      item.baseY = definition.y;
      item.phase = index * 0.7;
      this.itemGroup.add(item);
      this.collectibles.push(item);
    });
  }

  buildBlocks() {
    (this.level.terrain || []).filter(definition => definition.type === 'brick' || definition.type === 'question').forEach((definition, index) => {
      const { x, y, type, contents } = definition;
      const body = this.addStaticBody(this.terrain, x, y, TILE, TILE);
      const art = this.add.image(x + TILE / 2, y + TILE / 2, type === 'question' ? 'tile_question' : 'tile_brick')
        .setDepth(DEPTH.TERRAIN);
      const block = { body, art, type, contents, used: false, id: `${this.levelId}:block:${index}` };
      body.blockData = block;
      this.blocks.push(block);
      if (type === 'question' && !settings.reducedMotion) {
        this.decorativeTweens.push(this.tweens.add({ targets: art, scaleX: 1.035, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
      }
    });
  }

  buildMovers() {
    this.movers = [];
    for (const definition of this.level.movers || []) {
      const sprite = this.physics.add.sprite(definition.x + definition.w / 2, definition.y, 'tile_cloud')
        .setOrigin(0.5, 0.5).setScale(definition.w / TILE, 1).setDepth(DEPTH.TERRAIN);
      sprite.body.setAllowGravity(false).setImmovable(true);
      sprite.body.setSize(TILE, 14, false);
      sprite.body.setOffset(0, 1);
      const mover = { ...definition, sprite, originX: sprite.x, originY: sprite.y, phase: 0 };
      this.movers.push(mover);
      this.physics.add.collider(this.enemyGroup, sprite);
    }
  }

  buildCheckpoints() {
    this.checkpoints = [];
    for (const [index, definition] of (this.level.checkpoints || []).entries()) {
      const art = this.add.image(definition.x, definition.y, 'decor_checkpoint').setOrigin(0.5, 1).setDepth(DEPTH.DECOR);
      const zone = this.add.zone(definition.x, definition.y - 36, 60, 72);
      this.physics.add.existing(zone, true);
      const checkpoint = { ...definition, art, zone, active: false, index };
      zone.checkpointData = checkpoint;
      this.checkpoints.push(checkpoint);
    }
  }

  buildSigns() {
    this.signs = (this.level.signs || []).map(definition => {
      const art = this.add.image(definition.x, definition.y, 'decor_sign').setOrigin(0.5, 1).setDepth(DEPTH.DECOR);
      return { ...definition, art };
    });
  }

  buildGoal() {
    const { x, y } = this.level.goal;
    this.goalFlag = this.add.image(x, y, 'decor_goal').setOrigin(0.5, 1).setDepth(DEPTH.DECOR);
    const zone = this.add.zone(x, y - 80, 65, 160);
    this.physics.add.existing(zone, true);
    this.goalZone = zone;
    if (this.levelId === 5) {
      this.castle = this.add.image(x + 150, y, 'decor_castle').setOrigin(0.5, 1).setDepth(DEPTH.DECOR - 1);
    }
  }

  buildEnemies() {
    for (const definition of this.level.enemies) {
      const enemy = new Enemy(this, definition.kind, definition.x, definition.y, definition.options);
      this.enemyGroup.add(enemy);
      this.physics.add.collider(enemy, this.oneWayPlatforms, null, this.canLandOnPlatform, this);
    }
  }

  onTerrainCollide(player, terrain) {
    if (terrain.blockData) this.hitBlock(player, terrain.blockData);
  }

  canLandOnPlatform(player, platform) {
    if (this.time.now < player.dropThroughUntil) return false;
    const body = player.body;
    const top = platform.body.top;
    return body.velocity.y >= -20 && body.prev.y + body.height <= top + 10;
  }

  onOneWayCollide(player, platform) {
    player.grounded = true;
    player.coyoteUntil = this.time.now + PHYSICS.COYOTE_MS;
  }

  hasPlatformBelow(player) {
    return this.oneWayPlatforms.getChildren().some(platform =>
      player.x > platform.body.left - 8 && player.x < platform.body.right + 8 &&
      platform.body.top >= player.feetY - 3 && platform.body.top < player.feetY + 34);
  }

  isSolidAt(x, y) {
    return this.terrain.getChildren().some(object => object.body &&
      x >= object.body.left && x <= object.body.right && y >= object.body.top && y <= object.body.bottom);
  }

  tryStepUp(player, direction) {
    const body = player.body;
    const aheadX = direction > 0 ? body.right + 4 : body.left - 4;
    const candidate = this.terrain.getChildren().find(object => {
      if (!object.body) return false;
      const top = object.body.top;
      return aheadX >= object.body.left && aheadX <= object.body.right &&
        top < body.bottom - 2 && top >= body.bottom - 14;
    });
    if (!candidate) return false;
    const step = body.bottom - candidate.body.top;
    const destination = new Phaser.Geom.Rectangle(body.x + direction * 4, body.y - step - 2, body.width, body.height);
    const blocked = this.terrain.getChildren().some(object => object.body && Phaser.Geom.Intersects.RectangleToRectangle(destination, object.body));
    if (blocked) return false;
    body.position.y -= step + 2;
    body.position.x += direction * 4;
    body.updateFromGameObject();
    body.blocked.left = body.blocked.right = false;
    return true;
  }

  update(time, delta) {
    if (!this.player?.active || this.transitioning || this.hurt) return;
    const dt = Math.min(delta, 50);
    this.levelElapsed += dt;
    gameState.elapsedMs += dt;
    this.player.control(window.gameInput, time, dt);
    if (window.gameInput.isDown('action') && this.player.canShoot && time - this.lastActionAt > 320) {
      this.onPlayerAction(this.player);
    }
    this.updateMovers(time, dt);
    this.enemyGroup.getChildren().forEach(enemy => enemy.update(time, dt, this.player));
    this.updateCollectibles(time, dt);
    this.updateProjectiles(time, dt);
    this.updateSigns();
    this.updateWorldSafety();

    if (time - this.lastHudUpdate > 200) {
      window.gameUI.updateHUD(this.hudData());
      this.lastHudUpdate = time;
    }
  }

  updateMovers(time) {
    for (const mover of this.movers) {
      const wave = Math.sin(time * Math.PI * 2 / mover.period);
      mover.sprite.body.velocity.x = Math.cos(time * Math.PI * 2 / mover.period) * mover.dx * Math.PI * 2 / (mover.period / 1000);
      mover.sprite.body.velocity.y = Math.cos(time * Math.PI * 2 / mover.period) * mover.dy * Math.PI * 2 / (mover.period / 1000);
      if (Math.abs(mover.sprite.x - mover.originX) > Math.abs(mover.dx) + 10 ||
          Math.abs(mover.sprite.y - mover.originY) > Math.abs(mover.dy) + 10) {
        mover.sprite.body.setVelocity(0, 0);
        mover.sprite.setPosition(mover.originX, mover.originY);
      }
      void wave;
    }
  }

  updateCollectibles(time, delta) {
    for (const item of this.collectibles) {
      if (!item.active) continue;
      if (!settings.reducedMotion) {
        item.y = item.baseY + Math.sin(time * 0.004 + item.phase) * 4;
        if (item.collectKind === 'coin') item.scaleX = 0.5 * (0.22 + Math.abs(Math.cos(time * 0.004 + item.phase)) * 0.78);
      }
      const distance = Phaser.Math.Distance.Between(item.x, item.y, this.player.x, this.player.y - 30);
      if (this.player.magnetRange && distance < this.player.magnetRange) {
        const angle = Phaser.Math.Angle.Between(item.x, item.y, this.player.x, this.player.y - 30);
        item.body.setVelocity(Math.cos(angle) * 310, Math.sin(angle) * 310);
      } else item.body.setVelocity(0, 0);
      if (distance < (item.collectKind === 'seed' ? 27 : 23)) this.collectItem(item);
    }
    void delta;
  }

  updateProjectiles(time, delta) {
    for (const projectile of this.projectiles) {
      if (!projectile.active) continue;
      if (projectile.projectileType === 'bubble') {
        projectile.body.velocity.y = -95 + Math.sin(time * 0.012 + projectile.phase) * 30;
      }
      if (time > projectile.expiresAt) {
        this.burst(projectile.x, projectile.y, projectile.projectileType === 'bubble' ? 'cyan' : 'orange', 5, 55);
        projectile.destroy();
      }
    }
    void delta;
  }

  updateSigns() {
    for (const sign of this.signs) {
      if (!this.seenSigns.has(sign.text) && Math.abs(this.player.x - sign.x) < 85) {
        this.seenSigns.add(sign.text);
        window.gameUI.showToast(sign.text.replace(/\n/g, ' · '), 'hint', 3200);
      }
    }
  }

  updateWorldSafety() {
    this.updatePlayerShadow();
    if (this.player.y > GAME_H + 95) this.damagePlayer(null, 'fall');
  }

  buildPlayerShadow() {
    this.playerShadowOuter = this.add.ellipse(0, 0, 54, 18, 0x142033, 0.10).setDepth(DEPTH.PLAYER - 2);
    this.playerShadowInner = this.add.ellipse(0, 0, 38, 11, 0x142033, 0.20).setDepth(DEPTH.PLAYER - 1);
  }

  updatePlayerShadow() {
    if (!this.player?.active || !this.playerShadowOuter?.active) return;
    let surface = GAME_H + 20;
    const surfaces = [...this.terrain.getChildren(), ...this.oneWayPlatforms.getChildren(), ...this.movers.map(mover => mover.sprite)];
    for (const object of surfaces) {
      if (!object.body || this.player.x < object.body.left || this.player.x > object.body.right) continue;
      if (object.body.top >= this.player.feetY - 4 && object.body.top < surface) surface = object.body.top;
    }
    const height = Math.max(0, surface - this.player.feetY);
    const scale = Phaser.Math.Clamp(1 - height / 300, 0.38, 1);
    for (const shadow of [this.playerShadowOuter, this.playerShadowInner]) {
      shadow.setPosition(this.player.x, surface + 3).setScale(scale).setAlpha((height ? 0.45 : 1) * scale);
    }
  }

  onItemContact(player, item) {
    if (item.collectId) this.collectItem(item);
    else if (item.powerupType) this.applyItem(item);
  }

  collectItem(item) {
    if (!item.active || !collect(item.collectId, item.collectKind)) return;
    this.burst(item.x, item.y, item.collectKind === 'seed' ? 'green' : 'gold', settings.reducedMotion ? 3 : 9, 95);
    AudioManager.sfx('coin');
    window.gameUI.showToast(item.collectKind === 'seed' ? 'Wonder Seed +500' : 'Coin +100', 'coin', 900);
    item.destroy();
    window.gameUI.updateHUD(this.hudData());
  }

  applyItem(item) {
    if (!item.active) return;
    const type = item.powerupType;
    if (type === 'mushroom') this.player.protect();
    else if (type === 'fireflower') this.player.enableFire();
    else if (type === 'star') this.player.makeStar();
    else if (type === 'bell') this.player.enableMagnet();
    else if (type === 'oneup') {
      gameState.lives = Math.min(gameState.maxLives, gameState.lives + 1);
      window.gameUI.showToast('1-Up! Extra heart', 'powerup');
    }
    this.burst(item.x, item.y, 'pink', settings.reducedMotion ? 4 : 16, 140);
    AudioManager.sfx('powerup');
    addScore(500);
    item.destroy();
    window.gameUI.updateHUD(this.hudData());
  }

  hitBlock(player, block) {
    if (!player.body.blocked.up) return;
    if (block.used) {
      if (block.type === 'brick' && (this.player.shield || this.characterId === 'goombella')) this.breakBlock(block);
      return;
    }
    block.used = true;
    this.tweens.add({ targets: block.art, y: block.art.y - 10, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
    AudioManager.sfx('bump');
    if (block.type === 'question') {
      block.art.setTexture('tile_used');
      if (block.contents === 'coin') {
        collect(`${this.levelId}:blockcoin:${block.id}`, 'coin');
        this.burst(block.art.x, block.art.y, 'gold', 8, 120);
        AudioManager.sfx('coin');
      } else this.spawnPowerup(block.art.x, block.art.y - 20, block.contents || 'mushroom');
    } else if (this.player.shield || this.characterId === 'goombella') this.breakBlock(block);
    else this.burst(block.art.x, block.art.y + 16, 'white', 3, 45);
  }

  breakBlock(block) {
    if (!block.body.active) return;
    block.body.destroy();
    this.burst(block.art.x, block.art.y, 'orange', settings.reducedMotion ? 4 : 12, 150);
    this.tweens.add({
      targets: block.art, alpha: 0, scale: 1.35, angle: 12, duration: 180,
      onComplete: () => block.art.destroy()
    });
    addScore(50);
  }

  spawnPowerup(x, y, type) {
    const item = this.physics.add.sprite(x, y, `item_${type}`).setScale(0.5).setDepth(DEPTH.ITEMS);
    item.powerupType = type;
    item.body.setBounce(0.15).setDragX(35).setVelocityX(45);
    this.itemGroup.add(item);
    this.physics.add.collider(item, this.terrain);
  }

  onEnemyContact(player, enemy) {
    if (enemy.defeated || this.transitioning || this.hurt) return;
    if (player.isStar) {
      this.defeatEnemy(enemy, 200);
      return;
    }
    const body = player.body;
    const previousBottom = body.prev.y + body.height;
    const stomp = body.velocity.y >= -45 && previousBottom <= enemy.body.top + 16;
    if (enemy.isShell) {
      if (stomp) {
        const result = enemy.stomp();
        if (result === 'shellstop') {
          player.bounce(1);
          AudioManager.sfx('stomp');
        }
      } else if (enemy.shellSpeed) this.damagePlayer(enemy, 'shell');
      else {
        enemy.kick(player.x < enemy.x ? 1 : -1);
        AudioManager.sfx('kick');
        this.burst(enemy.x, enemy.y - 14, 'green', 5, 70);
      }
      return;
    }
    if (!stomp) {
      if (enemy.kind === 'bobomb') enemy.lightFuse();
      this.damagePlayer(enemy, enemy.kind);
      return;
    }
    const result = enemy.stomp();
    if (result === 'danger') {
      this.damagePlayer(enemy, enemy.kind);
      return;
    }
    if (result === 'armor') return;
    if (result === 'bosshit' || result === 'bosskill') {
      player.bounce(1);
      return;
    }
    this.registerStomp(enemy.x, enemy.y);
    player.bounce(Math.min(5, this.stompCombo), window.gameInput.isDown('jump'));
    if (result === 'kill') this.defeatEnemy(enemy, 100 * Math.pow(2, Math.min(3, this.stompCombo - 1)));
    else if (result === 'shell') {
      this.burst(enemy.x, enemy.y - 12, 'green', 7, 85);
      addScore(100);
    } else if (result === 'collapse') {
      enemy.anims.pause();
      enemy.setAngle(90).setAlpha(0.45);
      this.scene.time.delayedCall(2400, () => {
        if (enemy.active) enemy.setAngle(0).setAlpha(1).anims.resume();
      });
      addScore(100);
    } else if (result === 'fuse') {
      window.gameUI.showToast('Bob-omb fuse lit!', 'warning');
    }
  }

  registerStomp(x, y) {
    const now = this.time.now;
    this.stompCombo = now - this.lastStompAt < 800 ? this.stompCombo + 1 : 1;
    this.lastStompAt = now;
    AudioManager.sfx('stomp');
    this.burst(x, y - 16, 'white', settings.reducedMotion ? 3 : 9, 100);
    if (this.stompCombo > 1) window.gameUI.showToast(`${this.stompCombo}× stomp combo`, 'score', 800);
    if (settings.screenShake && !settings.reducedMotion) this.cameras.main.shake(70, 0.0035);
    this.physics.world.pause();
    this.time.delayedCall(28, () => {
      if (this.physics.world) this.physics.world.resume();
    });
  }

  defeatEnemy(enemy, points) {
    if (enemy.defeated) return;
    if (enemy.boss && enemy.bossHits > 0) {
      if (this.time.now < enemy.hurtUntil) return;
      enemy.bossHits -= 1;
      enemy.hurtUntil = this.time.now + 1000;
      addScore(points || 200);
      this.onBossHit(enemy, enemy.bossHits);
      return;
    }
    enemy.defeat();
    this.burst(enemy.x, enemy.y - 20, 'orange', settings.reducedMotion ? 3 : 10, 120);
    addScore(points);
    this.tweens.add({
      targets: enemy, scaleY: 0.25, alpha: 0, y: enemy.y + 10, duration: 180,
      onComplete: () => enemy.destroy()
    });
  }

  onEnemyEnemyContact(first, second) {
    const shell = first.isShell && first.shellSpeed ? first : (second.isShell && second.shellSpeed ? second : null);
    const target = shell === first ? second : first;
    if (shell && target && !target.defeated && !target.isShell) this.defeatEnemy(target, 150);
  }

  onHazardContact(player, hazard) {
    if (hazard.body && player.body) this.damagePlayer(null, hazard.hazardType || 'hazard');
  }

  onProjectileContact(player, projectile) {
    if (projectile.hostile) this.damagePlayer(null, 'hammer');
  }

  onProjectileTerrain(projectile) {
    if (!projectile.active) return;
    if (projectile.projectileType === 'fire') {
      this.burst(projectile.x, projectile.y, 'orange', 5, 70);
      projectile.destroy();
    }
  }

  onPlayerJump(player, double = false) {
    AudioManager.sfx('jump');
    this.burst(player.x, player.feetY, double ? 'green' : 'white', settings.reducedMotion ? 2 : 5, 65);
  }

  onPlayerLand(player, pounding) {
    this.burst(player.x, player.feetY, 'white', settings.reducedMotion ? 2 : 5, 55);
    if (pounding && settings.screenShake && !settings.reducedMotion) this.cameras.main.shake(110, 0.006);
  }

  onGroundPound(player) {
    this.burst(player.x, player.feetY, 'orange', settings.reducedMotion ? 4 : 14, 160);
    if (settings.screenShake && !settings.reducedMotion) this.cameras.main.shake(150, 0.008);
    this.enemyGroup.getChildren().forEach(enemy => {
      if (enemy.active && !enemy.defeated && Math.abs(enemy.x - player.x) < 85 && Math.abs(enemy.bottom - player.feetY) < 65) {
        this.defeatEnemy(enemy, 200);
      }
    });
  }

  onPlayerAction(player) {
    if (player.canShoot && this.time.now - this.lastActionAt > 320) {
      this.lastActionAt = this.time.now;
      const projectile = this.projectileGroup.create(player.x + player.facing * 23, player.y - 38, 'projectile_fire');
      projectile.setDepth(DEPTH.PROJECTILES).setCircle(9, 3, 3);
      projectile.body.setAllowGravity(false).setVelocityX(player.facing * 430).setVelocityY(-25).setBounceY(0.55);
      projectile.projectileType = 'fire';
      projectile.expiresAt = this.time.now + 1800;
      projectile.phase = 0;
      this.projectiles.push(projectile);
      this.physics.add.overlap(projectile, this.enemyGroup, (shot, enemy) => {
        if (!shot.active || enemy.defeated) return;
        this.defeatEnemy(enemy, 200);
        shot.destroy();
      });
      AudioManager.sfx('fireball');
    } else if (player.stats.special === 'spinshell' && this.time.now > (player.nextSpinAt || 0)) {
      player.spinUntil = this.time.now + 650;
      player.nextSpinAt = this.time.now + 2200;
      this.burst(player.x, player.y - 30, 'green', 10, 120);
      window.gameUI.showToast('Shell spin!', 'powerup', 900);
      AudioManager.sfx('powerup');
    } else if (!player.canShoot && this.time.now > (this.nextPowerHintAt || 0)) {
      this.nextPowerHintAt = this.time.now + 3500;
      window.gameUI.showToast('Find a Fire Flower to use Power', 'hint');
    }
  }

  spawnBossFire(x, y, direction) {
    const fire = this.projectileGroup.create(x, y, 'projectile_fire').setScale(1.35).setDepth(DEPTH.PROJECTILES);
    fire.body.setAllowGravity(false).setVelocityX(direction * 230).setVelocityY(-70);
    fire.hostile = true;
    fire.expiresAt = this.time.now + 3500;
    fire.phase = 0;
    this.projectiles.push(fire);
    this.burst(x, y, 'orange', 5, 70);
    AudioManager.sfx('bowserfire');
  }

  spawnHammer(x, y, direction) {
    const hammer = this.projectileGroup.create(x, y, 'projectile_spark').setTint(0xb8c1cf).setScale(1.1);
    hammer.body.setAllowGravity(true).setVelocityX(direction * 115).setVelocityY(-210).setBounce(0.25);
    hammer.hostile = true;
    hammer.expiresAt = this.time.now + 4500;
    this.projectiles.push(hammer);
  }

  onBobombExplode(enemy) {
    const x = enemy.x, y = enemy.y - 20;
    enemy.defeat();
    this.burst(x, y, 'orange', settings.reducedMotion ? 5 : 22, 220);
    AudioManager.sfx('explode');
    if (settings.screenShake && !settings.reducedMotion) this.cameras.main.shake(180, 0.009);
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y - 25, x, y) < 105) this.damagePlayer(null, 'explosion');
    enemy.destroy();
  }

  onShellBounce() { AudioManager.sfx('bump'); }

  onShieldBreak(player) {
    gameState.powerup = null;
    this.burst(player.x, player.y - 30, 'cyan', 12, 130);
    AudioManager.sfx('hurt');
    window.gameUI.showToast('Guard absorbed the hit', 'powerup');
    window.gameUI.updateHUD(this.hudData());
    player.setTint(0x9eeaff);
  }

  onBossHit(enemy, hits) {
    this.burst(enemy.x, enemy.y - 50, 'orange', 12, 150);
    AudioManager.sfx('explode');
    window.gameUI.showToast(hits > 0 ? `Bowser Jr. · ${hits} hits left` : 'Bowser Jr. defeated!', hits ? 'warning' : 'score', 1800);
    if (!hits) {
      this.bossDefeated = true;
      this.defeatEnemy(enemy, 2000);
      this.goalFlag.setTint(0x8cff8a);
      this.time.delayedCall(500, () => window.gameUI.showToast('The way to the castle is open!', 'checkpoint'));
    }
  }

  damagePlayer(source, cause) {
    if (this.transitioning || this.hurt || !this.player.active) return;
    const result = this.player.hurt();
    if (result === 'invincible') {
      if (source && this.player.isStar) this.defeatEnemy(source, 200);
      return;
    }
    if (result === 'shield') {
      if (source && !source.defeated) this.player.setVelocityX(this.player.x < source.x ? -170 : 170);
      return;
    }
    this.hurt = true;
    this.transitioning = true;
    gameState.powerup = null;
    window.gameInput.setActive(false);
    const lives = loseLife();
    window.gameUI.updateHUD(this.hudData());
    AudioManager.sfx('hurt');
    this.player.body.enable = false;
    this.player.setVelocity(0, -280);
    this.tweens.add({ targets: this.player, alpha: 0, angle: this.player.facing * 90, duration: 650, ease: 'Quad.easeIn' });
    this.physics.world.pause();
    this.time.delayedCall(800, () => {
      this.physics.world.resume();
      if (lives <= 0) {
        window.gameUI.showGameOver({ score: gameState.score, highScore: gameState.highScore });
      } else {
        window.gameUI.showToast(cause === 'fall' ? 'Careful! Back to your checkpoint' : 'Try again! Back to your checkpoint', 'warning', 1600);
        this.scene.restart({ level: this.levelId, character: this.characterId, respawn: true });
      }
    });
  }

  activateCheckpoint(checkpoint) {
    if (checkpoint.active) return;
    checkpoint.active = true;
    checkpoint.art.setTint(0x8cff8a);
    saveCheckpoint(this.levelId, checkpoint.x, checkpoint.y);
    this.burst(checkpoint.x, checkpoint.y - 55, 'green', 12, 120);
    AudioManager.sfx('flag');
    window.gameUI.showCheckpoint();
  }

  touchGoal() {
    if (this.transitioning) return;
    if (this.level.goal.requiresBoss && !this.bossDefeated) {
      if (!this.goalWarningAt || this.time.now - this.goalWarningAt > 2000) {
        this.goalWarningAt = this.time.now;
        window.gameUI.showToast('Defeat Bowser Jr. first!', 'warning');
      }
      return;
    }
    this.transitioning = true;
    window.gameInput.setActive(false);
    this.player.body.setVelocity(0, 0);
    this.cameras.main.stopFollow();
    AudioManager.sfx('flag');
    completeLevel(this.levelId, this.levelElapsed);
    addScore(Math.max(0, 3000 - Math.floor(this.levelElapsed / 100) * 10));
    this.burst(this.player.x, this.player.y - 50, 'gold', settings.reducedMotion ? 6 : 30, 240);
    this.tweens.add({ targets: this.goalFlag, y: this.goalFlag.y + 100, duration: 700, ease: 'Sine.easeIn' });
    this.time.delayedCall(1000, () => {
      if (this.levelId === 5) {
        AudioManager.music('victory');
        window.gameUI.showVictory({
          score: gameState.score, coins: gameState.coins, seeds: gameState.seeds,
          elapsedMs: gameState.elapsedMs, bestTimes: records.bestTimes
        });
      } else {
        this.scene.start('PlatformerScene', { level: this.levelId + 1, character: this.characterId });
      }
    });
  }

  showPowerup(label, description, duration) {
    gameState.powerup = label;
    window.gameUI.showToast(`${label} · ${description}`, 'powerup', 2200);
    this.time.delayedCall(duration, () => {
      if (gameState.powerup === label) gameState.powerup = null;
    });
    window.gameUI.updateHUD(this.hudData());
  }

  hudData() {
    let powerup = gameState.powerup;
    if (this.player?.isStar) powerup = 'Star';
    else if (this.player?.canShoot) powerup = 'Fire';
    else if (this.player?.shield) powerup = 'Guard';
    return {
      score: gameState.score,
      coins: gameState.coins,
      seeds: gameState.seeds,
      lives: gameState.lives,
      maxLives: gameState.maxLives,
      level: this.levelId,
      levelName: this.level.key,
      character: this.characterId,
      powerup,
      elapsedMs: gameState.elapsedMs
    };
  }

  burst(x, y, color, count = 8, speed = 100) {
    const emitter = this.add.particles(x, y, `particle_${color}`, {
      speed: { min: speed * 0.35, max: speed },
      angle: { min: 190, max: 350 },
      lifespan: { min: 260, max: 520 },
      gravityY: 420,
      scale: { start: 1, end: 0 },
      quantity: count,
      emitting: false
    }).setDepth(DEPTH.PARTICLES);
    emitter.explode(count);
    this.time.delayedCall(650, () => emitter.destroy());
  }

  refreshMotionSettings() {
    if (!settings.reducedMotion) return;
    for (const tween of this.decorativeTweens) tween?.stop();
    for (const lava of this.lavaImages) lava?.setAlpha(1);
    for (const block of this.blocks) block.art?.setScale(1);
    for (const { mote, tween } of this.ambientMotes || []) {
      tween?.stop();
      mote?.destroy();
    }
    this.ambientMotes = [];
  }

  setPaused(paused) {
    if (paused) {
      this.physics.world.pause();
      this.tweens.pauseAll();
      window.gameInput.setActive(false);
    } else if (!this.transitioning && !this.hurt) {
      this.physics.world.resume();
      this.tweens.resumeAll();
      window.gameInput.setActive(true);
      window.gameInput.clear();
    }
  }

  // Deterministic hooks used by the browser regression suite.
  _testTeleport(x, y = this.level.spawn.y) {
    this.player.setPosition(x, y);
    this.player.body.reset(x, y);
    this.player.setVelocity(0, 0);
  }

  _testGivePowerup(type) {
    if (type === 'fireflower') this.player.enableFire();
    if (type === 'star') this.player.makeStar();
    if (type === 'mushroom') this.player.protect();
  }
}

export default PlatformerScene;

import * as Phaser from 'phaser';
import { DEPTH } from '../utils/Constants.js';
import { settings } from '../utils/GameState.js';

const WALKERS = new Set(['goomba', 'koopa', 'spiny', 'beetle', 'hammerbro', 'bobomb', 'drybones', 'bowserjr']);
const FLYERS = new Set(['boo', 'paratroopa', 'cheep', 'blooper']);

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, kind, x, y, options = {}) {
    super(scene, x, y, `enemy_${kind}`, 0);
    this.kind = kind;
    this.scene = scene;
    this.options = options;
    this.patrolDirection = options.direction || -1;
    this.speed = options.speed || 52;
    this.minX = options.minX ?? x - 150;
    this.maxX = options.maxX ?? x + 150;
    this.baseY = y;
    this.phase = options.phase || Math.random() * Math.PI * 2;
    this.activated = false;
    this.defeated = false;
    this.isShell = false;
    this.shellSpeed = 0;
    this.stunned = false;
    this.boss = kind === 'bowserjr';
    this.bossHits = this.boss ? 3 : 0;
    this.bossAttacks = 0;
    this.hurtUntil = 0;
    this.nextAttack = scene.time.now + 1800;
    this.fuseUntil = 0;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setScale(0.5).setDepth(DEPTH.ENEMIES);
    const bodyH = this.boss ? 58 : (kind === 'piranha' ? 38 : 32) * 2;
    const bodyW = this.boss ? 44 : 28 * 2;
    this.body.setSize(bodyW, bodyH, false);
    this.body.setOffset((96 - bodyW) / 2, 94 - bodyH);
    this.setCollideWorldBounds(true);
    this.body.setMaxVelocity(500, 900);
    this.body.setDragX(0);
    if (!WALKERS.has(kind)) this.body.setAllowGravity(false);
    this.anims.play(`enemy_${kind}`);
    if (this.boss) this.setScale(0.725);
    if (kind === 'boo') this.setAlpha(0.86);
  }

  get top() { return this.body.top; }
  get bottom() { return this.body.bottom; }
  get isDangerous() { return !this.defeated && !(this.isShell && !this.shellSpeed) && this.kind !== 'piranha' || (this.kind === 'piranha' && this.y < this.baseY - 10); }

  update(time, delta, player) {
    if (!this.active || this.defeated || this.stunned) return;
    const distance = Math.abs(player.x - this.x);
    if (!this.activated) {
      if (distance > 680) {
        this.body.setVelocityX(0);
        if (FLYERS.has(this.kind)) this.body.setVelocityY(0);
        return;
      }
      this.activated = true;
    }

    if (this.isShell) {
      if (this.shellSpeed) {
        this.body.setVelocityX(this.shellSpeed);
        if (this.body.blocked.left || this.body.blocked.right || this.x < this.minX || this.x > this.maxX) {
          this.shellSpeed *= -1;
          this.scene.onShellBounce(this);
        }
      }
      return;
    }

    if (this.kind === 'piranha') {
      const cycle = Math.sin(time * 0.0017 + this.phase);
      const target = this.baseY - Math.max(0, cycle) * 54;
      this.y = Phaser.Math.Linear(this.y, target, Math.min(1, delta / 90));
      this.body.updateFromGameObject();
      return;
    }

    if (FLYERS.has(this.kind)) {
      this.phase += delta * 0.002;
      if (this.kind === 'boo') {
        const dx = player.x - this.x;
        const dy = player.y - 42 - this.y;
        const length = Math.hypot(dx, dy) || 1;
        const speed = player.facing === Math.sign(dx) ? 26 : 58;
        this.body.setVelocity((dx / length) * speed, (dy / length) * speed);
        this.setFlipX(dx < 0);
      } else if (this.kind === 'cheep' || this.kind === 'blooper') {
        this.body.setVelocity(this.patrolDirection * 62, Math.sin(this.phase * 2) * 34);
        if (this.x < this.minX || this.x > this.maxX) this.patrolDirection *= -1;
        this.setFlipX(this.patrolDirection < 0);
      } else {
        this.body.setVelocity(this.patrolDirection * this.speed, Math.sin(this.phase * 2.2) * 38);
        if (this.x < this.minX || this.x > this.maxX) this.patrolDirection *= -1;
        this.setFlipX(this.patrolDirection < 0);
      }
      return;
    }

    if (!WALKERS.has(this.kind)) return;
    if (this.fuseUntil) {
      if (time >= this.fuseUntil) {
        this.scene.onBobombExplode(this);
        return;
      }
      this.setTint(settings.reducedMotion ? 0xffb070 : (Math.floor(time / 90) % 2 ? 0xffffff : 0xff8060));
    } else {
      this.clearTint();
    }

    if (this.boss) {
      if (this.body.blocked.left || this.body.blocked.right || this.x <= this.minX || this.x >= this.maxX) this.patrolDirection *= -1;
      this.body.setVelocityX(this.patrolDirection * (time < this.hurtUntil ? 120 : 88));
      if (time > this.nextAttack && this.grounded()) {
        this.bossAttacks += 1;
        if (this.bossAttacks % 2) this.setVelocityY(-470);
        else this.scene.spawnBossFire(this.x, this.y - 58, this.patrolDirection);
        this.nextAttack = time + 1750;
      }
      return;
    }

    if (this.body.blocked.left || this.body.blocked.right || this.x <= this.minX || this.x >= this.maxX) {
      this.patrolDirection *= -1;
    }
    const aheadX = this.x + this.patrolDirection * 23;
    if (this.grounded() && !this.scene.isSolidAt(aheadX, this.feetY + 7)) this.patrolDirection *= -1;
    this.body.setVelocityX(this.patrolDirection * this.speed);
    this.setFlipX(this.patrolDirection > 0);
    if (this.kind === 'hammerbro' && time > this.nextAttack && this.grounded()) {
      this.scene.spawnHammer(this.x, this.y - 38, this.patrolDirection);
      this.nextAttack = time + 2600;
    }
  }

  grounded() { return this.body.blocked.down || this.body.touching.down; }
  get feetY() { return this.body.bottom; }

  stomp() {
    if (this.defeated) return 'none';
    if (this.boss) {
      if (this.scene.time.now < this.hurtUntil) return 'armor';
      this.bossHits -= 1;
      this.hurtUntil = this.scene.time.now + 1000;
      this.setTint(0xffb36b);
      this.scene.onBossHit(this, this.bossHits);
      return this.bossHits <= 0 ? 'bosskill' : 'bosshit';
    }
    if (this.kind === 'koopa' || this.kind === 'paratroopa' || this.kind === 'beetle') {
      if (this.isShell) {
        this.shellSpeed = 0;
        this.body.setVelocityX(0);
        return 'shellstop';
      }
      this.toShell();
      return 'shell';
    }
    if (this.kind === 'spiny' || this.kind === 'piranha') return 'danger';
    if (this.kind === 'drybones') {
      this.stunned = true;
      this.body.setVelocityX(0);
      this.scene.time.delayedCall(2400, () => {
        if (this.active) {
          this.stunned = false;
          this.patrolDirection *= -1;
        }
      });
      return 'collapse';
    }
    if (this.kind === 'bobomb') {
      this.fuseUntil = this.scene.time.now + 650;
      return 'fuse';
    }
    this.defeat();
    return 'kill';
  }

  toShell() {
    this.isShell = true;
    this.shellSpeed = 0;
    this.kind = 'shell';
    this.setTexture('enemy_shell', 0);
    this.anims.play('enemy_shell');
    this.setScale(0.5);
    this.body.setAllowGravity(true);
    this.body.setSize(60, 44, false);
    this.body.setOffset(18, 50);
    this.body.setVelocity(0, 0);
  }

  kick(direction) {
    if (!this.isShell) return;
    this.shellSpeed = direction * 390;
    this.patrolDirection = direction;
    this.body.setVelocityX(this.shellSpeed);
  }

  lightFuse() {
    if (this.kind === 'bobomb' && !this.fuseUntil) this.fuseUntil = this.scene.time.now + 1400;
  }

  defeat() {
    if (this.defeated) return;
    this.defeated = true;
    this.body.enable = false;
  }
}

export default Enemy;

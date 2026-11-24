import * as Phaser from 'phaser';
import { CHARACTER_STATS, PHYSICS, DEPTH } from '../utils/Constants.js';
import { settings } from '../utils/GameState.js';

// The 128x144 artwork is displayed at 64x72. Physics source dimensions are
// doubled to keep a deliberate, forgiving 26x48 display-space hitbox.
const TEXTURE_SCALE = 0.5;
const BODY_W = 52;
const BODY_H = 96;
const BODY_OFFSET_X = 38;
const BODY_OFFSET_Y = 46;

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, characterId) {
    const id = CHARACTER_STATS[characterId] ? characterId : 'mario';
    super(scene, x, y, `hero_${id}`, 0);
    this.characterId = id;
    this.stats = { ...CHARACTER_STATS[id] };
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setScale(TEXTURE_SCALE).setDepth(DEPTH.PLAYER);
    this.setSize(BODY_W, BODY_H, false);
    this.setOffset(BODY_OFFSET_X, BODY_OFFSET_Y);
    this.setCollideWorldBounds(true);
    this.body.setMaxVelocity(PHYSICS.PLAYER_MAX_VELOCITY_X, PHYSICS.PLAYER_MAX_VELOCITY_Y);
    this.body.setDragX(0);
    this.body.setBounce(0);
    this.resetState(x, y);
  }

  resetState(x, y) {
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.setAlpha(1).setAngle(0).clearTint();
    this.facing = 1;
    this.setFlipX(false);
    this.grounded = false;
    this.coyoteUntil = 0;
    this.jumpBufferedUntil = 0;
    this.jumpHeld = false;
    this.hasDoubleJumped = false;
    this.invincibleUntil = 0;
    this.shield = false;
    this.petalGuard = false;
    this.starUntil = 0;
    this.fireUntil = 0;
    this.magnetUntil = 0;
    this.groundPounding = false;
    this.dropThroughUntil = 0;
    this.spinUntil = 0;
    this.anims.play(`${this.characterId}_idle`);
  }

  get feetY() { return this.body ? this.body.bottom : this.y - 2; }
  get isInvincible() { return this.scene.time.now < this.invincibleUntil || this.scene.time.now < this.starUntil || this.scene.time.now < this.spinUntil; }
  get isStar() { return this.scene.time.now < this.starUntil; }
  get canShoot() { return this.scene.time.now < this.fireUntil; }
  get magnetRange() { return this.stats.special === 'longreach' ? 110 : (this.scene.time.now < this.magnetUntil ? 170 : 0); }

  control(input, time, delta) {
    if (!this.active || !this.body) return;
    const dt = Math.min(delta, 40) / 1000;
    const body = this.body;
    const wasGrounded = this.grounded;
    const wasGroundPounding = this.groundPounding;
    this.grounded = body.blocked.down || body.touching.down;
    if (this.grounded) {
      this.coyoteUntil = time + PHYSICS.COYOTE_MS;
      this.hasDoubleJumped = false;
      this.groundPounding = false;
    }

    const left = input.isDown('left');
    const right = input.isDown('right');
    const direction = Number(right) - Number(left);
    const jumpHeld = input.isDown('jump');
    const jumpPressed = input.consume('jump');
    const running = input.isDown('run');
    let maxSpeed = this.stats.speed * (running ? PHYSICS.SPRINT_MULTIPLIER : 1);
    if (this.stats.special === 'glide' && jumpHeld && body.velocity.y > 0) maxSpeed *= 1.12;
    const targetVelocity = direction * maxSpeed;
    const acceleration = direction
      ? (this.grounded ? PHYSICS.RUN_ACCELERATION : PHYSICS.AIR_ACCELERATION)
      : (this.grounded ? PHYSICS.GROUND_DECELERATION : PHYSICS.AIR_DECELERATION);
    const velocityDelta = targetVelocity - body.velocity.x;
    const velocityStep = acceleration * dt;
    body.velocity.x += Math.sign(velocityDelta) * Math.min(Math.abs(velocityDelta), velocityStep);
    if (direction) {
      this.facing = direction;
      if (this.flipX !== direction < 0) this.setFlipX(direction < 0);
    }

    // Step over tiny terrain lips instead of catching on a wall.
    if (direction && this.grounded && (body.blocked.left || body.blocked.right)) {
      if (this.scene.tryStepUp(this, direction)) body.velocity.x = targetVelocity;
    }

    if (jumpPressed) this.jumpBufferedUntil = time + PHYSICS.JUMP_BUFFER_MS;
    const canGroundJump = this.grounded || time < this.coyoteUntil;
    if (time < this.jumpBufferedUntil && canGroundJump) {
      // Down + jump drops through cloud platforms; a normal jump never does.
      const dropping = input.isDown('down') && this.grounded && this.scene.hasPlatformBelow(this);
      if (dropping) {
        this.dropThroughUntil = time + 280;
        body.position.y += 5;
        body.velocity.y = 120;
        this.grounded = false;
      } else {
        body.velocity.y = this.stats.jump;
        this.grounded = false;
        this.coyoteUntil = 0;
        this.scene.onPlayerJump(this);
      }
      this.jumpBufferedUntil = 0;
      this.hasDoubleJumped = false;
    } else if (jumpPressed && !this.grounded && !this.hasDoubleJumped &&
               (settings.assistMode || this.stats.special === 'flutter')) {
      body.velocity.y = this.stats.jump * (this.stats.special === 'flutter' ? 0.9 : 0.78);
      this.hasDoubleJumped = true;
      this.scene.onPlayerJump(this, true);
    }

    // Releasing jump cuts the arc; holding it preserves the full height.
    if (this.jumpHeld && !jumpHeld && body.velocity.y < -180) body.velocity.y *= 0.48;
    this.jumpHeld = jumpHeld;
    if (jumpHeld && body.velocity.y > 0 && this.stats.special === 'float') body.velocity.y = Math.min(body.velocity.y, 175);
    if (jumpHeld && body.velocity.y > 0 && this.stats.special === 'glide') body.velocity.y = Math.min(body.velocity.y, 115);

    if (this.stats.special === 'groundpound' && input.isDown('down') && !this.grounded) {
      this.groundPounding = true;
      body.velocity.y = 840;
      body.velocity.x *= 0.86;
    }

    if (input.consume('action')) this.scene.onPlayerAction(this);
    if (wasGroundPounding && this.grounded && !wasGrounded) this.scene.onGroundPound(this);

    if (this.grounded && !wasGrounded && !wasGroundPounding && body.velocity.y >= 0) {
      this.scene.onPlayerLand(this, false);
    }
    if (body.velocity.y > PHYSICS.MAX_FALL_SPEED && !this.groundPounding) body.velocity.y = PHYSICS.MAX_FALL_SPEED;
    this.updatePowerState(time);
    this.updateAnimation(direction, running);
  }

  updatePowerState(time) {
    if (this.isInvincible && !this.isStar && time < this.invincibleUntil) {
      if (settings.reducedMotion) this.setTint(0xffe28a);
      else this.setAlpha(Math.sin(time * 0.035) > 0 ? 1 : 0.45);
    } else {
      this.setAlpha(1);
      if (!this.isStar) this.clearTint();
    }
    if (this.isStar) this.setTint(settings.reducedMotion ? 0xffe28a : (Math.floor(time / 90) % 2 ? 0xffdf4d : 0xffffff));
  }

  updateAnimation(direction, running) {
    if (!this.grounded) this.anims.play(`${this.characterId}_jump`, true);
    else if (direction) this.anims.play(`${this.characterId}_run`, true);
    else this.anims.play(`${this.characterId}_idle`, true);
    if (this.anims.currentAnim?.key === `${this.characterId}_run`) {
      this.anims.timeScale = running ? 1.35 : 0.9;
    }
  }

  bounce(combo = 1, holdJump = false) {
    this.setVelocityY(Math.max(-540, PHYSICS.STOMP_VELOCITY - (combo - 1) * 28));
    this.grounded = false;
    this.coyoteUntil = 0;
    this.hasDoubleJumped = false;
    if (holdJump) this.jumpHeld = true;
  }

  protect(duration = 12000) {
    this.shield = true;
    this.scene.showPowerup('Super guard', 'Absorbs one hit', duration);
  }

  enableFire(duration = 14000) {
    this.fireUntil = this.scene.time.now + duration;
    this.scene.showPowerup('Fire flower', 'Press X / F or Power to throw', duration);
  }

  makeStar(duration = 9000) {
    this.starUntil = this.scene.time.now + duration;
    this.scene.showPowerup('Super star', 'Invincible!', duration);
  }

  enableMagnet(duration = 12000) {
    this.magnetUntil = this.scene.time.now + duration;
    this.scene.showPowerup('Super bell', 'Coins come to you', duration);
  }

  hurt() {
    if (this.isInvincible) return 'invincible';
    if (this.shield || this.petalGuard) {
      this.shield = false;
      this.petalGuard = false;
      this.invincibleUntil = this.scene.time.now + 1800;
      this.setVelocityY(-260);
      this.scene.onShieldBreak(this);
      return 'shield';
    }
    return 'hurt';
  }
}

export default Player;

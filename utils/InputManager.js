/**
 * One input layer for keyboard, touch, mouse and standard gamepads.
 * DOM controls deliberately live outside Phaser so they remain accessible and
 * can use Pointer Events (including correct multi-touch cancellation).
 */

const BINDINGS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'ArrowUp', 'KeyW', 'KeyZ'],
  run: ['ShiftLeft', 'ShiftRight'],
  action: ['KeyX', 'KeyF']
};

const GAMEPAD_BUTTONS = {
  jump: [0],
  action: [2, 1],
  run: [7, 5],
  down: [14]
};

const AXIS_DEADZONE = 0.24;

export class InputManager {
  constructor() {
    this.keys = new Set();
    this.virtual = new Set();
    this.pressed = new Set();
    this.previousVirtual = new Set();
    this.active = false;
    this.autoDash = false;
    this.runToggle = false;
    this.gamepadPause = false;
    this.previousGamepad = new Set();
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onBlur = this.clear.bind(this);
    this._pollFrame = 0;
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown, { passive: false });
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    document.addEventListener('visibilitychange', this._onBlur);
    const poll = () => {
      this.pollGamepad();
      this._pollFrame = requestAnimationFrame(poll);
    };
    this._pollFrame = requestAnimationFrame(poll);
  }

  _onKeyDown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const action = Object.keys(BINDINGS).find(name => BINDINGS[name].includes(event.code));
    if (!action) return;
    // Do not steal keys from native controls, dialogs or text fields.
    const target = event.target;
    if (target instanceof HTMLElement &&
        (target.matches('input, select, textarea, button, [contenteditable="true"]') ||
         target.closest('dialog'))) return;
    if (!this.active) return;
    event.preventDefault();
    if (!event.repeat && !this.keys.has(event.code)) this.pressed.add(action);
    this.keys.add(event.code);
  }

  _onKeyUp(event) {
    this.keys.delete(event.code);
  }

  setActive(active) {
    this.active = !!active;
    if (!active) this.clear();
  }

  setVirtual(action, down) {
    if (!(action in BINDINGS)) return;
    if (down && !this.virtual.has(action)) this.pressed.add(action);
    if (down) this.virtual.add(action);
    else this.virtual.delete(action);
  }

  setOptions({ autoDash = this.autoDash, runToggle = this.runToggle } = {}) {
    this.autoDash = !!autoDash;
    this.runToggle = !!runToggle;
  }

  isDown(action) {
    if (this.virtual.has(action)) return true;
    if (BINDINGS[action]?.some(code => this.keys.has(code))) return true;
    if (action === 'run' && (this.autoDash || this.runToggle)) return true;
    const pads = navigator.getGamepads?.() || [];
    for (const pad of pads) {
      if (!pad) continue;
      if (GAMEPAD_BUTTONS[action]?.some(index => pad.buttons[index]?.pressed)) return true;
      if (action === 'left' && (pad.buttons[14]?.pressed || pad.axes[0] < -AXIS_DEADZONE)) return true;
      if (action === 'right' && (pad.buttons[15]?.pressed || pad.axes[0] > AXIS_DEADZONE)) return true;
    }
    return false;
  }

  consume(action) {
    const value = this.pressed.has(action);
    this.pressed.delete(action);
    return value;
  }

  pollGamepad() {
    const pads = navigator.getGamepads?.() || [];
    const pad = Array.from(pads).find(Boolean);
    if (!pad) {
      this.previousGamepad.clear();
      return;
    }
    for (const [action, indexes] of Object.entries(GAMEPAD_BUTTONS)) {
      if (indexes.some(index => pad.buttons[index]?.pressed) &&
          !indexes.some(index => this.previousGamepad.has(index))) this.pressed.add(action);
    }
    if (pad.axes[0] < -AXIS_DEADZONE && !this.previousGamepad.has('left')) this.pressed.add('left');
    if (pad.axes[0] > AXIS_DEADZONE && !this.previousGamepad.has('right')) this.pressed.add('right');
    const start = pad.buttons[9]?.pressed;
    if (start && !this.gamepadPause) {
      window.dispatchEvent(new CustomEvent('game:command', { detail: { action: 'pause' } }));
    }
    this.gamepadPause = !!start;
    this.previousGamepad = new Set(pad.buttons.map((button, index) => button.pressed ? index : null).filter(index => index !== null));
    if (Math.abs(pad.axes[0]) > AXIS_DEADZONE) this.previousGamepad.add(pad.axes[0] < 0 ? 'left' : 'right');
    if (!this.active) this.pressed.clear();
  }

  update() {
    // Retained for embedders; attach() also polls so Start works while paused.
    this.pollGamepad();
  }

  clear() {
    this.keys.clear();
    this.virtual.clear();
    this.pressed.clear();
    this.previousVirtual.clear();
    this.previousGamepad.clear();
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    document.removeEventListener('visibilitychange', this._onBlur);
    if (this._pollFrame) cancelAnimationFrame(this._pollFrame);
    this.clear();
  }
}

/**
 * DOM shell for Super Wonder Bros.
 *
 * The Phaser game owns simulation, audio, saves, and settings persistence. This
 * module owns only the accessible interface and translates UI intent into
 * `game:command` events. It deliberately has no Phaser import so the shell can
 * be constructed and tested independently.
 */

const SETTINGS_STORAGE_KEY = 'super-wonder-bros:ui-settings:v1';

const DEFAULT_SETTINGS = Object.freeze({
    music: 0.28,
    sfx: 0.55,
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

const ICONS = Object.freeze({
    hero: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/></svg>',
    coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M14.5 8.5c-.7-.7-1.6-1-2.7-1-1.5 0-2.6.8-2.6 2s1 1.7 2.7 2.1c1.7.4 2.7 1.1 2.7 2.3s-1.2 2.1-2.8 2.1c-1.2 0-2.3-.4-3.1-1.2M12 6v12"/></svg>',
    seed: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 4.5C11 4 5.2 7.1 5.2 13.1c0 3.2 2.4 5.4 5.4 5.4 6 0 8.9-6.4 8.9-14Z"/><path d="M4 20c3-5 6.2-7.8 10.5-10.2"/></svg>',
    score: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/></svg>',
    timer: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M9 2h6M12 2v3"/></svg>',
    power: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2-8 12h6l-1 8 9-13h-6Z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.2c.8 1.4-.2 3-1.7 3h-.2a7.8 7.8 0 0 1-1.5 2.6l.1.3c.5 1.5-.6 3-2.1 3h-.3a7.8 7.8 0 0 1-3-.1l-.2.1c-1.5.5-3-.6-3-2.1v-.2A7.8 7.8 0 0 1 6 18.8h-.3c-1.5 0-2.5-1.4-2.1-2.8l.1-.3A7.8 7.8 0 0 1 3.2 12v-.3c0-1.5 1.4-2.5 2.8-2.1l.3.1A7.8 7.8 0 0 1 9 7.2v-.2c0-1.5 1.4-2.5 2.8-2.1l.3.1A7.8 7.8 0 0 1 15 3.3v.2c0 1.5 1.4 2.5 2.8 2.1l.3-.1c1.5-.5 3 .6 3 2.1v.3a7.8 7.8 0 0 1-.1 3l.1.2c.5 1.5-.6 3-2.1 3h-.3a7.8 7.8 0 0 1-2.3 1.9Z"/></svg>',
    fullscreen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/></svg>',
    exitFullscreen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h5V3M21 8h-5V3M16 21v-5h5M8 21v-5H3"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
    left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 9 7 7 7-7"/></svg>',
    jump: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 10 7-7 7 7M12 3v18"/></svg>',
    run: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 5 3 3 4 1M4 11l5-1 3-3M7 21l4-6-3-3 2-5M15 21l-2-6 4-3"/></svg>'
});

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function formatNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString() : '0';
}

function formatTime(milliseconds) {
    const total = Math.max(0, Math.floor(Number(milliseconds) || 0));
    const seconds = Math.floor(total / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function formatBestTime(value) {
    if (typeof value === 'number' || (typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value))) {
        return formatTime(Number(value));
    }
    if (value && typeof value === 'object') {
        if (value.elapsedMs != null) return formatTime(value.elapsedMs);
        if (value.time != null) return formatBestTime(value.time);
        if (value.best != null) return formatBestTime(value.best);
    }
    return value == null || value === '' ? '—' : String(value);
}

function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = String(text);
    return element;
}

function iconMarkup(name) {
    return ICONS[name] || ICONS.hero;
}

export class GameUI {
    constructor(game) {
        if (window.__wbLoadTimer) window.clearTimeout(window.__wbLoadTimer);
        document.querySelectorAll('.wb-load-failure').forEach(element => element.remove());
        if (window.gameUI && typeof window.gameUI.destroy === 'function') {
            window.gameUI.destroy();
        }

        this.game = game;
        this._container = document.getElementById('game-container');
        if (!this._container) {
            throw new Error('GameUI requires an existing #game-container element.');
        }

        this._destroyed = false;
        this._playing = false;
        this._launching = false;
        this._paused = false;
        this._settingsOpen = false;
        this._characters = [];
        this._selectedCharacterId = null;
        this._characterButtons = new Map();
        this._portraitNodes = new Map();
        this._artwork = new Map();
        this._input = null;
        this._pointers = new Map();
        this._runToggled = false;
        this._timers = new Set();
        this._eventController = typeof AbortController === 'function' ? new AbortController() : null;
        this._coarseQuery = typeof window.matchMedia === 'function'
            ? window.matchMedia('(pointer: coarse)')
            : null;
        this._motionQuery = typeof window.matchMedia === 'function'
            ? window.matchMedia('(prefers-reduced-motion: reduce)')
            : null;
        this._resizeFrame = 0;
        this._scaleFrame = 0;
        this._announcementFrame = 0;

        this._settings = this._readSettings();
        this._buildShell();
        this._applySettingsToDOM();
        this._bindEvents();
        this._updateTouchAvailability();
        this._fitStage();

        if (typeof ResizeObserver === 'function') {
            this._resizeObserver = new ResizeObserver(() => {
                this._fitStage();
                this._scheduleScaleRefresh();
            });
            this._resizeObserver.observe(this._stageArea);
        }

        window.gameUI = this;
        this.showLoading('Preparing the adventure…');
    }

    // ---------------------------------------------------------------------
    // Shell construction
    // ---------------------------------------------------------------------

    _buildShell() {
        const app = makeElement('div', 'wb-app');
        app.id = 'wb-app';
        app.innerHTML = `
            <header class="wb-appbar" aria-label="Game status and tools">
                <div class="wb-brand" aria-label="Super Wonder Bros">
                    <span class="wb-brand__mark" data-icon="hero" aria-hidden="true"></span>
                    <span class="wb-brand__copy">
                        <strong>SUPER WONDER BROS</strong>
                        <span>Five worlds. One big adventure.</span>
                    </span>
                </div>

                <div class="wb-hud" id="wb-hud" aria-label="Current game statistics" hidden>
                    <div class="wb-hud-item wb-hud-item--identity">
                        <span class="wb-hud__icon" data-icon="hero" aria-hidden="true"></span>
                        <span class="wb-hud__text">
                            <span class="wb-hud__label">Hero / Level</span>
                            <span class="wb-hud__value">
                                <span id="wb-hud-character">—</span>
                                <span class="wb-hud__divider" aria-hidden="true">/</span>
                                <span id="wb-hud-level">—</span>
                            </span>
                        </span>
                    </div>
                    <div class="wb-hud-item" id="wb-hud-coins-item">
                        <span class="wb-hud__icon wb-hud__icon--coin" data-icon="coin" aria-hidden="true"></span>
                        <span class="wb-hud__text">
                            <span class="wb-hud__label">Coins</span>
                            <span class="wb-hud__value" id="wb-hud-coins">0</span>
                        </span>
                    </div>
                    <div class="wb-hud-item" id="wb-hud-seeds-item">
                        <span class="wb-hud__icon wb-hud__icon--seed" data-icon="seed" aria-hidden="true"></span>
                        <span class="wb-hud__text">
                            <span class="wb-hud__label">Seeds</span>
                            <span class="wb-hud__value" id="wb-hud-seeds">0</span>
                        </span>
                    </div>
                    <div class="wb-hud-item">
                        <span class="wb-hud__icon" data-icon="score" aria-hidden="true"></span>
                        <span class="wb-hud__text">
                            <span class="wb-hud__label">Score</span>
                            <span class="wb-hud__value" id="wb-hud-score">0</span>
                        </span>
                    </div>
                    <div class="wb-hud-item wb-hud-item--lives">
                        <span class="wb-hud__hearts" id="wb-hud-lives" aria-label="0 lives">♡♡♡</span>
                        <span class="wb-hud__label">Lives</span>
                    </div>
                    <div class="wb-hud-item wb-hud-item--powerup" id="wb-hud-powerup-item" hidden>
                        <span class="wb-hud__icon" data-icon="power" aria-hidden="true"></span>
                        <span class="wb-hud__text">
                            <span class="wb-hud__label">Power-up</span>
                            <span class="wb-hud__value" id="wb-hud-powerup">None</span>
                        </span>
                    </div>
                    <div class="wb-hud-item wb-hud-item--timer">
                        <span class="wb-hud__icon" data-icon="timer" aria-hidden="true"></span>
                        <span class="wb-hud__text">
                            <span class="wb-hud__label">Time</span>
                            <span class="wb-hud__value" id="wb-hud-timer">00:00</span>
                        </span>
                    </div>
                    <button class="wb-icon-button wb-pause-button" id="wb-pause-button" type="button"
                        data-ui-command="pause" aria-label="Pause game" aria-pressed="false" title="Pause (P or Esc)">
                        <span data-icon="pause" aria-hidden="true"></span>
                    </button>
                </div>

                <div class="wb-tools" aria-label="Game tools">
                    <button class="wb-icon-button" id="wb-settings-button" type="button"
                        data-ui-command="settings" aria-label="Open settings" title="Settings">
                        <span data-icon="settings" aria-hidden="true"></span>
                    </button>
                    <button class="wb-icon-button" id="wb-fullscreen-button" type="button"
                        data-ui-command="fullscreen" aria-label="Enter fullscreen" aria-pressed="false" title="Enter fullscreen">
                        <span data-icon="fullscreen" aria-hidden="true"></span>
                    </button>
                </div>
            </header>

            <main class="wb-workspace" aria-label="Super Wonder Bros">
                <div class="wb-stage-area" id="wb-stage-area">
                    <div class="wb-stage-frame" id="wb-stage-frame">
                        <div class="wb-level-card" id="wb-level-card" aria-hidden="true" hidden>
                            <span class="wb-level-card__eyebrow">Now playing</span>
                            <strong id="wb-level-card-title">World 1</strong>
                            <span id="wb-level-card-subtitle"></span>
                        </div>
                        <div class="wb-checkpoint-banner" id="wb-checkpoint-banner" aria-hidden="true" hidden>
                            <span data-icon="check" aria-hidden="true"></span>
                            <span><strong>Checkpoint saved</strong><small>Your progress is safe.</small></span>
                        </div>
                    </div>
                </div>

                <section class="wb-menu-view" id="wb-menu-view" aria-labelledby="wb-menu-title" hidden>
                    <div class="wb-menu-inner">
                        <header class="wb-menu-header">
                            <p class="wb-eyebrow">Choose your hero</p>
                            <h1 id="wb-menu-title" tabindex="-1">SUPER WONDER BROS</h1>
                            <p class="wb-menu-subtitle">A five-world platform adventure</p>
                            <button class="wb-button wb-button--secondary wb-continue-button" id="wb-continue-button"
                                type="button" data-ui-command="continue" hidden>
                                Continue adventure <span data-icon="arrow" aria-hidden="true"></span>
                            </button>
                        </header>

                        <div class="wb-menu-actions">
                            <button class="wb-button wb-button--primary wb-button--large" id="wb-start-button"
                                type="button" data-ui-command="start">
                                Start Adventure <span data-icon="arrow" aria-hidden="true"></span>
                            </button>
                        </div>

                        <div class="wb-character-grid" id="wb-character-grid" role="group" aria-label="Select a character"></div>

                        <section class="wb-character-detail" id="wb-character-detail" aria-labelledby="wb-character-name">
                            <div class="wb-character-detail__identity">
                                <span class="wb-character-detail__swatch" id="wb-character-swatch" aria-hidden="true"></span>
                                <div>
                                    <p class="wb-eyebrow">Selected hero</p>
                                    <h2 id="wb-character-name">Choose a character</h2>
                                </div>
                            </div>
                            <p class="wb-character-detail__description" id="wb-character-description">Select a hero to see their abilities.</p>
                            <div class="wb-character-stats" id="wb-character-stats" aria-label="Character abilities"></div>
                        </section>

                        <section class="wb-control-legend" aria-labelledby="wb-legend-title">
                            <h2 id="wb-legend-title">Controls</h2>
                            <ul>
                                <li><kbd>Arrows</kbd><span>or</span><kbd>WASD</kbd><span>Move</span></li>
                                <li><kbd>Space</kbd><span>or</span><kbd>Z</kbd><span>Jump</span></li>
                                <li><kbd>X</kbd><span>or</span><kbd>F</kbd><span>Power</span></li>
                                <li><kbd>Shift</kbd><span>Dash</span></li>
                                <li><kbd>P</kbd><span>or</span><kbd>Esc</kbd><span>Pause</span></li>
                                <li><span class="wb-legend-gamepad" aria-hidden="true">◉</span><span>Gamepad supported</span></li>
                            </ul>
                        </section>
                    </div>
                </section>

                <div class="wb-touch-deck" id="wb-touch-deck" aria-label="Touch game controls" hidden>
                    <div class="wb-control-group wb-control-group--move" aria-label="Movement controls">
                        <button class="wb-control wb-control--left" type="button" data-touch-control="left" aria-label="Move left" disabled>
                            <span data-icon="left" aria-hidden="true"></span>
                        </button>
                        <button class="wb-control wb-control--down" type="button" data-touch-control="down" aria-label="Crouch or ground pound" disabled>
                            <span data-icon="down" aria-hidden="true"></span>
                        </button>
                        <button class="wb-control wb-control--right" type="button" data-touch-control="right" aria-label="Move right" disabled>
                            <span data-icon="right" aria-hidden="true"></span>
                        </button>
                    </div>
                    <div class="wb-control-group wb-control-group--actions" aria-label="Action controls">
                        <button class="wb-control wb-control--run" type="button" data-touch-control="run"
                            aria-label="Toggle run (auto dash)" aria-pressed="false" disabled>
                            <span data-icon="run" aria-hidden="true"></span>
                            <small>Dash</small>
                        </button>
                        <button class="wb-control wb-control--action" type="button" data-touch-control="action" aria-label="Use power" disabled>
                            <span data-icon="power" aria-hidden="true"></span>
                            <small>Power</small>
                        </button>
                        <button class="wb-control wb-control--jump" type="button" data-touch-control="jump" aria-label="Jump" disabled>
                            <span data-icon="jump" aria-hidden="true"></span>
                            <small>Jump</small>
                        </button>
                    </div>
                </div>

                <section class="wb-loading-view" id="wb-loading-view" aria-labelledby="wb-loading-title">
                    <div class="wb-loading-card">
                        <div class="wb-loading-emblem" aria-hidden="true"><span data-icon="hero"></span></div>
                        <p class="wb-eyebrow">Get ready</p>
                        <h2 id="wb-loading-title">Loading Super Wonder Bros</h2>
                        <p class="wb-loading-message" id="wb-loading-message">Preparing the adventure…</p>
                        <progress class="wb-progress" id="wb-loading-progress" max="100" aria-label="Game loading progress"></progress>
                        <p class="wb-loading-hint">Tip: hold Shift while moving to dash.</p>
                    </div>
                </section>

                <section class="wb-fatal-view" id="wb-fatal-view" aria-labelledby="wb-fatal-title" hidden>
                    <div class="wb-fatal-card">
                        <span class="wb-fatal-symbol" aria-hidden="true">!</span>
                        <p class="wb-eyebrow">Something went wrong</p>
                        <h2 id="wb-fatal-title">The game could not start</h2>
                        <p id="wb-fatal-message">An unexpected error interrupted the adventure.</p>
                        <div class="wb-dialog-actions">
                            <button class="wb-button wb-button--primary" id="wb-reload-button" type="button">Reload game</button>
                        </div>
                    </div>
                </section>

                <div class="wb-toast" id="wb-toast" data-kind="info" aria-hidden="true" hidden>
                    <span class="wb-toast__symbol" aria-hidden="true">i</span>
                    <span id="wb-toast-text"></span>
                </div>
            </main>

            <div class="wb-sr-only" id="wb-announcer" role="status" aria-live="polite" aria-atomic="true"></div>
        `;

        this._container.replaceWith(app);
        this._app = app;
        this._stageArea = document.getElementById('wb-stage-area');
        this._stageFrame = document.getElementById('wb-stage-frame');
        this._stageFrame.prepend(this._container);
        this._hydrateIcons(app);

        this._hud = document.getElementById('wb-hud');
        this._pauseButton = document.getElementById('wb-pause-button');
        this._fullscreenButton = document.getElementById('wb-fullscreen-button');
        this._menuView = document.getElementById('wb-menu-view');
        this._characterGrid = document.getElementById('wb-character-grid');
        this._continueButton = document.getElementById('wb-continue-button');
        this._startButton = document.getElementById('wb-start-button');
        this._loadingView = document.getElementById('wb-loading-view');
        this._loadingMessage = document.getElementById('wb-loading-message');
        this._loadingProgress = document.getElementById('wb-loading-progress');
        this._fatalView = document.getElementById('wb-fatal-view');
        this._fatalMessage = document.getElementById('wb-fatal-message');
        this._toast = document.getElementById('wb-toast');
        this._toastText = document.getElementById('wb-toast-text');
        this._levelCard = document.getElementById('wb-level-card');
        this._levelCardTitle = document.getElementById('wb-level-card-title');
        this._levelCardSubtitle = document.getElementById('wb-level-card-subtitle');
        this._checkpointBanner = document.getElementById('wb-checkpoint-banner');
        this._touchDeck = document.getElementById('wb-touch-deck');
        this._announcer = document.getElementById('wb-announcer');

        this._buildDialogs();
    }

    _buildDialogs() {
        const fragment = document.createDocumentFragment();

        const pause = makeElement('dialog', 'wb-dialog wb-pause-dialog');
        pause.id = 'wb-pause-dialog';
        pause.setAttribute('aria-labelledby', 'wb-pause-title');
        pause.innerHTML = `
            <div class="wb-dialog__header">
                <div>
                    <p class="wb-eyebrow">Take a breather</p>
                    <h2 id="wb-pause-title">Game paused</h2>
                </div>
                <button class="wb-icon-button" type="button" data-dialog-close="pause" aria-label="Close pause menu">
                    <span data-icon="close" aria-hidden="true"></span>
                </button>
            </div>
            <p class="wb-dialog__intro">Your adventure will be right here when you are ready.</p>
            <div class="wb-pause-actions">
                <button class="wb-button wb-button--primary" type="button" data-ui-command="resume">
                    Resume <span data-icon="arrow" aria-hidden="true"></span>
                </button>
                <button class="wb-button wb-button--secondary" type="button" data-ui-command="restartCheckpoint">Restart checkpoint</button>
                <button class="wb-button wb-button--secondary" type="button" data-ui-command="settings">Settings</button>
                <button class="wb-button wb-button--ghost" type="button" data-ui-command="menu">Character select</button>
            </div>
        `;
        fragment.append(pause);
        this._pauseDialog = pause;

        const settings = makeElement('dialog', 'wb-dialog wb-settings-dialog');
        settings.id = 'wb-settings-dialog';
        settings.setAttribute('aria-labelledby', 'wb-settings-title');
        settings.innerHTML = `
            <div class="wb-dialog__header">
                <div>
                    <p class="wb-eyebrow">Make it yours</p>
                    <h2 id="wb-settings-title">Settings</h2>
                </div>
                <button class="wb-icon-button" type="button" data-dialog-close="settings" aria-label="Close settings">
                    <span data-icon="close" aria-hidden="true"></span>
                </button>
            </div>
            <p class="wb-dialog__intro">Changes apply immediately and save automatically.</p>

            <div class="wb-settings-section">
                <h3>Audio</h3>
                <div class="wb-setting-row wb-setting-row--range">
                    <label for="wb-setting-music">Music</label>
                    <input id="wb-setting-music" type="range" min="0" max="100" step="1" data-setting="music">
                    <output id="wb-setting-music-output" for="wb-setting-music">65%</output>
                </div>
                <div class="wb-setting-row wb-setting-row--range">
                    <label for="wb-setting-sfx">Sound effects</label>
                    <input id="wb-setting-sfx" type="range" min="0" max="100" step="1" data-setting="sfx">
                    <output id="wb-setting-sfx-output" for="wb-setting-sfx">80%</output>
                </div>
                <div class="wb-setting-row">
                    <div><label for="wb-setting-muted">Mute all audio</label><small>Silence music and sound effects.</small></div>
                    <input class="wb-toggle" id="wb-setting-muted" type="checkbox" role="switch" data-setting="muted">
                </div>
            </div>

            <div class="wb-settings-section">
                <h3>Display &amp; comfort</h3>
                <div class="wb-setting-row">
                    <div><label for="wb-setting-reduced-motion">Reduced motion</label><small>Limit interface animation and movement effects.</small></div>
                    <input class="wb-toggle" id="wb-setting-reduced-motion" type="checkbox" role="switch" data-setting="reducedMotion">
                </div>
                <div class="wb-setting-row">
                    <div><label for="wb-setting-screen-shake">Screen shake</label><small>Camera feedback during impacts.</small></div>
                    <input class="wb-toggle" id="wb-setting-screen-shake" type="checkbox" role="switch" data-setting="screenShake">
                </div>
                <div class="wb-setting-row">
                    <div><label for="wb-setting-high-contrast">High contrast</label><small>Stronger borders, text, and focus indicators.</small></div>
                    <input class="wb-toggle" id="wb-setting-high-contrast" type="checkbox" role="switch" data-setting="highContrast">
                </div>
                <div class="wb-setting-row">
                    <div><label for="wb-setting-assist">Assist mode</label><small>Adds two extra hearts and gives every hero a second jump.</small></div>
                    <input class="wb-toggle" id="wb-setting-assist" type="checkbox" role="switch" data-setting="assistMode">
                </div>
            </div>

            <div class="wb-settings-section">
                <h3>Touch controls</h3>
                <div class="wb-setting-row">
                    <label for="wb-setting-touch">Show touch controls</label>
                    <select id="wb-setting-touch" data-setting="showTouch">
                        <option value="auto">Auto</option>
                        <option value="on">On</option>
                        <option value="off">Off</option>
                    </select>
                </div>
                <div class="wb-setting-row">
                    <label for="wb-setting-control-size">Control size</label>
                    <select id="wb-setting-control-size" data-setting="controlSize">
                        <option value="comfortable">Comfortable</option>
                        <option value="large">Large</option>
                    </select>
                </div>
                <div class="wb-setting-row">
                    <label for="wb-setting-handedness">Handedness</label>
                    <select id="wb-setting-handedness" data-setting="handedness">
                        <option value="right">Right</option>
                        <option value="left">Left</option>
                    </select>
                </div>
                <div class="wb-setting-row">
                    <div><label for="wb-setting-auto-dash">Auto dash</label><small>Dash automatically while moving.</small></div>
                    <input class="wb-toggle" id="wb-setting-auto-dash" type="checkbox" role="switch" data-setting="autoDash">
                </div>
            </div>

            <div class="wb-settings-footer">
                <button class="wb-button wb-button--ghost" id="wb-reset-settings" type="button">Reset settings</button>
                <button class="wb-button wb-button--secondary" type="button" data-dialog-close="settings">Done</button>
            </div>
        `;
        fragment.append(settings);
        this._settingsDialog = settings;

        const gameOver = makeElement('dialog', 'wb-dialog wb-results-dialog');
        gameOver.id = 'wb-gameover-dialog';
        gameOver.setAttribute('aria-labelledby', 'wb-gameover-title');
        gameOver.innerHTML = `
            <div class="wb-results-emblem wb-results-emblem--over" aria-hidden="true">!</div>
            <p class="wb-eyebrow">Not the end of the story</p>
            <h2 id="wb-gameover-title">Game over</h2>
            <p class="wb-dialog__intro">Every great adventure takes another try.</p>
            <dl class="wb-results-stats">
                <div><dt>Score</dt><dd id="wb-gameover-score">0</dd></div>
                <div><dt>High score</dt><dd id="wb-gameover-high-score">0</dd></div>
            </dl>
            <div class="wb-dialog-actions">
                <button class="wb-button wb-button--primary" type="button" data-ui-command="retryLevel">Retry level</button>
                <button class="wb-button wb-button--secondary" type="button" data-ui-command="menu">Character select</button>
            </div>
        `;
        fragment.append(gameOver);
        this._gameOverDialog = gameOver;

        const victory = makeElement('dialog', 'wb-dialog wb-results-dialog wb-victory-dialog');
        victory.id = 'wb-victory-dialog';
        victory.setAttribute('aria-labelledby', 'wb-victory-title');
        victory.innerHTML = `
            <div class="wb-results-emblem wb-results-emblem--victory" aria-hidden="true"><span data-icon="check"></span></div>
            <p class="wb-eyebrow">Five worlds conquered</p>
            <h2 id="wb-victory-title">Adventure complete!</h2>
            <p class="wb-dialog__intro">Super work, hero. The kingdom is cheering for you.</p>
            <dl class="wb-results-stats wb-results-stats--four">
                <div><dt>Score</dt><dd id="wb-victory-score">0</dd></div>
                <div><dt>Coins</dt><dd id="wb-victory-coins">0</dd></div>
                <div><dt>Seeds</dt><dd id="wb-victory-seeds">0</dd></div>
                <div><dt>Time</dt><dd id="wb-victory-time">00:00</dd></div>
            </dl>
            <section class="wb-best-times" aria-labelledby="wb-best-times-title">
                <h3 id="wb-best-times-title">Best times</h3>
                <ul id="wb-best-times-list"></ul>
            </section>
            <div class="wb-dialog-actions">
                <button class="wb-button wb-button--primary" type="button" data-ui-command="replay">Play again</button>
                <button class="wb-button wb-button--secondary" type="button" data-ui-command="menu">Character select</button>
            </div>
        `;
        fragment.append(victory);
        this._victoryDialog = victory;

        document.body.append(fragment);
        this._hydrateIcons(fragment);
    }

    _hydrateIcons(root) {
        root.querySelectorAll('[data-icon]').forEach((placeholder) => {
            placeholder.innerHTML = iconMarkup(placeholder.dataset.icon);
        });
    }

    // ---------------------------------------------------------------------
    // Public game-facing API
    // ---------------------------------------------------------------------

    showLoading(message = 'Loading the next part of the adventure…') {
        this._closeAllDialogs();
        this._clearTimer('_levelCardTimer');
        this._levelCard.hidden = true;
        this._setPlayingView(false);
        this._hud.hidden = true;
        this._menuView.hidden = true;
        this._fatalView.hidden = true;
        this._loadingView.hidden = false;
        this._setLoadingMessage(message);
        this._announce(message);
    }

    hideLoading() {
        this._loadingView.hidden = true;
    }

    /** Optional convenience for games that have incremental asset progress. */
    setLoadingProgress(value, message) {
        if (value == null || !Number.isFinite(Number(value))) {
            this._loadingProgress.removeAttribute('value');
        } else {
            this._loadingProgress.value = clamp(Number(value), 0, 100);
        }
        if (message) this._setLoadingMessage(message);
    }

    showCharacterSelect(characters) {
        this._launching = false;
        if (Array.isArray(characters)) {
            this._characters = characters.filter((character) => character && character.id != null);
        }

        this._closeAllDialogs();
        this._releaseAllPointers();
        this._setPlayingView(false);
        this._hud.hidden = true;
        this._loadingView.hidden = true;
        this._fatalView.hidden = true;
        this._levelCard.hidden = true;
        this._checkpointBanner.hidden = true;
        const wasHidden = this._menuView.hidden;
        this._menuView.hidden = false;

        this._renderCharacters();
        this._refreshContinueButton();

        if (wasHidden) {
            requestAnimationFrame(() => {
                if (!this._destroyed && !this._menuView.hidden) {
                    document.getElementById('wb-menu-title')?.focus({ preventScroll: true });
                }
            });
        }
    }

    selectCharacter(id) {
        const character = this._characters.find((item) => String(item.id) === String(id));
        if (!character) return false;

        this._selectedCharacterId = character.id;
        this._characterButtons.forEach((button, buttonId) => {
            const selected = String(buttonId) === String(character.id);
            button.classList.toggle('is-selected', selected);
            button.setAttribute('aria-pressed', String(selected));
            const badge = button.querySelector('.wb-character-card__selected');
            if (badge) badge.hidden = !selected;
        });
        this._renderCharacterDetail(character);
        return true;
    }

    showGame({ character, levelName } = {}) {
        this._launching = false;
        this._closeAllDialogs();
        this._releaseAllPointers();
        this._loadingView.hidden = true;
        this._fatalView.hidden = true;
        this._menuView.hidden = true;
        this._levelCard.hidden = true;
        this._checkpointBanner.hidden = true;
        this._hud.hidden = false;
        this._paused = false;
        this._pauseButton.setAttribute('aria-pressed', 'false');
        this._setRunState(this._settings.autoDash || Boolean(window.gameInput?.runToggle));
        this._setPlayingView(true);

        const details = typeof character === 'object' && character !== null
            ? character
            : this._characters.find((item) => String(item.id) === String(character));
        document.getElementById('wb-hud-character').textContent = details?.name || character || 'Hero';
        document.getElementById('wb-hud-level').textContent = levelName || 'World 1';
        this._scheduleScaleRefresh();
    }

    updateHUD({ score, coins, seeds, lives, maxLives, level, levelName, powerup, elapsedMs } = {}) {
        if (score != null) document.getElementById('wb-hud-score').textContent = formatNumber(score);
        if (coins != null) document.getElementById('wb-hud-coins').textContent = formatNumber(coins);
        if (seeds != null) document.getElementById('wb-hud-seeds').textContent = formatNumber(seeds);
        if (level != null) document.getElementById('wb-hud-level').textContent = String(level);
        if (levelName != null) document.getElementById('wb-hud-level').textContent = String(levelName);
        if (elapsedMs != null) document.getElementById('wb-hud-timer').textContent = formatTime(elapsedMs);

        if (lives != null || maxLives != null) {
            const currentLives = Math.max(0, Math.floor(Number(lives ?? this._lastLives) || 0));
            const totalLives = Math.max(currentLives, Math.floor(Number(maxLives ?? this._lastMaxLives) || 3));
            this._lastLives = currentLives;
            this._lastMaxLives = totalLives;
            this._renderLives(currentLives, totalLives);
        }

        if (powerup !== undefined) {
            const item = document.getElementById('wb-hud-powerup-item');
            const value = document.getElementById('wb-hud-powerup');
            const name = typeof powerup === 'string'
                ? powerup
                : powerup?.name || powerup?.type || '';
            item.hidden = !name || name === 'None';
            value.textContent = name || 'None';
        }
    }

    showToast(text, kind = 'info', duration = 3000) {
        const normalizedKind = { hint: 'info', checkpoint: 'success', powerup: 'warning' }[kind] || kind;
        const safeKind = ['info', 'success', 'error', 'warning'].includes(normalizedKind) ? normalizedKind : 'info';
        this._clearTimer('_toastTimer');
        this._toast.dataset.kind = safeKind;
        this._toast.querySelector('.wb-toast__symbol').textContent = {
            info: 'i',
            success: '✓',
            error: '!',
            warning: '!'
        }[safeKind];
        this._toastText.textContent = String(text || '');
        this._toast.hidden = false;
        this._announce(text);
        this._later('_toastTimer', () => {
            this._toast.hidden = true;
        }, Math.max(700, Number(duration) || 3000));
    }

    showLevelCard(title, subtitle = '') {
        this._clearTimer('_levelCardTimer');
        this._levelCardTitle.textContent = String(title || '');
        this._levelCardSubtitle.textContent = String(subtitle || '');
        this._levelCardSubtitle.hidden = !subtitle;
        this._levelCard.hidden = false;
        this._announce(subtitle ? `${title}. ${subtitle}` : title);
        this._later('_levelCardTimer', () => {
            this._levelCard.hidden = true;
        }, 2600);
    }

    setPaused(paused) {
        this._paused = Boolean(paused);
        this._pauseButton.setAttribute('aria-pressed', String(this._paused));
        if (this._paused) {
            this._releaseAllPointers();
            this._showDialog(this._pauseDialog);
        } else {
            this._closeDialog(this._pauseDialog);
        }
    }

    showGameOver({ score = 0, highScore = score } = {}) {
        this._closeAllDialogs();
        this._releaseAllPointers();
        this._loadingView.hidden = true;
        this._menuView.hidden = true;
        this._fatalView.hidden = true;
        this._hud.hidden = false;
        this._setPlayingView(true);
        document.getElementById('wb-gameover-score').textContent = formatNumber(score);
        document.getElementById('wb-gameover-high-score').textContent = formatNumber(highScore);
        this._showDialog(this._gameOverDialog);
        this._announce(`Game over. Score ${formatNumber(score)}. High score ${formatNumber(highScore)}.`);
    }

    showVictory({ score = 0, coins = 0, seeds = 0, elapsedMs = 0, bestTimes } = {}) {
        this._closeAllDialogs();
        this._releaseAllPointers();
        this._loadingView.hidden = true;
        this._menuView.hidden = true;
        this._fatalView.hidden = true;
        this._hud.hidden = false;
        this._setPlayingView(true);
        document.getElementById('wb-victory-score').textContent = formatNumber(score);
        document.getElementById('wb-victory-coins').textContent = formatNumber(coins);
        document.getElementById('wb-victory-seeds').textContent = formatNumber(seeds);
        document.getElementById('wb-victory-time').textContent = formatTime(elapsedMs);
        this._renderBestTimes(bestTimes);
        this._showDialog(this._victoryDialog);
        this._announce(`Adventure complete! Score ${formatNumber(score)}. ${formatNumber(coins)} coins and ${formatNumber(seeds)} seeds collected.`);
    }

    showCheckpoint() {
        this._clearTimer('_checkpointTimer');
        this._checkpointBanner.hidden = false;
        this._announce('Checkpoint saved. Your progress is safe.');
        this._later('_checkpointTimer', () => {
            this._checkpointBanner.hidden = true;
        }, 2800);
    }

    /** Apply settings supplied by the game without echoing a command back. */
    applySettings(settings = {}) {
        this._mergeSettings(settings);
    }

    getSettings() {
        return { ...this._settings };
    }

    /** Compatibility alias used by the boot scene. */
    get characters() {
        return this._characters;
    }

    /** Useful for boot failures and for the game's `game:error` event. */
    showFatalError(error) {
        let message = 'An unexpected error interrupted the adventure.';
        if (typeof error === 'string') {
            message = error;
        } else if (error?.detail !== undefined) {
            message = this._errorMessage(error.detail);
        } else if (error?.message) {
            message = error.message;
        } else if (error?.reason) {
            message = this._errorMessage(error.reason);
        }
        this._loadingView.hidden = true;
        this._menuView.hidden = true;
        this._fatalView.hidden = false;
        this._closeAllDialogs();
        this._setPlayingView(false);
        this._hud.hidden = true;
        this._fatalMessage.textContent = message;
        this._announce(`The game could not start. ${message}`);
    }

    showError(error) {
        this.showFatalError(error);
    }

    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        this._releaseAllPointers();
        this._eventController?.abort();
        this._legacyListeners?.forEach(({ target, type, handler, options }) => {
            target.removeEventListener(type, handler, options);
        });
        this._legacyListeners = [];
        this._resizeObserver?.disconnect();
        if (this._coarseQuery) {
            this._coarseQuery.removeEventListener?.('change', this._onCoarsePointerChange);
        }
        if (this._motionQuery) {
            this._motionQuery.removeEventListener?.('change', this._onMotionPreferenceChange);
        }
        window.removeEventListener('resize', this._onWindowResize);
        window.removeEventListener('blur', this._onWindowBlur);
        window.removeEventListener('pointerup', this._onGlobalPointerEnd);
        window.removeEventListener('pointercancel', this._onGlobalPointerEnd);
        document.removeEventListener('visibilitychange', this._onVisibilityChange);
        document.removeEventListener('fullscreenchange', this._onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', this._onFullscreenChange);

        this._timers.forEach((timer) => window.clearTimeout(timer));
        this._timers.clear();
        if (this._resizeFrame) cancelAnimationFrame(this._resizeFrame);
        if (this._scaleFrame) cancelAnimationFrame(this._scaleFrame);
        if (this._announcementFrame) cancelAnimationFrame(this._announcementFrame);

        this._closeAllDialogs();
        [this._pauseDialog, this._settingsDialog, this._gameOverDialog, this._victoryDialog].forEach((dialog) => dialog.remove());
        document.documentElement.classList.remove('reduce-motion', 'high-contrast');
        document.body.classList.remove('is-playing');

        if (this._app.parentNode) {
            // Replace the shell even though the mount is nested in the stage;
            // replaceWith moves the original container (and its canvas) back.
            this._app.replaceWith(this._container);
        } else {
            this._app.remove();
        }
        if (window.gameUI === this) delete window.gameUI;
    }

    // ---------------------------------------------------------------------
    // Characters and results
    // ---------------------------------------------------------------------

    _renderCharacters() {
        const validSelection = this._characters.some((character) => String(character.id) === String(this._selectedCharacterId));
        if (!validSelection) this._selectedCharacterId = this._characters[0]?.id ?? null;

        this._characterGrid.replaceChildren();
        this._characterButtons.clear();
        this._portraitNodes.clear();

        this._characters.forEach((character, index) => {
            const id = String(character.id);
            const name = String(character.name || `Hero ${index + 1}`);
            const description = String(character.description || 'Ready for a new adventure.');
            const button = makeElement('button', 'wb-character-card');
            button.type = 'button';
            button.dataset.characterId = id;
            button.style.setProperty('--character-color', String(character.color || '#55d6be'));
            button.setAttribute('aria-pressed', String(id === String(this._selectedCharacterId)));

            const portrait = makeElement('span', 'wb-character-card__portrait');
            portrait.setAttribute('aria-hidden', 'true');
            const placeholder = makeElement('span', 'wb-character-card__placeholder', this._initials(name));
            const image = document.createElement('img');
            image.alt = `${name} portrait`;
            image.loading = 'lazy';
            image.decoding = 'async';
            image.hidden = true;
            image.addEventListener('error', () => {
                image.hidden = true;
                placeholder.hidden = false;
            });
            portrait.append(placeholder, image);

            const copy = makeElement('span', 'wb-character-card__copy');
            copy.append(
                makeElement('strong', 'wb-character-card__name', name),
                makeElement('span', 'wb-character-card__description', description)
            );

            const selected = makeElement('span', 'wb-character-card__selected');
            selected.hidden = id !== String(this._selectedCharacterId);
            selected.innerHTML = '<span data-icon="check" aria-hidden="true"></span><span>Selected</span>';
            this._hydrateIcons(selected);

            button.append(portrait, copy, selected);
            this._characterGrid.append(button);
            this._characterButtons.set(character.id, button);
            this._portraitNodes.set(character.id, { image, placeholder });

            const artwork = this._artwork.get(character.id) || this._artwork.get(id);
            if (artwork) this._setPortrait(character.id, artwork);
        });

        this._startButton.disabled = !this._characters.length;
        if (!this._characters.length) {
            document.getElementById('wb-character-name').textContent = 'No heroes available';
            document.getElementById('wb-character-description').textContent = 'The character list is still being prepared.';
            document.getElementById('wb-character-stats').replaceChildren();
            return;
        }
        this.selectCharacter(this._selectedCharacterId);
    }

    _renderCharacterDetail(character) {
        document.getElementById('wb-character-name').textContent = String(character.name || 'Hero');
        document.getElementById('wb-character-description').textContent = String(character.description || 'Ready for a new adventure.');
        document.getElementById('wb-character-swatch').style.background = String(character.color || '#55d6be');

        const stats = character.stats || {};
        const labels = { speed: 'Speed', jump: 'Jump', handling: 'Handling' };
        const values = this._characters.map((item) => item.stats || {});
        const container = document.getElementById('wb-character-stats');
        container.replaceChildren();

        Object.entries(labels).forEach(([key, label]) => {
            const raw = Number(stats[key]);
            const value = Number.isFinite(raw) ? raw : 0;
            const observedMax = Math.max(0, ...values.map((item) => Number(item[key]) || 0));
            const scale = observedMax > 0 && observedMax <= 1 ? 1 : Math.max(5, observedMax);
            const row = makeElement('div', 'wb-stat');
            const heading = makeElement('div', 'wb-stat__heading');
            const track = makeElement('div', 'wb-stat__track');
            track.setAttribute('aria-hidden', 'true');
            const fill = makeElement('span', 'wb-stat__fill');
            fill.style.width = `${clamp((value / scale) * 100, 0, 100)}%`;
            track.append(fill);
            heading.append(makeElement('span', 'wb-stat__label', label), makeElement('span', 'wb-stat__value', `${value} / ${scale}`));
            row.append(heading, track);
            container.append(row);
        });
    }

    _setPortrait(id, dataUrl) {
        const nodes = this._portraitNodes.get(id);
        if (!nodes) return;
        // The image starts hidden, so lazy loading can leave it unloaded forever.
        // Artwork supplied by the game is already local and should load eagerly.
        nodes.image.loading = 'eager';
        nodes.image.onload = () => {
            nodes.image.hidden = false;
            nodes.placeholder.hidden = true;
        };
        nodes.image.onerror = () => {
            nodes.image.hidden = true;
            nodes.placeholder.hidden = false;
        };
        nodes.image.src = dataUrl;
        if (nodes.image.complete && nodes.image.naturalWidth > 0) {
            nodes.image.hidden = false;
            nodes.placeholder.hidden = true;
        }
    }

    _renderBestTimes(bestTimes) {
        const list = document.getElementById('wb-best-times-list');
        list.replaceChildren();
        let entries = [];
        if (Array.isArray(bestTimes)) {
            entries = bestTimes.map((entry) => {
                if (Array.isArray(entry)) return [entry[0], entry[1]];
                return [entry?.levelName || entry?.level || entry?.name || 'Level', entry?.elapsedMs ?? entry?.time ?? entry?.best ?? entry];
            });
        } else if (bestTimes && typeof bestTimes === 'object') {
            entries = Object.entries(bestTimes);
        }

        if (!entries.length) {
            list.append(makeElement('li', 'wb-best-times__empty', 'No best times yet.'));
            return;
        }

        entries.forEach(([label, value]) => {
            const item = makeElement('li');
            const level = typeof label === 'number' || /^\d+$/.test(String(label)) ? `Level ${label}` : String(label);
            item.append(makeElement('span', '', level), makeElement('strong', '', formatBestTime(value)));
            list.append(item);
        });
    }

    _initials(name) {
        return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
    }

    // ---------------------------------------------------------------------
    // Commands and dialogs
    // ---------------------------------------------------------------------

    _dispatch(action, payload = {}) {
        if (['start', 'continue', 'restartCheckpoint', 'retryLevel', 'replay'].includes(action)) {
            if (this._launching) return;
            this._launching = true;
        }
        window.dispatchEvent(new CustomEvent('game:command', {
            detail: { action, payload }
        }));
    }

    _handleCommand(action) {
        switch (action) {
            case 'start':
                if (this._selectedCharacterId != null) {
                    this._dispatch('start', { character: this._selectedCharacterId });
                } else {
                    this.showToast('Choose a character to start your adventure.', 'warning');
                }
                break;
            case 'continue':
                this._dispatch('continue');
                break;
            case 'pause':
                if (!this._paused) this._dispatch('pause');
                break;
            case 'resume':
                this._closeDialog(this._pauseDialog);
                this._paused = false;
                this._pauseButton.setAttribute('aria-pressed', 'false');
                this._dispatch('resume');
                break;
            case 'restartCheckpoint':
                this._closeDialog(this._pauseDialog);
                this._paused = false;
                this._pauseButton.setAttribute('aria-pressed', 'false');
                this._dispatch('restartCheckpoint');
                break;
            case 'retryLevel':
                this._closeAllDialogs();
                this._dispatch('retryLevel');
                break;
            case 'replay':
                this._closeAllDialogs();
                this._dispatch('replay');
                break;
            case 'menu':
                this._closeAllDialogs();
                this._dispatch('menu');
                break;
            case 'settings':
                this._openSettings();
                break;
            case 'fullscreen':
                this._toggleFullscreen();
                break;
            default:
                break;
        }
    }

    _openSettings() {
        if (this._playing && !this._paused) {
            // The shell owns the modal; the game only needs one pause command.
            this.setPaused(true);
            this._dispatch('pause');
        }
        this._syncSettingsControls();
        this._dispatch('settings');
        this._showDialog(this._settingsDialog);
    }

    _showDialog(dialog) {
        if (!dialog || dialog.open) return;
        try {
            if (typeof dialog.showModal === 'function') {
                dialog.showModal();
            } else {
                dialog.setAttribute('open', '');
                dialog.querySelector('button, input, select')?.focus();
            }
        } catch (error) {
            // An already-open non-modal dialog can reject showModal in older engines.
            dialog.setAttribute('open', '');
            dialog.querySelector('button, input, select')?.focus();
        }
        if (dialog === this._settingsDialog) this._settingsOpen = true;
        this._updateTouchAvailability();
    }

    _closeDialog(dialog) {
        if (!dialog) return;
        if (dialog.open) {
            if (typeof dialog.close === 'function') dialog.close();
            else dialog.removeAttribute('open');
        }
        if (dialog === this._settingsDialog) this._settingsOpen = false;
        this._updateTouchAvailability();
    }

    _closeAllDialogs() {
        this._closeDialog(this._pauseDialog);
        this._closeDialog(this._settingsDialog);
        this._closeDialog(this._gameOverDialog);
        this._closeDialog(this._victoryDialog);
        this._paused = false;
        this._settingsOpen = false;
        this._pauseButton.setAttribute('aria-pressed', 'false');
    }

    _refreshContinueButton() {
        let canContinue = false;
        try {
            canContinue = typeof window.gameSave?.hasContinue === 'function' && Boolean(window.gameSave.hasContinue());
        } catch (error) {
            canContinue = false;
        }
        this._continueButton.hidden = !canContinue;
    }

    _toggleFullscreen() {
        // Fullscreen is a game command, like pause and restart. The command
        // handler owns the browser request/rejection; this shell tracks the
        // resulting fullscreenchange state and handles unsupported browsers.
        this._dispatch('fullscreen');
        const request = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
        if (!request) this.showToast('Fullscreen is not available in this browser.', 'error');
    }

    _isFullscreen() {
        return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    }

    _updateFullscreenButton() {
        const active = this._isFullscreen();
        const label = active ? 'Exit fullscreen' : 'Enter fullscreen';
        this._fullscreenButton.setAttribute('aria-label', label);
        this._fullscreenButton.setAttribute('aria-pressed', String(active));
        this._fullscreenButton.title = label;
        const placeholder = this._fullscreenButton.querySelector('[data-icon]');
        if (placeholder) {
            placeholder.dataset.icon = active ? 'exitFullscreen' : 'fullscreen';
            placeholder.innerHTML = iconMarkup(placeholder.dataset.icon);
        }
    }

    // ---------------------------------------------------------------------
    // Settings
    // ---------------------------------------------------------------------

    _readSettings() {
        let stored = {};
        try {
            stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}') || {};
        } catch (error) {
            stored = {};
        }
        const external = window.gameSettings && typeof window.gameSettings === 'object' ? { ...window.gameSettings } : {};
        const aliases = {
            musicVolume: 'music',
            sfxVolume: 'sfx',
            touchControls: 'showTouch',
            assist: 'assistMode'
        };
        Object.entries(aliases).forEach(([source, target]) => {
            if (external[target] == null && external[source] != null) external[target] = external[source];
        });
        const merged = { ...DEFAULT_SETTINGS, ...stored, ...external };
        if (stored.reducedMotion == null && external.reducedMotion == null) {
            merged.reducedMotion = Boolean(this._motionQuery?.matches);
        }
        return this._normalizeSettings(merged);
    }

    _normalizeSettings(settings) {
        const source = { ...settings };
        if (source.music == null && source.musicVolume != null) source.music = source.musicVolume;
        if (source.sfx == null && source.sfxVolume != null) source.sfx = source.sfxVolume;
        if (source.showTouch == null && source.touchControls != null) source.showTouch = source.touchControls;
        if (source.assistMode == null && source.assist != null) source.assistMode = source.assist;
        const normalized = { ...DEFAULT_SETTINGS };
        Object.keys(DEFAULT_SETTINGS).forEach((key) => {
            if (source[key] !== undefined) normalized[key] = source[key];
        });
        ['music', 'sfx'].forEach((key) => {
            let value = Number(normalized[key]);
            if (!Number.isFinite(value)) value = DEFAULT_SETTINGS[key];
            if (value > 1) value /= 100;
            normalized[key] = clamp(value, 0, 1);
        });
        ['muted', 'reducedMotion', 'screenShake', 'highContrast', 'assistMode', 'autoDash'].forEach((key) => {
            normalized[key] = normalized[key] === true || normalized[key] === 'true';
        });
        if (normalized.showTouch === true) normalized.showTouch = 'on';
        if (normalized.showTouch === false) normalized.showTouch = 'off';
        normalized.showTouch = ['auto', 'on', 'off'].includes(normalized.showTouch) ? normalized.showTouch : 'auto';
        normalized.controlSize = normalized.controlSize === 'large' ? 'large' : 'comfortable';
        normalized.handedness = normalized.handedness === 'left' ? 'left' : 'right';
        return normalized;
    }

    _mergeSettings(patch) {
        const next = this._normalizeSettings({ ...this._settings, ...patch });
        const changed = {};
        Object.keys(DEFAULT_SETTINGS).forEach((key) => {
            if (next[key] !== this._settings[key]) changed[key] = next[key];
        });
        this._settings = next;
        this._applySettingsToDOM();
        this._persistSettings();
        return changed;
    }

    _changeSettings(patch) {
        const changed = this._mergeSettings(patch);
        if (Object.keys(changed).length) {
            // The game's settings store uses explicit volume names. Keep the
            // shorter names internally for the range controls.
            const payload = { ...changed };
            if (payload.music !== undefined) {
                payload.musicVolume = payload.music;
                delete payload.music;
            }
            if (payload.sfx !== undefined) {
                payload.sfxVolume = payload.sfx;
                delete payload.sfx;
            }
            this._dispatch('settings', payload);
        }
    }

    _persistSettings() {
        try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this._settings));
        } catch (error) {
            // Storage can be unavailable in private/embedded contexts. The game
            // still receives the live settings command and may persist them.
        }
    }

    _applySettingsToDOM() {
        document.documentElement.classList.toggle('reduce-motion', this._settings.reducedMotion);
        document.documentElement.classList.toggle('high-contrast', this._settings.highContrast);
        this._app.style.setProperty('--control-size', this._settings.controlSize === 'large' ? '76px' : '64px');
        this._app.classList.toggle('is-left-handed', this._settings.handedness === 'left');
        this._setRunState(this._settings.autoDash || Boolean(window.gameInput?.runToggle));
        this._syncSettingsControls();
        this._updateTouchAvailability();
    }

    _syncSettingsControls() {
        const music = document.getElementById('wb-setting-music');
        const sfx = document.getElementById('wb-setting-sfx');
        if (!music || !sfx) return;
        music.value = String(Math.round(this._settings.music * 100));
        sfx.value = String(Math.round(this._settings.sfx * 100));
        document.getElementById('wb-setting-music-output').textContent = `${music.value}%`;
        document.getElementById('wb-setting-sfx-output').textContent = `${sfx.value}%`;

        document.getElementById('wb-setting-muted').checked = this._settings.muted;
        document.getElementById('wb-setting-reduced-motion').checked = this._settings.reducedMotion;
        document.getElementById('wb-setting-screen-shake').checked = this._settings.screenShake;
        document.getElementById('wb-setting-high-contrast').checked = this._settings.highContrast;
        document.getElementById('wb-setting-assist').checked = this._settings.assistMode;
        document.getElementById('wb-setting-auto-dash').checked = this._settings.autoDash;
        document.getElementById('wb-setting-touch').value = this._settings.showTouch;
        document.getElementById('wb-setting-control-size').value = this._settings.controlSize;
        document.getElementById('wb-setting-handedness').value = this._settings.handedness;
    }

    _resetSettings() {
        this._changeSettings({ ...DEFAULT_SETTINGS, reducedMotion: Boolean(this._motionQuery?.matches) });
        this.showToast('Settings reset. Changes save automatically.', 'success');
    }

    // ---------------------------------------------------------------------
    // Touch input
    // ---------------------------------------------------------------------

    _bindInput(input) {
        this._input = input && typeof input.setVirtual === 'function' ? input : null;
        this._touchDeck.querySelectorAll('[data-touch-control]').forEach((button) => {
            button.disabled = !this._input;
        });
        if (!this._input) this._releaseAllPointers();
    }

    _updateTouchAvailability() {
        const coarse = Boolean(this._coarseQuery?.matches);
        const enabled = this._settings.showTouch === 'on' || (this._settings.showTouch === 'auto' && coarse);
        const blocked = this._pauseDialog.open || this._settingsDialog.open || this._gameOverDialog.open || this._victoryDialog.open;
        this._touchDeck.hidden = !(this._playing && enabled && !blocked);
        if (this._touchDeck.hidden) this._releaseAllPointers();
    }

    _canUseControls() {
        return this._playing && !this._paused && this._input && !this._settingsOpen
            && !this._gameOverDialog.open && !this._victoryDialog.open;
    }

    _onControlPointerDown(event) {
        const button = event.currentTarget;
        if (!this._canUseControls() || button.disabled || event.button !== 0) return;
        if (event.pointerType === 'mouse' && event.isPrimary === false) return;
        event.preventDefault();
        const action = button.dataset.touchControl;
        if (action === 'run') {
            this._toggleRun();
            return;
        }
        if (this._pointers.has(event.pointerId)) return;
        try {
            button.setPointerCapture(event.pointerId);
        } catch (error) {
            // Global pointerup/cancel handlers still guarantee the input is released.
        }
        this._pointers.set(event.pointerId, { button, action });
        button.classList.add('is-held');
        this._input.setVirtual(action, true);
    }

    _onControlKeyDown(event) {
        if (!['Space', 'Enter'].includes(event.code)) return;
        const button = event.currentTarget;
        if (!this._canUseControls() || button.disabled) return;
        event.preventDefault();
        if (event.repeat) return;
        const action = button.dataset.touchControl;
        if (action === 'run') {
            this._toggleRun();
            return;
        }
        button.classList.add('is-held');
        this._input.setVirtual(action, true);
    }

    _onControlKeyUp(event) {
        if (!['Space', 'Enter'].includes(event.code)) return;
        const button = event.currentTarget;
        event.preventDefault();
        const action = button.dataset.touchControl;
        if (action !== 'run') {
            button.classList.remove('is-held');
            this._input?.setVirtual(action, false);
        }
    }

    _releasePointer(pointerId) {
        const entry = this._pointers.get(pointerId);
        if (!entry) return;
        this._pointers.delete(pointerId);
        entry.button.classList.remove('is-held');
        try {
            if (entry.button.hasPointerCapture?.(pointerId)) entry.button.releasePointerCapture(pointerId);
        } catch (error) {
            // Capture may already have been lost during a cancel or navigation.
        }
        this._input?.setVirtual(entry.action, false);
    }

    _releaseAllPointers() {
        Array.from(this._pointers.keys()).forEach((pointerId) => this._releasePointer(pointerId));
        this._touchDeck.querySelectorAll('.is-held').forEach((button) => button.classList.remove('is-held'));
    }

    _toggleRun() {
        const enabled = !(this._runToggled || this._settings.autoDash);
        if (this._settings.autoDash) this._changeSettings({ autoDash: false });
        this._setRunState(enabled);
        this._dispatch('toggleRun', { enabled });
    }

    _setRunState(enabled) {
        this._runToggled = Boolean(enabled);
        const button = this._touchDeck.querySelector('[data-touch-control="run"]');
        if (button) button.setAttribute('aria-pressed', String(this._runToggled));
    }

    // ---------------------------------------------------------------------
    // HUD, announcements, and layout helpers
    // ---------------------------------------------------------------------

    _renderLives(lives, maxLives) {
        const element = document.getElementById('wb-hud-lives');
        element.setAttribute('aria-label', `${lives} of ${maxLives} lives`);
        element.title = `${lives} of ${maxLives} lives`;
        if (maxLives <= 8) {
            element.textContent = `${'♥'.repeat(lives)}${'♡'.repeat(maxLives - lives)}`;
        } else {
            element.textContent = `♥ ${lives}/${maxLives}`;
        }
        element.classList.toggle('is-low', lives <= 1);
    }

    _setPlayingView(playing) {
        this._playing = playing;
        document.body.classList.toggle('is-playing', playing);
        this._app.classList.toggle('is-playing', playing);
        if (!playing) this._releaseAllPointers();
        this._updateTouchAvailability();
        this._scheduleScaleRefresh();
    }

    _announce(message) {
        if (!message || this._destroyed) return;
        this._announcer.textContent = '';
        if (this._announcementFrame) cancelAnimationFrame(this._announcementFrame);
        this._announcementFrame = requestAnimationFrame(() => {
            if (!this._destroyed) this._announcer.textContent = String(message);
            this._announcementFrame = 0;
        });
    }

    _setLoadingMessage(message) {
        const text = String(message || 'Loading…');
        this._loadingMessage.textContent = text;
        const match = text.match(/(\d{1,3})(?:\s*)?%/);
        if (match) this._loadingProgress.value = clamp(Number(match[1]), 0, 100);
    }

    _later(property, callback, duration) {
        if (this[property]) {
            window.clearTimeout(this[property]);
            this._timers.delete(this[property]);
        }
        const timer = window.setTimeout(() => {
            this._timers.delete(timer);
            this[property] = null;
            callback();
        }, duration);
        this[property] = timer;
        this._timers.add(timer);
    }

    _clearTimer(property) {
        if (!this[property]) return;
        window.clearTimeout(this[property]);
        this._timers.delete(this[property]);
        this[property] = null;
    }

    _fitStage() {
        if (this._destroyed) return;
        if (this._resizeFrame) cancelAnimationFrame(this._resizeFrame);
        this._resizeFrame = requestAnimationFrame(() => {
            this._resizeFrame = 0;
            if (this._destroyed) return;
            const width = this._stageArea.clientWidth;
            const height = this._stageArea.clientHeight;
            if (!width || !height) return;
            let stageWidth = width;
            let stageHeight = stageWidth * 9 / 16;
            if (stageHeight > height) {
                stageHeight = height;
                stageWidth = stageHeight * 16 / 9;
            }
            this._stageFrame.style.width = `${Math.max(1, Math.floor(stageWidth))}px`;
            this._stageFrame.style.height = `${Math.max(1, Math.floor(stageHeight))}px`;
        });
    }

    _scheduleScaleRefresh() {
        if (this._destroyed || this._scaleFrame) return;
        this._scaleFrame = requestAnimationFrame(() => {
            this._scaleFrame = 0;
            if (this._destroyed) return;
            try {
                this.game?.scale?.refresh?.();
            } catch (error) {
                // Phaser will also perform its own resize handling.
            }
        });
    }

    _errorMessage(error) {
        if (typeof error === 'string') return error;
        if (error?.message) return String(error.message);
        if (error?.detail?.message) return String(error.detail.message);
        return 'An unexpected error interrupted the adventure.';
    }

    // ---------------------------------------------------------------------
    // Event wiring
    // ---------------------------------------------------------------------

    _listen(target, type, handler, options) {
        if (this._eventController) {
            target.addEventListener(type, handler, { ...options, signal: this._eventController.signal });
        } else {
            target.addEventListener(type, handler, options);
            this._legacyListeners = this._legacyListeners || [];
            this._legacyListeners.push({ target, type, handler, options });
        }
    }

    _bindEvents() {
        this._listen(window, 'game:artwork', (event) => {
            const { id, dataUrl } = event.detail || {};
            if (id == null || typeof dataUrl !== 'string' || !dataUrl) return;
            this._artwork.set(id, dataUrl);
            this._setPortrait(id, dataUrl);
        });

        this._listen(window, 'game:input-ready', (event) => {
            this._bindInput(event.detail?.input || window.gameInput);
        });

        this._listen(window, 'game:save-updated', () => this._refreshContinueButton());
        this._listen(window, 'game:launch-failed', () => { this._launching = false; });
        this._listen(window, 'game:settings', (event) => {
            const settings = event.detail?.settings || event.detail || {};
            this.applySettings(settings);
        });
        this._listen(window, 'game:run-state', (event) => {
            const detail = event.detail || {};
            this._setRunState(typeof detail === 'boolean' ? detail : detail.enabled);
        });
        this._listen(window, 'game:run-toggle', (event) => {
            this._setRunState(event.detail?.enabled);
        });
        this._listen(window, 'game:ready', () => {
            const external = window.gameSettings || window.gameCommands?.settings;
            if (external && typeof external === 'object') this.applySettings(external);
        });
        this._listen(window, 'game:error', (event) => this.showFatalError(event));
        this._listen(window, 'error', (event) => {
            if (event?.error || event?.message) this.showFatalError(event.error || event.message);
        });
        this._listen(window, 'unhandledrejection', (event) => this.showFatalError(event.reason));
        this._listen(window, 'keydown', (event) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (!this._playing || event.repeat || this._settingsOpen || this._gameOverDialog.open || this._victoryDialog.open) return;
            if (event.code !== 'KeyP' && event.code !== 'Escape') return;
            event.preventDefault();
            this._handleCommand(this._paused ? 'resume' : 'pause');
        });

        this._onWindowResize = () => {
            this._fitStage();
            this._scheduleScaleRefresh();
        };
        this._onWindowBlur = () => this._releaseAllPointers();
        this._onGlobalPointerEnd = (event) => this._releasePointer(event.pointerId);
        this._onVisibilityChange = () => {
            if (document.hidden) this._releaseAllPointers();
        };
        this._onCoarsePointerChange = () => this._updateTouchAvailability();
        this._onMotionPreferenceChange = () => {
            document.documentElement.classList.toggle('reduce-motion', this._settings.reducedMotion || Boolean(this._motionQuery?.matches));
        };
        this._onFullscreenChange = () => {
            this._updateFullscreenButton();
            this._fitStage();
            this._scheduleScaleRefresh();
        };

        window.addEventListener('resize', this._onWindowResize);
        window.addEventListener('blur', this._onWindowBlur);
        window.addEventListener('pointerup', this._onGlobalPointerEnd);
        window.addEventListener('pointercancel', this._onGlobalPointerEnd);
        document.addEventListener('visibilitychange', this._onVisibilityChange);
        document.addEventListener('fullscreenchange', this._onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', this._onFullscreenChange);
        this._coarseQuery?.addEventListener?.('change', this._onCoarsePointerChange);
        this._motionQuery?.addEventListener?.('change', this._onMotionPreferenceChange);

        this._listen(document.body, 'click', (event) => {
            const characterButton = event.target.closest('[data-character-id]');
            if (characterButton) {
                this.selectCharacter(characterButton.dataset.characterId);
                return;
            }
            const closeButton = event.target.closest('[data-dialog-close]');
            if (closeButton) {
                const name = closeButton.dataset.dialogClose;
                if (name === 'pause') this._handleCommand('resume');
                else this._closeDialog(this._settingsDialog);
                return;
            }
            const commandButton = event.target.closest('[data-ui-command]');
            if (commandButton) this._handleCommand(commandButton.dataset.uiCommand);
        });

        document.getElementById('wb-reload-button').addEventListener('click', () => window.location.reload());
        document.getElementById('wb-reset-settings').addEventListener('click', () => this._resetSettings());

        this._settingsDialog.addEventListener('input', (event) => {
            const input = event.target.closest('[data-setting]');
            if (!input || input.type !== 'range') return;
            const key = input.dataset.setting;
            if (key === 'music' || key === 'sfx') {
                const value = Number(input.value) / 100;
                document.getElementById(`wb-setting-${key}-output`).textContent = `${input.value}%`;
                this._changeSettings({ [key]: value });
            }
        });
        this._settingsDialog.addEventListener('change', (event) => {
            const input = event.target.closest('[data-setting]');
            if (!input || input.type === 'range') return;
            const key = input.dataset.setting;
            this._changeSettings({ [key]: input.type === 'checkbox' ? input.checked : input.value });
        });

        this._pauseDialog.addEventListener('cancel', (event) => {
            event.preventDefault();
            this._handleCommand('resume');
        });
        this._settingsDialog.addEventListener('close', () => {
            this._settingsOpen = false;
            // Deliberately do not resume: closing settings returns to the pause
            // menu when it was opened during play.
            this._updateTouchAvailability();
        });
        [this._gameOverDialog, this._victoryDialog].forEach((dialog) => {
            dialog.addEventListener('cancel', (event) => {
                event.preventDefault();
                this._handleCommand('menu');
            });
        });

        this._touchDeck.querySelectorAll('[data-touch-control]').forEach((button) => {
            button.addEventListener('pointerdown', this._onControlPointerDown.bind(this));
            button.addEventListener('pointerup', (event) => this._releasePointer(event.pointerId));
            button.addEventListener('pointercancel', (event) => this._releasePointer(event.pointerId));
            button.addEventListener('lostpointercapture', (event) => this._releasePointer(event.pointerId));
            button.addEventListener('keydown', this._onControlKeyDown.bind(this));
            button.addEventListener('keyup', this._onControlKeyUp.bind(this));
            button.addEventListener('blur', () => {
                this._touchDeck.querySelectorAll('.is-held').forEach((held) => {
                    const action = held.dataset.touchControl;
                    held.classList.remove('is-held');
                    this._input?.setVirtual(action, false);
                });
            });
            button.addEventListener('contextmenu', (event) => event.preventDefault());
            if (button.dataset.touchControl === 'run') {
                button.addEventListener('click', (event) => {
                    // Pointer input toggles on pointerdown; this path supports
                    // keyboard and assistive-technology activation.
                    if (event.detail === 0) this._toggleRun();
                });
            }
        });

        if (window.gameInput && typeof window.gameInput.setVirtual === 'function') {
            this._bindInput(window.gameInput);
        }
        this._updateFullscreenButton();
        document.documentElement.classList.toggle('reduce-motion', this._settings.reducedMotion || Boolean(this._motionQuery?.matches));
    }
}

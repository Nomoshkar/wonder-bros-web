/**
 * AudioManager — procedural Web-Audio sound + music engine.
 *
 * No external audio files needed: every SFX and every music track is
 * synthesised at runtime from oscillators + a simple per-track melody table.
 * This keeps the game self-contained (gated behind a single browser-native
 * AudioContext that resumes on first user gesture, per autoplay policy).
 *
 * Public API:
 *   AudioManager.init()              // lazily create the AudioContext
 *   AudioManager.resume()            // call once from a user gesture (any click)
 *   AudioManager.sfx(name, opts)     // play a one-shot sound effect
 *   AudioManager.music(key)          // start (or crossfade to) a named track
 *   AudioManager.stopMusic()         // fade out + stop current music
 *   AudioManager.setMusicVolume(v)   // 0..1
 *   AudioManager.setSfxVolume(v)     // 0..1
 *   AudioManager.muteAll(bool)       // master mute
 *
 * Music track keys are themed per level:
 *   'menu', 'level1', 'level2', 'level3', 'level4', 'level5', 'victory'
 *
 * Each track is a short melodic loop (notes are [midiNumber, beats]); the
 * AudioManager loops them on a 16th-note scheduler so the music plays
 * continuously during gameplay without asset loading or gaps.
 */
export const AudioManager = (() => {
  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let muted = false;
  let _musicVolume = 0.35;
  let _sfxVolume = 0.5;

  let currentTrack = null;       // track key string
  let schedulerTimer = null;     // setInterval id
  let nextNoteTime = 0;          // audio-context seconds
  let stepIndex = 0;             // 16th-note step counter
  let activeTrack = null;        // the resolved track table for currentTrack

  // --- Low-level init (called lazily / on first user gesture) ---
  function _ensureContext() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : 1;
      masterGain.connect(ctx.destination);

      musicGain = ctx.createGain();
      musicGain.gain.value = _musicVolume;
      musicGain.connect(masterGain);

      sfxGain = ctx.createGain();
      sfxGain.gain.value = _sfxVolume;
      sfxGain.connect(masterGain);
    } catch (e) {
      console.warn('[AudioManager] Web Audio unavailable:', e);
      ctx = null;
    }
    return ctx;
  }

  function init() { return _ensureContext(); }

  function resume() {
    _ensureContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  // --- MIDI helpers ---
  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // Play a single tone with an ADSR-ish envelope onto `dest` (a gain node).
  function _voice(freq, time, dur, type, vol, dest) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, time);
    const v = Math.max(0.0001, vol);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(v, time + 0.01);
    g.gain.exponentialRampToValueAtTime(v * 0.6, time + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g); g.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  // --- Sound effects (one-shot) ---
  const SFX = {
    jump:     { type: 'square',   freqs: [440, 720],            dur: 0.18, sweep: true,  vol: 0.5  },
    stomp:    { type: 'square',   freqs: [220, 110],            dur: 0.16, sweep: true,  vol: 0.55 },
    coin:     { type: 'square',   freqs: [988, 1318],           dur: 0.18, sweep: true,  vol: 0.45 },
    powerup:  { type: 'triangle', freqs: [392, 523, 659, 784],  dur: 0.5,  arpeggio: true, vol: 0.5 },
    hurt:     { type: 'sawtooth', freqs: [330, 196, 120],       dur: 0.35, sweep: true,  vol: 0.45 },
    enemydie: { type: 'square',   freqs: [196, 110, 70],        dur: 0.25, sweep: true,  vol: 0.45 },
    fireball: { type: 'sawtooth', freqs: [880, 300],            dur: 0.22, sweep: true,  vol: 0.4  },
    explode:  { type: 'sawtooth', freqs: [200, 60],            dur: 0.5,  sweep: true,  vol: 0.6, noise: true },
    flag:     { type: 'triangle', freqs: [523, 659, 784, 1046], dur: 0.7,  arpeggio: true, vol: 0.55 },
    select:   { type: 'square',   freqs: [660, 880],            dur: 0.09, sweep: true,  vol: 0.35 },
    bump:     { type: 'square',   freqs: [180, 120],            dur: 0.08, sweep: true,  vol: 0.3 },
    kick:     { type: 'square',   freqs: [240, 480],            dur: 0.12, sweep: true,  vol: 0.4 },
    bowserfire: { type: 'sawtooth', freqs: [180, 90], dur: 0.3, sweep: true, vol: 0.5 }
  };

  function _noiseBuffer(dur) {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    return buf;
  }

  function sfx(name, opts) {
    if (!_ensureContext() || muted) return;
    resume();
    const def = SFX[name];
    if (!def) return;
    const t = ctx.currentTime;
    const dur = def.dur;
    if (def.noise) {
      const src = ctx.createBufferSource();
      src.buffer = _noiseBuffer(dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(def.vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t);
      lp.frequency.exponentialRampToValueAtTime(120, t + dur);
      src.connect(lp); lp.connect(g); g.connect(sfxGain);
      src.start(t); src.stop(t + dur + 0.05);
      return;
    }
    if (def.arpeggio) {
      const step = dur / def.freqs.length;
      def.freqs.forEach((f, i) => _voice(f, t + i * step, step * 1.4, def.type, def.vol, sfxGain));
    } else if (def.sweep) {
      // sweep between two freqs
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = def.type;
      const f0 = def.freqs[0], f1 = def.freqs[def.freqs.length - 1];
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(def.vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(sfxGain);
      osc.start(t); osc.stop(t + dur + 0.03);
    } else {
      _voice(def.freqs[0], t, dur, def.type, def.vol, sfxGain);
    }
  }

  // ===================================================================
  //  MUSIC — themed loops per level/menu/victory
  //
  //  Each track: { bpm, lead: [[midi, beats], ...], bass: [...], drums }
  //  beats are relative to a beat grid at the track's BPM. Rests use 0.
  // ===================================================================

  // helper: a midi rest marker
  const R = 0;

  const TRACKS = {
    menu: {
      bpm: 96, leadType: 'triangle', bassType: 'sine',
      lead: [
        [72, 1], [76, 1], [79, 1], [84, 1],
        [79, 1], [76, 1], [72, 2],
        [74, 1], [77, 1], [81, 1], [86, 1],
        [81, 1], [77, 1], [74, 2]
      ],
      bass: [
        [48, 2], [55, 2], [43, 2], [50, 2]
      ],
      drums: true
    },
    // Pipe-Rock Plateau — bright bouncy major arpeggio
    level1: {
      bpm: 128, leadType: 'square', bassType: 'sawtooth',
      lead: [
        [72, 0.5], [76, 0.5], [79, 0.5], [76, 0.5],
        [72, 0.5], [76, 0.5], [79, 0.5], [84, 0.5],
        [79, 0.5], [76, 0.5], [72, 0.5], [76, 0.5],
        [74, 0.5], [77, 0.5], [81, 1], [79, 1]
      ],
      bass: [
        [48, 1], [48, 1], [50, 1], [50, 1],
        [43, 1], [43, 1], [45, 1], [47, 1]
      ],
      drums: true
    },
    // Sky levels — light airy waltz-ish loop (twin sky isles)
    level2: {
      bpm: 104, leadType: 'triangle', bassType: 'sine',
      lead: [
        [76, 1], [79, 1], [83, 2],
        [81, 1], [78, 1], [74, 2],
        [76, 1], [79, 1], [84, 2],
        [83, 1], [79, 1], [76, 2]
      ],
      bass: [
        [40, 2], [38, 2], [41, 2], [43, 2]
      ],
      drums: false
    },
    // Cavern (Level3) — minor-key spooky dirge
    level3: {
      bpm: 110, leadType: 'sawtooth', bassType: 'square',
      lead: [
        [69, 1], [R, 1], [72, 1], [76, 1],
        [74, 1], [R, 1], [72, 2],
        [71, 1], [R, 1], [74, 1], [77, 1],
        [76, 1], [R, 1], [69, 2]
      ],
      bass: [
        [33, 2], [33, 2], [31, 2], [31, 2]
      ],
      drums: true
    },
    // Ocean (Level4) — slow swell, sus2 chords
    level4: {
      bpm: 88, leadType: 'sine', bassType: 'triangle',
      lead: [
        [77, 2], [81, 1], [74, 1],
        [72, 2], [77, 1], [76, 1],
        [74, 2], [77, 1], [81, 1],
        [84, 2], [81, 1], [77, 1]
      ],
      bass: [
        [38, 4], [33, 4], [36, 4], [31, 4]
      ],
      drums: false
    },
    // Final keep (Level5) — driving minor battle march
    level5: {
      bpm: 140, leadType: 'square', bassType: 'sawtooth',
      lead: [
        [69, 0.5], [69, 0.5], [72, 0.5], [74, 0.5],
        [76, 1], [74, 0.5], [72, 0.5],
        [69, 0.5], [69, 0.5], [72, 0.5], [74, 0.5],
        [76, 1], [79, 1],
        [77, 0.5], [76, 0.5], [74, 0.5], [72, 0.5],
        [71, 2]
      ],
      bass: [
        [33, 1], [33, 1], [33, 1], [33, 1],
        [35, 1], [35, 1], [31, 1], [31, 1]
      ],
      drums: true
    },
    // Victory / congratulations — triumphant fanfare loop
    victory: {
      bpm: 120, leadType: 'triangle', bassType: 'sawtooth',
      lead: [
        [72, 0.5], [76, 0.5], [79, 0.5], [84, 0.5],
        [81, 0.5], [84, 0.5], [88, 1], [86, 1],
        [84, 0.5], [81, 0.5], [79, 0.5], [76, 0.5],
        [79, 1], [76, 1], [72, 2]
      ],
      bass: [
        [48, 2], [43, 2], [41, 2], [36, 2]
      ],
      drums: true
    }
  };

  // --- 16th-note scheduler (Web Audio look-ahead pattern) ---
  const SCHEDULE_AHEAD = 0.1;     // seconds to schedule ahead
  const SCHEDULE_INTERVAL = 25;   // ms timer

  function _scheduleStep(track, stepTime, step) {
    // We expand notes into a flat 16th-note grid lazily once.
    if (!track._leadGrid) {
      track._leadGrid = _expandGrid(track.lead);
      track._bassGrid = _expandGrid(track.bass);
    }
    const leadGrid = track._leadGrid;
    const bassGrid = track._bassGrid;
    const i = step % leadGrid.length;
    const bi = step % bassGrid.length;

    const leadMidi = leadGrid[i];
    if (leadMidi > 0) {
      const secPer16 = (60 / track.bpm) / 4;
      _voice(midiToFreq(leadMidi), stepTime, secPer16 * 3, track.leadType, 0.18, musicGain);
    }
    const bassMidi = bassGrid[bi];
    if (bassMidi > 0) {
      const secPer16 = (60 / track.bpm) / 4;
      _voice(midiToFreq(bassMidi), stepTime, secPer16 * 3.5, track.bassType, 0.16, musicGain);
    }
    // simple kick / hat on a beat pattern
    if (track.drums) {
      const secPer16 = (60 / track.bpm) / 4;
      const inBeat = step % 4;
      if (inBeat === 0) {
        // kick
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.frequency.setValueAtTime(150, stepTime);
        osc.frequency.exponentialRampToValueAtTime(45, stepTime + 0.1);
        g.gain.setValueAtTime(0.35, stepTime);
        g.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.13);
        osc.connect(g); g.connect(musicGain);
        osc.start(stepTime); osc.stop(stepTime + 0.15);
      }
      if (inBeat === 2) {
        // hat (filtered noise)
        const src = ctx.createBufferSource(); src.buffer = _noiseBuffer(0.05);
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.12, stepTime);
        g.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.04);
        src.connect(hp); hp.connect(g); g.connect(musicGain);
        src.start(stepTime); src.stop(stepTime + 0.05);
      }
    }
  }

  // Expand [midi, beats] into a flat array of 16th-note slots (rest = R/0).
  function _expandGrid(noteList) {
    const grid = [];
    for (const [m, beats] of noteList) {
      const slots = Math.max(1, Math.round(beats * 4));
      grid.push(m);
      for (let i = 1; i < slots; i++) grid.push(R);
    }
    return grid;
  }

  function _scheduler() {
    if (!ctx || !activeTrack) return;
    // Background tabs throttle intervals. Skip an overdue backlog instead of
    // bursting every missed note when the player returns.
    if (nextNoteTime < ctx.currentTime - 0.5) {
      nextNoteTime = ctx.currentTime + 0.05;
      stepIndex = 0;
    }
    while (nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
      _scheduleStep(activeTrack, nextNoteTime, stepIndex);
      const secPer16 = (60 / activeTrack.bpm) / 4;
      nextNoteTime += secPer16;
      stepIndex++;
    }
  }

  function music(key) {
    if (!_ensureContext()) return;
    resume();
    if (currentTrack === key && schedulerTimer) { return; }
    const track = TRACKS[key];
    if (!track) { return; }
    // stop any current scheduler (crossfade handled by gain fade below)
    if (schedulerTimer) { clearInterval(schedulerTimer); schedulerTimer = null; }
    activeTrack = track;
    currentTrack = key;
    stepIndex = 0;
    nextNoteTime = ctx.currentTime + 0.05;
    // gentle fade-in
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    musicGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, _musicVolume), ctx.currentTime + 0.4);
    schedulerTimer = setInterval(_scheduler, SCHEDULE_INTERVAL);
  }

  function stopMusic(fadeMs = 350) {
    if (schedulerTimer) { clearInterval(schedulerTimer); schedulerTimer = null; }
    if (musicGain && ctx) {
      musicGain.gain.cancelScheduledValues(ctx.currentTime);
      const t = ctx.currentTime;
      musicGain.gain.setValueAtTime(musicGain.gain.value, t);
      musicGain.gain.exponentialRampToValueAtTime(0.0001, t + fadeMs / 1000);
    }
    activeTrack = null;
    currentTrack = null;
  }

  function setMusicVolume(v) {
    _musicVolume = Math.max(0, Math.min(1, v));
    if (musicGain && ctx) musicGain.gain.setTargetAtTime(_musicVolume, ctx.currentTime, 0.05);
  }

  function setSfxVolume(v) {
    _sfxVolume = Math.max(0, Math.min(1, v));
    if (sfxGain && ctx) sfxGain.gain.setTargetAtTime(_sfxVolume, ctx.currentTime, 0.05);
  }

  function muteAll(m) {
    muted = !!m;
    if (masterGain && ctx) masterGain.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
  }

  function isMuted() { return muted; }
  function getMusicTrack() { return currentTrack; }

  return {
    init, resume,
    sfx, music, stopMusic,
    setMusicVolume, setSfxVolume, muteAll, isMuted, getMusicTrack
  };
})();

// Hook the audio context resume to the FIRST user gesture on the page so
// browsers (which block autoplay until interaction) unlock audio ASAP. This
// also catches the very first canvas click that starts the game.
(() => {
  const unlock = () => {
    AudioManager.resume();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
})();

export type BuildingSoundName =
  | 'brick_place'
  | 'rotate_object'
  | 'move_object'
  | 'place_object'
  | 'resize_object'
  | 'add_floor'
  | 'change_texture'
  | 'window_edit'
  | 'window_add';

const SOUND_FILES: Record<BuildingSoundName, string> = {
  brick_place: '/assets/sfx/action_place1.mp3',
  rotate_object: '/assets/sfx/action_spin.mp3',
  move_object: '/assets/sfx/action_move.mp3',
  place_object: '/assets/sfx/action_place2.mp3',
  resize_object: '/assets/sfx/action_scale.mp3',
  add_floor: '/assets/sfx/action_add_layer.mp3',
  change_texture: '/assets/sfx/action_paint.mp3',
  window_edit: '/assets/sfx/action_window_mod.mp3',
  window_add: '/assets/sfx/action_window_new.mp3',
};

// Cooldown per sound to prevent spam (ms)
const COOLDOWNS: Partial<Record<BuildingSoundName, number>> = {
  // Slider-driven sounds need longer cooldown so they don't overlap
  resize_object: 300,
  move_object: 300,
  rotate_object: 300,
  add_floor: 400,
  window_add: 400,
};
const DEFAULT_COOLDOWN = 100;

class SoundManager {
  private cache: Map<BuildingSoundName, HTMLAudioElement> = new Map();
  private lastPlayed: Map<BuildingSoundName, number> = new Map();
  private activePlaying: Map<BuildingSoundName, HTMLAudioElement> = new Map();
  private _volume = 0.8;
  private _muted = false;
  private loaded = false;
  private audioCtx: AudioContext | null = null;

  /** Preload all sound files into cache */
  preload(): void {
    if (this.loaded) {
      return;
    }
    for (const [name, path] of Object.entries(SOUND_FILES)) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audio.volume = this._volume;
      this.cache.set(name as BuildingSoundName, audio);
    }
    this.loaded = true;
  }

  /** Play a sound by name. Returns false if on cooldown or muted. */
  play(name: BuildingSoundName): boolean {
    if (this._muted) {
      return false;
    }

    // Lazy preload
    if (!this.loaded) this.preload();

    // Cooldown check
    const cooldown = COOLDOWNS[name] ?? DEFAULT_COOLDOWN;
    const now = Date.now();
    const last = this.lastPlayed.get(name) ?? 0;
    if (now - last < cooldown) {
      return false;
    }
    this.lastPlayed.set(name, now);

    const cached = this.cache.get(name);
    if (!cached) {
      this.playFallback(name);
      return true;
    }

    // Stop any currently playing instance of this sound
    const active = this.activePlaying.get(name);
    if (active) {
      active.pause();
      active.currentTime = 0;
    }

    // Clone node for fresh playback
    const clone = cached.cloneNode() as HTMLAudioElement;
    clone.volume = this._volume;
    this.activePlaying.set(name, clone);
    clone.addEventListener('ended', () => {
      if (this.activePlaying.get(name) === clone) {
        this.activePlaying.delete(name);
      }
    });
    clone.play().catch(() => {
      // Common reasons:
      // - audio file missing (404)
      // - autoplay policy (no user gesture)
      // In both cases, fall back to a subtle procedural UI sound.
      this.playFallback(name);
    });
    return true;
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
      if (!Ctx) return null;
      this.audioCtx = new Ctx();
    }
    // Attempt resume (needed on some browsers even after interaction)
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private playFallback(name: BuildingSoundName): void {
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Small, tasteful variations by action type
    const preset = (() => {
      switch (name) {
        case 'brick_place':
        case 'place_object':
          return { type: 'triangle' as const, freq: 140, decay: 0.08, filter: 800 };
        case 'move_object':
          return { type: 'sine' as const, freq: 220, decay: 0.05, filter: 1200 };
        case 'rotate_object':
          return { type: 'sine' as const, freq: 260, decay: 0.045, filter: 1600 };
        case 'resize_object':
          return { type: 'triangle' as const, freq: 200, decay: 0.06, filter: 1400 };
        case 'add_floor':
          return { type: 'square' as const, freq: 320, decay: 0.05, filter: 1800 };
        case 'change_texture':
          return { type: 'sine' as const, freq: 420, decay: 0.04, filter: 2000 };
        case 'window_add':
        case 'window_edit':
          return { type: 'triangle' as const, freq: 360, decay: 0.045, filter: 2200 };
        default:
          return { type: 'sine' as const, freq: 240, decay: 0.05, filter: 1500 };
      }
    })();

    osc.type = preset.type;
    osc.frequency.setValueAtTime(preset.freq, now);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(preset.filter, now);

    const vol = Math.max(0, Math.min(1, this._volume));
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12 * vol, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + preset.decay);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + preset.decay + 0.02);
  }

  /** Set volume (0 to 1) */
  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    for (const audio of this.cache.values()) {
      audio.volume = this._volume;
    }
  }

  get volume(): number {
    return this._volume;
  }

  /** Mute / unmute */
  set muted(m: boolean) {
    this._muted = m;
  }

  get muted(): boolean {
    return this._muted;
  }
}

// Singleton instance
export const soundManager = new SoundManager();

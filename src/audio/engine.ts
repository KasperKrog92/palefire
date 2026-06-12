import { loadAudioBytes } from "../files";
import type { AudioFile } from "../types";

export interface LayerSpec {
  file: AudioFile;
  volume: number;
  loop: boolean;
}

export interface LiveLayer {
  key: string;
  fileId: number;
  name: string;
  volume: number;
  muted: boolean;
  loop: boolean;
}

export interface EngineSnapshot {
  playing: boolean;
  paused: boolean;
  presetId: number | null;
  presetName: string | null;
  layers: LiveLayer[];
  master: number;
}

interface ActiveLayer {
  key: string;
  file: AudioFile;
  source: AudioBufferSourceNode;
  gain: GainNode;
  volume: number;
  muted: boolean;
  fading: boolean; // true once the layer is on its way out
}

/**
 * The atmosphere engine: every active layer is a looping AudioBufferSourceNode
 * through its own GainNode into a master GainNode. Fades and crossfades are
 * scheduled gain ramps, so transitions stay smooth no matter what the UI does.
 */
class AtmosphereEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private buffers = new Map<number, Promise<AudioBuffer>>();
  private active = new Map<string, ActiveLayer>();
  private listeners = new Set<(s: EngineSnapshot) => void>();
  private keyCounter = 0;

  private master = 0.9;
  private paused = false;
  private presetId: number | null = null;
  private presetName: string | null = null;
  private currentFadeOutMs = 2500;

  /* ------------------------------- plumbing -------------------------------- */

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.master;
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private getBuffer(file: AudioFile): Promise<AudioBuffer> {
    let p = this.buffers.get(file.id);
    if (!p) {
      p = loadAudioBytes(file.source).then((bytes) => this.ensureCtx().decodeAudioData(bytes));
      p.catch(() => this.buffers.delete(file.id));
      this.buffers.set(file.id, p);
    }
    return p;
  }

  /** Drop a cached buffer (after deleting a library file). */
  forget(fileId: number): void {
    this.buffers.delete(fileId);
  }

  subscribe(fn: (s: EngineSnapshot) => void): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  snapshot(): EngineSnapshot {
    const layers = [...this.active.values()]
      .filter((l) => !l.fading)
      .map((l) => ({
        key: l.key,
        fileId: l.file.id,
        name: l.file.name,
        volume: l.volume,
        muted: l.muted,
        loop: l.source.loop,
      }));
    return {
      playing: layers.length > 0,
      paused: this.paused,
      presetId: this.presetId,
      presetName: this.presetName,
      layers,
      master: this.master,
    };
  }

  private emit(): void {
    const s = this.snapshot();
    for (const fn of this.listeners) fn(s);
  }

  private fadeOutLayer(layer: ActiveLayer, ms: number): void {
    const ctx = this.ensureCtx();
    const now = ctx.currentTime;
    const secs = Math.max(ms, 30) / 1000;
    layer.fading = true;
    layer.gain.gain.cancelScheduledValues(now);
    layer.gain.gain.setValueAtTime(layer.gain.gain.value, now);
    layer.gain.gain.linearRampToValueAtTime(0.0001, now + secs);
    try {
      layer.source.stop(now + secs + 0.05);
    } catch {
      // already stopped
    }
  }

  /* -------------------------------- playback ------------------------------- */

  /**
   * Crossfades to a new set of layers. Pass presetId/Name = null for ad-hoc
   * playback (library preview). fadeOutMs applies to whatever is playing now.
   */
  async play(
    presetId: number | null,
    presetName: string | null,
    specs: LayerSpec[],
    fadeInMs: number,
    nextFadeOutMs: number
  ): Promise<void> {
    const ctx = this.ensureCtx();
    if (this.paused) await this.resume();
    if (ctx.state === "suspended") await ctx.resume();

    // decode everything first so the crossfade starts in sync
    const buffers = await Promise.all(specs.map((s) => this.getBuffer(s.file)));

    // whatever is sounding leaves over its own preset's fade-out
    const outMs = this.currentFadeOutMs;
    for (const layer of this.active.values()) {
      if (!layer.fading) this.fadeOutLayer(layer, outMs);
    }

    const now = ctx.currentTime;
    const inSecs = Math.max(fadeInMs, 30) / 1000;
    specs.forEach((spec, i) => {
      const key = `L${++this.keyCounter}`;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(Math.max(spec.volume, 0.0001), now + inSecs);
      gain.connect(this.masterGain!);

      const source = ctx.createBufferSource();
      source.buffer = buffers[i];
      source.loop = spec.loop;
      source.connect(gain);
      source.onended = () => {
        gain.disconnect();
        this.active.delete(key);
        if (this.active.size === 0 && !this.paused) {
          this.presetId = null;
          this.presetName = null;
        }
        this.emit();
      };
      source.start(now);

      this.active.set(key, {
        key,
        file: spec.file,
        source,
        gain,
        volume: spec.volume,
        muted: false,
        fading: false,
      });
    });

    this.presetId = presetId;
    this.presetName = presetName;
    this.currentFadeOutMs = nextFadeOutMs;
    this.emit();
  }

  /** Fades everything out using the active preset's fade-out. */
  async stop(fadeMs?: number): Promise<void> {
    if (this.paused) await this.resume();
    const ms = fadeMs ?? this.currentFadeOutMs;
    for (const layer of this.active.values()) {
      if (!layer.fading) this.fadeOutLayer(layer, ms);
    }
    this.presetId = null;
    this.presetName = null;
    this.emit();
  }

  /** The panic button: everything stops in a breath, no questions asked. */
  async panic(): Promise<void> {
    if (this.paused && this.ctx) await this.ctx.resume();
    this.paused = false;
    for (const layer of this.active.values()) {
      this.fadeOutLayer(layer, 80);
    }
    this.presetId = null;
    this.presetName = null;
    this.emit();
  }

  async pause(): Promise<void> {
    if (!this.ctx || this.paused || this.active.size === 0) return;
    await this.ctx.suspend();
    this.paused = true;
    this.emit();
  }

  async resume(): Promise<void> {
    if (!this.ctx || !this.paused) return;
    await this.ctx.resume();
    this.paused = false;
    this.emit();
  }

  /* --------------------------------- mixing -------------------------------- */

  setMaster(v: number): void {
    this.master = v;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(Math.max(v, 0.0001), now + 0.08);
    }
    this.emit();
  }

  setLayerVolume(key: string, v: number): void {
    const layer = this.active.get(key);
    if (!layer || !this.ctx) return;
    layer.volume = v;
    if (!layer.muted) {
      const now = this.ctx.currentTime;
      layer.gain.gain.cancelScheduledValues(now);
      layer.gain.gain.setValueAtTime(layer.gain.gain.value, now);
      layer.gain.gain.linearRampToValueAtTime(Math.max(v, 0.0001), now + 0.06);
    }
    this.emit();
  }

  toggleMute(key: string): void {
    const layer = this.active.get(key);
    if (!layer || !this.ctx) return;
    layer.muted = !layer.muted;
    const now = this.ctx.currentTime;
    const target = layer.muted ? 0.0001 : Math.max(layer.volume, 0.0001);
    layer.gain.gain.cancelScheduledValues(now);
    layer.gain.gain.setValueAtTime(layer.gain.gain.value, now);
    layer.gain.gain.linearRampToValueAtTime(target, now + 0.12);
    this.emit();
  }

  toggleLoop(key: string): void {
    const layer = this.active.get(key);
    if (!layer) return;
    layer.source.loop = !layer.source.loop;
    this.emit();
  }
}

export const engine = new AtmosphereEngine();

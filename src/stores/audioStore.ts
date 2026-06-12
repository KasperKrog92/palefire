import { create } from "zustand";
import { engine, type EngineSnapshot } from "../audio/engine";
import type { AudioFile, Preset, PresetLayer } from "../types";

interface AudioState extends EngineSnapshot {
  playPreset: (
    preset: Preset,
    layers: PresetLayer[],
    files: AudioFile[],
    fallbackFadeMs: number
  ) => Promise<void>;
  preview: (file: AudioFile) => Promise<void>;
  stop: () => Promise<void>;
  panic: () => Promise<void>;
  togglePause: () => Promise<void>;
  setMaster: (v: number) => void;
  setLayerVolume: (key: string, v: number) => void;
  toggleMute: (key: string) => void;
  toggleLoop: (key: string) => void;
}

export const useAudio = create<AudioState>((set) => {
  engine.subscribe((snap) => set(snap));

  return {
    ...engine.snapshot(),

    playPreset: async (preset, layers, files, fallbackFadeMs) => {
      const byId = new Map(files.map((f) => [f.id, f]));
      const specs = layers
        .map((l) => {
          const file = byId.get(l.audio_file_id);
          return file ? { file, volume: l.volume, loop: l.loop !== 0 } : null;
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);
      if (specs.length === 0) return;
      await engine.play(
        preset.id,
        preset.name,
        specs,
        preset.fade_in_ms || fallbackFadeMs,
        preset.fade_out_ms || fallbackFadeMs
      );
    },

    preview: async (file) => {
      await engine.play(null, file.name, [{ file, volume: 0.8, loop: true }], 400, 400);
    },

    stop: () => engine.stop(),
    panic: () => engine.panic(),
    togglePause: async () => {
      if (engine.snapshot().paused) await engine.resume();
      else await engine.pause();
    },
    setMaster: (v) => engine.setMaster(v),
    setLayerVolume: (key, v) => engine.setLayerVolume(key, v),
    toggleMute: (key) => engine.toggleMute(key),
    toggleLoop: (key) => engine.toggleLoop(key),
  };
});

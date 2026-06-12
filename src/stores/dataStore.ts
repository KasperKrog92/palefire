import { create } from "zustand";
import type {
  ArchiveEntry,
  AudioFile,
  LogEntry,
  Preset,
  PresetLayer,
  Scene,
  SceneEntryLink,
} from "../types";
import { archive, audioFiles, logbook, presets, scenes } from "../db/repo";

interface DataState {
  campaignId: number | null;
  scenes: Scene[];
  links: SceneEntryLink[];
  entries: ArchiveEntry[];
  presets: Preset[];
  /** all layers for this campaign's presets, keyed by preset id */
  layersByPreset: Map<number, PresetLayer[]>;
  audioFiles: AudioFile[];
  logs: LogEntry[];

  loadAll: (campaignId: number) => Promise<void>;
  reloadScenes: () => Promise<void>;
  reloadEntries: () => Promise<void>;
  reloadPresets: () => Promise<void>;
  reloadAudioFiles: () => Promise<void>;
  reloadLogs: () => Promise<void>;
  setScenesOptimistic: (s: Scene[]) => void;
  clear: () => void;
}

export const useData = create<DataState>((set, get) => {
  const cid = () => get().campaignId;

  const fetchScenes = async (campaignId: number) => {
    const [sc, li] = await Promise.all([
      scenes.forCampaign(campaignId),
      scenes.linksForCampaign(campaignId),
    ]);
    return { scenes: sc, links: li };
  };

  const fetchPresets = async (campaignId: number) => {
    const [ps, layers] = await Promise.all([
      presets.forCampaign(campaignId),
      presets.layersForCampaign(campaignId),
    ]);
    const byPreset = new Map<number, PresetLayer[]>();
    for (const l of layers) {
      const arr = byPreset.get(l.preset_id) ?? [];
      arr.push(l);
      byPreset.set(l.preset_id, arr);
    }
    return { presets: ps, layersByPreset: byPreset };
  };

  return {
    campaignId: null,
    scenes: [],
    links: [],
    entries: [],
    presets: [],
    layersByPreset: new Map(),
    audioFiles: [],
    logs: [],

    loadAll: async (campaignId) => {
      const [sc, en, pr, au, lo] = await Promise.all([
        fetchScenes(campaignId),
        archive.forCampaign(campaignId),
        fetchPresets(campaignId),
        audioFiles.all(),
        logbook.forCampaign(campaignId),
      ]);
      set({
        campaignId,
        scenes: sc.scenes,
        links: sc.links,
        entries: en,
        presets: pr.presets,
        layersByPreset: pr.layersByPreset,
        audioFiles: au,
        logs: lo,
      });
    },

    reloadScenes: async () => {
      const id = cid();
      if (id != null) set(await fetchScenes(id));
    },

    reloadEntries: async () => {
      const id = cid();
      if (id != null) set({ entries: await archive.forCampaign(id) });
    },

    reloadPresets: async () => {
      const id = cid();
      if (id != null) set(await fetchPresets(id));
    },

    reloadAudioFiles: async () => {
      set({ audioFiles: await audioFiles.all() });
    },

    reloadLogs: async () => {
      const id = cid();
      if (id != null) set({ logs: await logbook.forCampaign(id) });
    },

    setScenesOptimistic: (s) => set({ scenes: s }),

    clear: () =>
      set({
        campaignId: null,
        scenes: [],
        links: [],
        entries: [],
        presets: [],
        layersByPreset: new Map(),
        audioFiles: [],
        logs: [],
      }),
  };
});

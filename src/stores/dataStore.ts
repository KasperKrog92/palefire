import { create } from "zustand";
import type {
  ArchiveEntry,
  AudioFile,
  LogEntry,
  PcConnection,
  PlayerCharacter,
  Preset,
  PresetLayer,
  Scene,
  SceneEntryLink,
  ScenePcLink,
} from "../types";
import {
  archive,
  audioFiles,
  logbook,
  pcConnections,
  playerCharacters,
  presets,
  scenes,
} from "../db/repo";

interface DataState {
  campaignId: number | null;
  scenes: Scene[];
  links: SceneEntryLink[];
  pcLinks: ScenePcLink[];
  entries: ArchiveEntry[];
  presets: Preset[];
  /** all layers for this campaign's presets, keyed by preset id */
  layersByPreset: Map<number, PresetLayer[]>;
  audioFiles: AudioFile[];
  logs: LogEntry[];
  playerCharacters: PlayerCharacter[];
  pcConnections: PcConnection[];

  loadAll: (campaignId: number) => Promise<void>;
  reloadScenes: () => Promise<void>;
  reloadEntries: () => Promise<void>;
  reloadPresets: () => Promise<void>;
  reloadAudioFiles: () => Promise<void>;
  reloadLogs: () => Promise<void>;
  reloadPlayerCharacters: () => Promise<void>;
  reloadPcConnections: () => Promise<void>;
  setScenesOptimistic: (s: Scene[]) => void;
  clear: () => void;
}

export const useData = create<DataState>((set, get) => {
  const cid = () => get().campaignId;

  const fetchScenes = async (campaignId: number) => {
    const [sc, li, pcl] = await Promise.all([
      scenes.forCampaign(campaignId),
      scenes.linksForCampaign(campaignId),
      scenes.pcLinksForCampaign(campaignId),
    ]);
    return { scenes: sc, links: li, pcLinks: pcl };
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
    pcLinks: [],
    entries: [],
    presets: [],
    layersByPreset: new Map(),
    audioFiles: [],
    logs: [],
    playerCharacters: [],
    pcConnections: [],

    loadAll: async (campaignId) => {
      const [sc, en, pr, au, lo, pcs, pcc] = await Promise.all([
        fetchScenes(campaignId),
        archive.forCampaign(campaignId),
        fetchPresets(campaignId),
        audioFiles.all(),
        logbook.forCampaign(campaignId),
        playerCharacters.forCampaign(campaignId),
        pcConnections.forCampaign(campaignId),
      ]);
      set({
        campaignId,
        scenes: sc.scenes,
        links: sc.links,
        pcLinks: sc.pcLinks,
        entries: en,
        presets: pr.presets,
        layersByPreset: pr.layersByPreset,
        audioFiles: au,
        logs: lo,
        playerCharacters: pcs,
        pcConnections: pcc,
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

    reloadPlayerCharacters: async () => {
      const id = cid();
      if (id != null) set({ playerCharacters: await playerCharacters.forCampaign(id) });
    },

    reloadPcConnections: async () => {
      const id = cid();
      if (id != null) set({ pcConnections: await pcConnections.forCampaign(id) });
    },

    setScenesOptimistic: (s) => set({ scenes: s }),

    clear: () =>
      set({
        campaignId: null,
        scenes: [],
        links: [],
        pcLinks: [],
        entries: [],
        presets: [],
        layersByPreset: new Map(),
        audioFiles: [],
        logs: [],
        playerCharacters: [],
        pcConnections: [],
      }),
  };
});

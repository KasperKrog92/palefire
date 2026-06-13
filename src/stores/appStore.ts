import { create } from "zustand";
import type { Campaign } from "../types";
import { campaigns as campaignRepo, settings } from "../db/repo";

export type View =
  | "scenes"
  | "archives"
  | "passengers"
  | "atmosphere"
  | "live"
  | "logbook"
  | "settings";

export type Theme = "dark" | "light";

interface AppState {
  booted: boolean;
  bootError: string | null;
  campaigns: Campaign[];
  campaign: Campaign | null;
  view: View;
  /** cross-view jump target: a view consumes this on mount/update to select an item, then clears it */
  pendingFocus: { view: View; id: number } | null;
  theme: Theme;
  defaultFadeMs: number;

  setBooted: (err?: string) => void;
  loadCampaigns: () => Promise<void>;
  openCampaign: (c: Campaign) => void;
  closeCampaign: () => void;
  refreshCampaign: () => Promise<void>;
  setView: (v: View) => void;
  /** navigate to a view and ask it to focus the item with the given id */
  focus: (view: View, id: number) => void;
  clearFocus: () => void;
  setTheme: (t: Theme) => Promise<void>;
  setDefaultFadeMs: (ms: number) => Promise<void>;
  hydrateSettings: () => Promise<void>;
}

export const useApp = create<AppState>((set, get) => ({
  booted: false,
  bootError: null,
  campaigns: [],
  campaign: null,
  view: "scenes",
  pendingFocus: null,
  theme: "dark",
  defaultFadeMs: 2500,

  setBooted: (err) => set({ booted: true, bootError: err ?? null }),

  loadCampaigns: async () => {
    set({ campaigns: await campaignRepo.all() });
  },

  openCampaign: (c) => set({ campaign: c, view: "scenes" }),

  closeCampaign: () => set({ campaign: null }),

  refreshCampaign: async () => {
    const cur = get().campaign;
    if (!cur) return;
    const fresh = await campaignRepo.byId(cur.id);
    set({ campaign: fresh });
  },

  setView: (v) => set({ view: v }),

  focus: (view, id) => set({ view, pendingFocus: { view, id } }),

  clearFocus: () => set({ pendingFocus: null }),

  setTheme: async (t) => {
    set({ theme: t });
    document.documentElement.dataset.theme = t;
    await settings.set("theme", t);
  },

  setDefaultFadeMs: async (ms) => {
    set({ defaultFadeMs: ms });
    await settings.set("default_fade_ms", String(ms));
  },

  hydrateSettings: async () => {
    const theme = ((await settings.get("theme")) as Theme | null) ?? "dark";
    const fade = Number((await settings.get("default_fade_ms")) ?? "2500");
    document.documentElement.dataset.theme = theme;
    set({ theme, defaultFadeMs: Number.isFinite(fade) ? fade : 2500 });
  },
}));

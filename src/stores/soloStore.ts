import { create } from "zustand";
import { crossings as crossingRepo } from "../solo/repo";
import type { Crossing, CrossingStatus } from "../solo/types";

interface SoloState {
  passengerId: number | null;
  crossings: Crossing[];
  activeCrossing: Crossing | null;
  loading: boolean;
  error: string | null;

  load: (campaignId: number, passengerId: number, crossingId?: number | null) => Promise<void>;
  createCrossing: (campaignId: number, passengerId: number) => Promise<number | null>;
  selectCrossing: (id: number) => void;
  setStatus: (id: number, status: CrossingStatus) => Promise<void>;
  removeCrossing: (id: number) => Promise<void>;
  clear: () => void;
}

let loadSequence = 0;

export const useSolo = create<SoloState>((set, get) => ({
  passengerId: null,
  crossings: [],
  activeCrossing: null,
  loading: false,
  error: null,

  load: async (campaignId, passengerId, crossingId) => {
    const sequence = ++loadSequence;
    set({ passengerId, loading: true, error: null });
    try {
      const items = await crossingRepo.forPassenger(campaignId, passengerId);
      if (sequence !== loadSequence) return;
      const requested = crossingId ? items.find((item) => item.id === crossingId) : null;
      const active =
        requested ??
        items.find((item) => item.status === "open") ??
        items.find((item) => item.status === "adrift") ??
        items[0] ??
        null;
      set({ crossings: items, activeCrossing: active, loading: false });
    } catch (error) {
      if (sequence !== loadSequence) return;
      set({
        crossings: [],
        activeCrossing: null,
        loading: false,
        error: String(error),
      });
    }
  },

  createCrossing: async (campaignId, passengerId) => {
    set({ loading: true, error: null });
    try {
      const id = await crossingRepo.create({ campaign_id: campaignId, pc_id: passengerId });
      await get().load(campaignId, passengerId, id);
      return id;
    } catch (error) {
      set({ loading: false, error: String(error) });
      return null;
    }
  },

  selectCrossing: (id) => {
    const crossing = get().crossings.find((item) => item.id === id) ?? null;
    set({ activeCrossing: crossing });
  },

  setStatus: async (id, status) => {
    const crossing = get().crossings.find((item) => item.id === id);
    if (!crossing) return;
    try {
      await crossingRepo.setStatus(id, status);
      await get().load(crossing.campaign_id, crossing.pc_id, id);
    } catch (error) {
      set({ error: String(error) });
    }
  },

  removeCrossing: async (id) => {
    const crossing = get().crossings.find((item) => item.id === id);
    if (!crossing) return;
    try {
      await crossingRepo.remove(id);
      await get().load(crossing.campaign_id, crossing.pc_id);
    } catch (error) {
      set({ error: String(error) });
    }
  },

  clear: () =>
    {
      loadSequence++;
      set({
        passengerId: null,
        crossings: [],
        activeCrossing: null,
        loading: false,
        error: null,
      });
    },
}));

import { create } from "zustand";
import { useApp } from "./appStore";
import { useData } from "./dataStore";
import {
  crossingMessages,
  crossingSettings,
  crossings as crossingRepo,
} from "../solo/repo";
import {
  anthropicModel,
  createAnthropicProvider,
  describeAnthropicError,
  hasAnthropicApiKey,
} from "../solo/anthropic";
import { buildCrossingContext } from "../solo/context";
import type {
  Crossing,
  CrossingMessage,
  CrossingStatus,
} from "../solo/types";

const EGRESS_ACKNOWLEDGEMENT = "egress_acknowledged_v1";

interface SoloState {
  passengerId: number | null;
  crossings: Crossing[];
  activeCrossing: Crossing | null;
  messages: CrossingMessage[];
  disclosureAcknowledged: boolean;
  providerConfigured: boolean;
  providerModel: string;
  streaming: boolean;
  streamingMessageId: number | null;
  loading: boolean;
  error: string | null;

  load: (campaignId: number, passengerId: number, crossingId?: number | null) => Promise<void>;
  createCrossing: (campaignId: number, passengerId: number) => Promise<number | null>;
  selectCrossing: (id: number) => Promise<void>;
  setStatus: (id: number, status: CrossingStatus) => Promise<void>;
  removeCrossing: (id: number) => Promise<void>;
  acknowledgeDisclosure: () => Promise<void>;
  send: (body: string) => Promise<void>;
  retry: (narratorMessageId: number) => Promise<void>;
  abort: () => void;
  clear: () => void;
}

let loadSequence = 0;
let requestSequence = 0;
let activeController: AbortController | null = null;

export const useSolo = create<SoloState>((set, get) => ({
  passengerId: null,
  crossings: [],
  activeCrossing: null,
  messages: [],
  disclosureAcknowledged: false,
  providerConfigured: hasAnthropicApiKey(),
  providerModel: anthropicModel,
  streaming: false,
  streamingMessageId: null,
  loading: false,
  error: null,

  load: async (campaignId, passengerId, crossingId) => {
    const sequence = ++loadSequence;
    get().abort();
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
      if (active) {
        await crossingMessages.failIncompleteForCrossing(active.id);
      }
      const [messages, acknowledgement] = await Promise.all([
        active ? crossingMessages.forCrossing(active.id) : Promise.resolve([]),
        crossingSettings.get(EGRESS_ACKNOWLEDGEMENT),
      ]);
      if (sequence !== loadSequence) return;
      set({
        crossings: items,
        activeCrossing: active,
        messages,
        disclosureAcknowledged: acknowledgement === "1",
        loading: false,
      });
    } catch (error) {
      if (sequence !== loadSequence) return;
      set({
        crossings: [],
        activeCrossing: null,
        messages: [],
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

  selectCrossing: async (id) => {
    get().abort();
    const crossing = get().crossings.find((item) => item.id === id) ?? null;
    if (!crossing) return;
    set({ activeCrossing: crossing, messages: [], loading: true, error: null });
    try {
      await crossingMessages.failIncompleteForCrossing(id);
      const messages = await crossingMessages.forCrossing(id);
      if (get().activeCrossing?.id !== id) return;
      set({ messages, loading: false });
    } catch (error) {
      set({ loading: false, error: String(error) });
    }
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

  acknowledgeDisclosure: async () => {
    try {
      await crossingSettings.set(EGRESS_ACKNOWLEDGEMENT, "1");
      set({ disclosureAcknowledged: true, error: null });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  send: async (draft) => {
    const body = draft.trim();
    const crossing = get().activeCrossing;
    if (
      !body ||
      !crossing ||
      crossing.status !== "open" ||
      get().streaming ||
      !get().disclosureAcknowledged
    ) {
      return;
    }
    if (!get().providerConfigured) {
      set({
        error:
          "Solo Crossing is not enabled. Add VITE_ANTHROPIC_API_KEY to .env.local and restart Palefire.",
      });
      return;
    }

    try {
      const passengerMessageId = await crossingMessages.create({
        crossing_id: crossing.id,
        role: "passenger",
        body,
      });
      const narratorMessageId = await crossingMessages.create({
        crossing_id: crossing.id,
        role: "narrator",
        body: "",
        status: "streaming",
        reply_to_message_id: passengerMessageId,
      });
      const messages = await crossingMessages.forCrossing(crossing.id);
      set({ messages, error: null });
      await runNarratorTurn(
        crossing,
        narratorMessageId,
        set,
        get
      );
    } catch (error) {
      set({ error: String(error), streaming: false, streamingMessageId: null });
    }
  },

  retry: async (narratorMessageId) => {
    const crossing = get().activeCrossing;
    const narrator = get().messages.find(
      (message) =>
        message.id === narratorMessageId &&
        message.role === "narrator" &&
        message.status === "failed"
    );
    if (
      !crossing ||
      !narrator?.reply_to_message_id ||
      get().streaming ||
      !get().disclosureAcknowledged ||
      !get().providerConfigured
    ) {
      return;
    }

    try {
      await crossingMessages.update(narrator.id, {
        body: "",
        status: "streaming",
        provider_id: null,
        stop_reason: null,
      });
      set({
        messages: get().messages.map((message) =>
          message.id === narrator.id
            ? {
                ...message,
                body: "",
                status: "streaming",
                provider_id: null,
                stop_reason: null,
              }
            : message
        ),
        error: null,
      });
      await runNarratorTurn(crossing, narrator.id, set, get);
    } catch (error) {
      set({ error: String(error), streaming: false, streamingMessageId: null });
    }
  },

  abort: () => {
    activeController?.abort();
  },

  clear: () =>
    {
      loadSequence++;
      get().abort();
      set({
        passengerId: null,
        crossings: [],
        activeCrossing: null,
        messages: [],
        disclosureAcknowledged: false,
        streaming: false,
        streamingMessageId: null,
        loading: false,
        error: null,
      });
    },
}));

type SoloSet = (partial: Partial<SoloState>) => void;
type SoloGet = () => SoloState;

async function runNarratorTurn(
  crossing: Crossing,
  narratorMessageId: number,
  set: SoloSet,
  get: SoloGet
): Promise<void> {
  const sequence = ++requestSequence;
  const controller = new AbortController();
  activeController = controller;
  set({
    streaming: true,
    streamingMessageId: narratorMessageId,
    error: null,
  });

  let body = "";
  let lastPersistedAt = 0;

  try {
    const campaign = useApp.getState().campaign;
    const data = useData.getState();
    const passenger = data.playerCharacters.find(
      (item) => item.id === crossing.pc_id
    );
    if (!campaign || campaign.id !== crossing.campaign_id || !passenger) {
      throw new Error("The passenger or campaign is no longer available.");
    }

    const allMessages = await crossingMessages.forCrossing(crossing.id);
    const context = buildCrossingContext({
      campaign,
      crossing,
      passenger,
      passengers: data.playerCharacters,
      entries: data.entries,
      connections: data.pcConnections,
      messages: allMessages,
    });
    const provider = await createAnthropicProvider();

    for await (const chunk of provider.stream({
      ...context,
      signal: controller.signal,
    })) {
      if (sequence !== requestSequence) return;

      if (chunk.type === "text") {
        body += chunk.text;
        updateNarratorInState(set, get, narratorMessageId, body, "streaming");
        if (Date.now() - lastPersistedAt >= 180) {
          await crossingMessages.updateStreamingBody(narratorMessageId, body);
          lastPersistedAt = Date.now();
        }
        continue;
      }

      body = chunk.text || body;
      await crossingMessages.update(narratorMessageId, {
        body,
        status: "complete",
        provider_id: chunk.providerId,
        stop_reason: chunk.stopReason,
      });
      await crossingRepo.addUsage(
        crossing.id,
        chunk.inputTokens,
        chunk.outputTokens,
        0
      );
      updateNarratorInState(set, get, narratorMessageId, body, "complete", {
        providerId: chunk.providerId,
        stopReason: chunk.stopReason,
      });
      await refreshCrossing(crossing.id, set, get);
    }
  } catch (error) {
    if (sequence !== requestSequence) return;
    const aborted = controller.signal.aborted;
    await crossingMessages.update(narratorMessageId, {
      body,
      status: "failed",
      provider_id: null,
      stop_reason: aborted ? "aborted" : "error",
    });
    updateNarratorInState(set, get, narratorMessageId, body, "failed", {
      stopReason: aborted ? "aborted" : "error",
    });
    set({
      error: aborted
        ? null
        : error instanceof Error &&
            error.message === "The passenger or campaign is no longer available."
          ? error.message
          : describeAnthropicError(error),
    });
  } finally {
    if (sequence === requestSequence) {
      activeController = null;
      set({ streaming: false, streamingMessageId: null });
    }
  }
}

function updateNarratorInState(
  set: SoloSet,
  get: SoloGet,
  id: number,
  body: string,
  status: CrossingMessage["status"],
  metadata?: { providerId?: string; stopReason?: string | null }
) {
  set({
    messages: get().messages.map((message) =>
      message.id === id
        ? {
            ...message,
            body,
            status,
            provider_id: metadata?.providerId ?? message.provider_id,
            stop_reason:
              metadata?.stopReason === undefined
                ? message.stop_reason
                : metadata.stopReason,
          }
        : message
    ),
  });
}

async function refreshCrossing(
  id: number,
  set: SoloSet,
  get: SoloGet
): Promise<void> {
  const refreshed = await crossingRepo.byId(id);
  if (!refreshed) return;
  set({
    crossings: get().crossings.map((item) =>
      item.id === id ? refreshed : item
    ),
    activeCrossing:
      get().activeCrossing?.id === id ? refreshed : get().activeCrossing,
  });
}

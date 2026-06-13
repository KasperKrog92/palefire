import { soloExecute, soloSelect } from "./db";
import type {
  Crossing,
  CrossingMemory,
  CrossingMemoryKind,
  CrossingMemoryStatus,
  CrossingMessage,
  CrossingMessageRole,
  CrossingMessageStatus,
  CrossingStatus,
  CrossingSuggestion,
  CrossingSuggestionKind,
  CrossingSuggestionStatus,
} from "./types";

const now = () => new Date().toISOString().replace("T", " ").slice(0, 19);

export const crossings = {
  forPassenger: (campaignId: number, pcId: number) =>
    soloSelect<Crossing>(
      "SELECT * FROM crossings WHERE campaign_id = ? AND pc_id = ? ORDER BY updated_at DESC, id DESC",
      [campaignId, pcId]
    ),

  byId: async (id: number) =>
    (await soloSelect<Crossing>("SELECT * FROM crossings WHERE id = ?", [id]))[0] ?? null,

  create: async (crossing: { campaign_id: number; pc_id: number; title?: string }) => {
    const result = await soloExecute(
      "INSERT INTO crossings (campaign_id, pc_id, title) VALUES (?, ?, ?)",
      [crossing.campaign_id, crossing.pc_id, crossing.title?.trim() ?? ""]
    );
    return result.lastInsertId!;
  },

  rename: (id: number, title: string) =>
    soloExecute("UPDATE crossings SET title = ?, updated_at = ? WHERE id = ?", [
      title.trim(),
      now(),
      id,
    ]),

  setStatus: (id: number, status: CrossingStatus) =>
    soloExecute("UPDATE crossings SET status = ?, updated_at = ? WHERE id = ?", [
      status,
      now(),
      id,
    ]),

  updateSummary: (id: number, summary: string) =>
    soloExecute("UPDATE crossings SET summary = ?, updated_at = ? WHERE id = ?", [
      summary,
      now(),
      id,
    ]),

  addUsage: (id: number, inputTokens: number, outputTokens: number, costUsd: number) =>
    soloExecute(
      "UPDATE crossings SET input_tokens = input_tokens + ?, output_tokens = output_tokens + ?, estimated_cost_usd = estimated_cost_usd + ?, updated_at = ? WHERE id = ?",
      [inputTokens, outputTokens, costUsd, now(), id]
    ),

  remove: (id: number) => soloExecute("DELETE FROM crossings WHERE id = ?", [id]),
};

export const crossingMessages = {
  forCrossing: (crossingId: number) =>
    soloSelect<CrossingMessage>(
      "SELECT * FROM crossing_messages WHERE crossing_id = ? ORDER BY id",
      [crossingId]
    ),

  create: async (message: {
    crossing_id: number;
    role: CrossingMessageRole;
    body: string;
    status?: CrossingMessageStatus;
    reply_to_message_id?: number | null;
  }) => {
    const result = await soloExecute(
      "INSERT INTO crossing_messages (crossing_id, role, body, status, reply_to_message_id) VALUES (?, ?, ?, ?, ?)",
      [
        message.crossing_id,
        message.role,
        message.body,
        message.status ?? "complete",
        message.reply_to_message_id ?? null,
      ]
    );
    await soloExecute("UPDATE crossings SET updated_at = ? WHERE id = ?", [
      now(),
      message.crossing_id,
    ]);
    return result.lastInsertId!;
  },

  update: (
    id: number,
    message: {
      body: string;
      status: CrossingMessageStatus;
      provider_id?: string | null;
      stop_reason?: string | null;
    }
  ) =>
    soloExecute(
      "UPDATE crossing_messages SET body = ?, status = ?, provider_id = ?, stop_reason = ? WHERE id = ?",
      [
        message.body,
        message.status,
        message.provider_id ?? null,
        message.stop_reason ?? null,
        id,
      ]
    ),

  updateStreamingBody: (id: number, body: string) =>
    soloExecute(
      "UPDATE crossing_messages SET body = ? WHERE id = ? AND status = 'streaming'",
      [body, id]
    ),

  failIncompleteForCrossing: (crossingId: number) =>
    soloExecute(
      "UPDATE crossing_messages SET status = 'failed', stop_reason = 'interrupted' WHERE crossing_id = ? AND status = 'streaming'",
      [crossingId]
    ),

  setInContext: (ids: number[], inContext: boolean) =>
    Promise.all(
      ids.map((id) =>
        soloExecute("UPDATE crossing_messages SET in_context = ? WHERE id = ?", [
          inContext ? 1 : 0,
          id,
        ])
      )
    ),

  remove: (id: number) => soloExecute("DELETE FROM crossing_messages WHERE id = ?", [id]),
};

export const crossingMemories = {
  forCrossing: (crossingId: number) =>
    soloSelect<CrossingMemory>(
      "SELECT * FROM crossing_memories WHERE crossing_id = ? ORDER BY created_at, id",
      [crossingId]
    ),

  create: async (memory: {
    crossing_id: number | null;
    campaign_id: number;
    pc_id: number | null;
    kind: CrossingMemoryKind;
    title: string;
    body: string;
    source_message_id?: number | null;
  }) => {
    const result = await soloExecute(
      "INSERT INTO crossing_memories (crossing_id, campaign_id, pc_id, kind, title, body, source_message_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        memory.crossing_id,
        memory.campaign_id,
        memory.pc_id,
        memory.kind,
        memory.title,
        memory.body,
        memory.source_message_id ?? null,
      ]
    );
    return result.lastInsertId!;
  },

  setStatus: (id: number, status: CrossingMemoryStatus) =>
    soloExecute("UPDATE crossing_memories SET status = ? WHERE id = ?", [status, id]),

  markPromoted: (id: number, promotedTo: string) =>
    soloExecute("UPDATE crossing_memories SET promoted_to = ? WHERE id = ?", [promotedTo, id]),

  remove: (id: number) => soloExecute("DELETE FROM crossing_memories WHERE id = ?", [id]),
};

export const crossingSuggestions = {
  forCrossing: (crossingId: number) =>
    soloSelect<CrossingSuggestion>(
      "SELECT * FROM crossing_suggestions WHERE crossing_id = ? ORDER BY created_at, id",
      [crossingId]
    ),

  create: async (suggestion: {
    crossing_id: number;
    source_message_id: number;
    kind: CrossingSuggestionKind;
    payload: unknown;
  }) => {
    const result = await soloExecute(
      "INSERT INTO crossing_suggestions (crossing_id, source_message_id, kind, payload_json) VALUES (?, ?, ?, ?)",
      [
        suggestion.crossing_id,
        suggestion.source_message_id,
        suggestion.kind,
        JSON.stringify(suggestion.payload),
      ]
    );
    return result.lastInsertId!;
  },

  setStatus: (id: number, status: CrossingSuggestionStatus) =>
    soloExecute("UPDATE crossing_suggestions SET status = ? WHERE id = ?", [status, id]),

  remove: (id: number) => soloExecute("DELETE FROM crossing_suggestions WHERE id = ?", [id]),
};

export const crossingSettings = {
  get: async (key: string): Promise<string | null> => {
    const rows = await soloSelect<{ value: string }>(
      "SELECT value FROM crossing_settings WHERE key = ?",
      [key]
    );
    return rows[0]?.value ?? null;
  },

  set: (key: string, value: string) =>
    soloExecute(
      "INSERT INTO crossing_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value]
    ),
};

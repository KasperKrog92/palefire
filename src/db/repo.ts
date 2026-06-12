import { execute, select } from "./db";
import type {
  ArchiveCategory,
  ArchiveEntry,
  AudioFile,
  Campaign,
  LogEntry,
  Preset,
  PresetLayer,
  Scene,
} from "../types";

const now = () => new Date().toISOString().replace("T", " ").slice(0, 19);

/* ---------------------------------- campaigns ---------------------------------- */

export const campaigns = {
  all: () => select<Campaign>("SELECT * FROM campaigns ORDER BY updated_at DESC"),

  byId: async (id: number) =>
    (await select<Campaign>("SELECT * FROM campaigns WHERE id = ?", [id]))[0] ?? null,

  create: async (c: { title: string; description: string; cover_image: string | null }) => {
    const r = await execute(
      "INSERT INTO campaigns (title, description, cover_image) VALUES (?, ?, ?)",
      [c.title, c.description, c.cover_image]
    );
    return r.lastInsertId!;
  },

  update: (id: number, c: { title: string; description: string; cover_image: string | null }) =>
    execute(
      "UPDATE campaigns SET title = ?, description = ?, cover_image = ?, updated_at = ? WHERE id = ?",
      [c.title, c.description, c.cover_image, now(), id]
    ),

  touch: (id: number) => execute("UPDATE campaigns SET updated_at = ? WHERE id = ?", [now(), id]),

  setActiveScene: (id: number, sceneId: number | null) =>
    execute("UPDATE campaigns SET active_scene_id = ? WHERE id = ?", [sceneId, id]),

  remove: (id: number) => execute("DELETE FROM campaigns WHERE id = ?", [id]),
};

/* ----------------------------------- scenes ------------------------------------ */

export const scenes = {
  forCampaign: (campaignId: number) =>
    select<Scene>("SELECT * FROM scenes WHERE campaign_id = ? ORDER BY position", [campaignId]),

  create: async (s: {
    campaign_id: number;
    title: string;
    notes: string;
    preset_id: number | null;
    background_image: string | null;
  }) => {
    const [{ p }] = await select<{ p: number }>(
      "SELECT COALESCE(MAX(position) + 1, 0) AS p FROM scenes WHERE campaign_id = ?",
      [s.campaign_id]
    );
    const r = await execute(
      "INSERT INTO scenes (campaign_id, title, notes, position, preset_id, background_image) VALUES (?, ?, ?, ?, ?, ?)",
      [s.campaign_id, s.title, s.notes, p, s.preset_id, s.background_image]
    );
    return r.lastInsertId!;
  },

  update: (
    id: number,
    s: { title: string; notes: string; preset_id: number | null; background_image: string | null }
  ) =>
    execute(
      "UPDATE scenes SET title = ?, notes = ?, preset_id = ?, background_image = ?, updated_at = ? WHERE id = ?",
      [s.title, s.notes, s.preset_id, s.background_image, now(), id]
    ),

  reorder: async (orderedIds: number[]) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await execute("UPDATE scenes SET position = ? WHERE id = ?", [i, orderedIds[i]]);
    }
  },

  duplicate: async (id: number) => {
    const [src] = await select<Scene>("SELECT * FROM scenes WHERE id = ?", [id]);
    if (!src) return null;
    const newId = await scenes.create({
      campaign_id: src.campaign_id,
      title: `${src.title} (copy)`,
      notes: src.notes,
      preset_id: src.preset_id,
      background_image: src.background_image,
    });
    const links = await select<{ entry_id: number }>(
      "SELECT entry_id FROM scene_entry_links WHERE scene_id = ?",
      [id]
    );
    for (const l of links) {
      await execute("INSERT INTO scene_entry_links (scene_id, entry_id) VALUES (?, ?)", [
        newId,
        l.entry_id,
      ]);
    }
    return newId;
  },

  remove: (id: number) => execute("DELETE FROM scenes WHERE id = ?", [id]),

  linkedEntryIds: async (sceneId: number) =>
    (
      await select<{ entry_id: number }>(
        "SELECT entry_id FROM scene_entry_links WHERE scene_id = ?",
        [sceneId]
      )
    ).map((r) => r.entry_id),

  setLinkedEntries: async (sceneId: number, entryIds: number[]) => {
    await execute("DELETE FROM scene_entry_links WHERE scene_id = ?", [sceneId]);
    for (const e of entryIds) {
      await execute("INSERT INTO scene_entry_links (scene_id, entry_id) VALUES (?, ?)", [
        sceneId,
        e,
      ]);
    }
  },

  linksForCampaign: (campaignId: number) =>
    select<import("../types").SceneEntryLink>(
      "SELECT l.scene_id, l.entry_id FROM scene_entry_links l JOIN scenes s ON s.id = l.scene_id WHERE s.campaign_id = ?",
      [campaignId]
    ),

  scenesLinkedToEntry: (entryId: number) =>
    select<Scene>(
      "SELECT s.* FROM scenes s JOIN scene_entry_links l ON l.scene_id = s.id WHERE l.entry_id = ? ORDER BY s.position",
      [entryId]
    ),
};

/* ---------------------------------- archives ----------------------------------- */

export const archive = {
  forCampaign: (campaignId: number) =>
    select<ArchiveEntry>(
      "SELECT * FROM archive_entries WHERE campaign_id = ? ORDER BY title COLLATE NOCASE",
      [campaignId]
    ),

  create: async (e: {
    campaign_id: number;
    category: ArchiveCategory;
    title: string;
    body: string;
    tags: string;
    image: string | null;
  }) => {
    const r = await execute(
      "INSERT INTO archive_entries (campaign_id, category, title, body, tags, image) VALUES (?, ?, ?, ?, ?, ?)",
      [e.campaign_id, e.category, e.title, e.body, e.tags, e.image]
    );
    return r.lastInsertId!;
  },

  update: (
    id: number,
    e: { category: ArchiveCategory; title: string; body: string; tags: string; image: string | null }
  ) =>
    execute(
      "UPDATE archive_entries SET category = ?, title = ?, body = ?, tags = ?, image = ?, updated_at = ? WHERE id = ?",
      [e.category, e.title, e.body, e.tags, e.image, now(), id]
    ),

  remove: (id: number) => execute("DELETE FROM archive_entries WHERE id = ?", [id]),
};

/* ------------------------------- audio + presets ------------------------------- */

export const audioFiles = {
  all: () => select<AudioFile>("SELECT * FROM audio_files ORDER BY name COLLATE NOCASE"),

  create: async (name: string, source: string) => {
    const r = await execute("INSERT INTO audio_files (name, source) VALUES (?, ?)", [name, source]);
    return r.lastInsertId!;
  },

  rename: (id: number, name: string) =>
    execute("UPDATE audio_files SET name = ? WHERE id = ?", [name, id]),

  remove: (id: number) => execute("DELETE FROM audio_files WHERE id = ?", [id]),
};

export const presets = {
  forCampaign: (campaignId: number) =>
    select<Preset>("SELECT * FROM presets WHERE campaign_id = ? ORDER BY name COLLATE NOCASE", [
      campaignId,
    ]),

  layers: (presetId: number) =>
    select<PresetLayer>("SELECT * FROM preset_layers WHERE preset_id = ? ORDER BY position", [
      presetId,
    ]),

  layersForCampaign: (campaignId: number) =>
    select<PresetLayer>(
      "SELECT pl.* FROM preset_layers pl JOIN presets p ON p.id = pl.preset_id WHERE p.campaign_id = ? ORDER BY pl.position",
      [campaignId]
    ),

  create: async (p: {
    campaign_id: number;
    name: string;
    description: string;
    fade_in_ms: number;
    fade_out_ms: number;
  }) => {
    const r = await execute(
      "INSERT INTO presets (campaign_id, name, description, fade_in_ms, fade_out_ms) VALUES (?, ?, ?, ?, ?)",
      [p.campaign_id, p.name, p.description, p.fade_in_ms, p.fade_out_ms]
    );
    return r.lastInsertId!;
  },

  update: (
    id: number,
    p: { name: string; description: string; fade_in_ms: number; fade_out_ms: number }
  ) =>
    execute(
      "UPDATE presets SET name = ?, description = ?, fade_in_ms = ?, fade_out_ms = ? WHERE id = ?",
      [p.name, p.description, p.fade_in_ms, p.fade_out_ms, id]
    ),

  setLayers: async (
    presetId: number,
    layers: { audio_file_id: number; volume: number; loop: number }[]
  ) => {
    await execute("DELETE FROM preset_layers WHERE preset_id = ?", [presetId]);
    for (let i = 0; i < layers.length; i++) {
      const l = layers[i];
      await execute(
        "INSERT INTO preset_layers (preset_id, audio_file_id, volume, loop, position) VALUES (?, ?, ?, ?, ?)",
        [presetId, l.audio_file_id, l.volume, l.loop, i]
      );
    }
  },

  remove: (id: number) => execute("DELETE FROM presets WHERE id = ?", [id]),
};

/* ----------------------------------- logbook ----------------------------------- */

export const logbook = {
  forCampaign: (campaignId: number) =>
    select<LogEntry>("SELECT * FROM log_entries WHERE campaign_id = ? ORDER BY created_at DESC, id DESC", [
      campaignId,
    ]),

  create: async (campaignId: number, body: string) => {
    const r = await execute(
      "INSERT INTO log_entries (campaign_id, body, created_at) VALUES (?, ?, ?)",
      [campaignId, body, now()]
    );
    return r.lastInsertId!;
  },

  remove: (id: number) => execute("DELETE FROM log_entries WHERE id = ?", [id]),
};

/* ----------------------------------- settings ---------------------------------- */

export const settings = {
  get: async (key: string): Promise<string | null> => {
    const rows = await select<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key]);
    return rows[0]?.value ?? null;
  },

  set: (key: string, value: string) =>
    execute(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value]
    ),
};

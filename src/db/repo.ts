import { execute, select } from "./db";
import type {
  ArchiveCategory,
  ArchiveEntry,
  AudioFile,
  Campaign,
  LogEntry,
  PcConnection,
  PcConnectionKind,
  PcLogEntry,
  PlayerCharacter,
  Preset,
  PresetLayer,
  Scene,
  ScenePcLink,
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
    const pcLinks = await select<{ pc_id: number }>(
      "SELECT pc_id FROM scene_pc_links WHERE scene_id = ?",
      [id]
    );
    for (const l of pcLinks) {
      await execute("INSERT INTO scene_pc_links (scene_id, pc_id) VALUES (?, ?)", [newId, l.pc_id]);
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

  linkedPcIds: async (sceneId: number) =>
    (
      await select<{ pc_id: number }>("SELECT pc_id FROM scene_pc_links WHERE scene_id = ?", [
        sceneId,
      ])
    ).map((r) => r.pc_id),

  setLinkedPcs: async (sceneId: number, pcIds: number[]) => {
    await execute("DELETE FROM scene_pc_links WHERE scene_id = ?", [sceneId]);
    for (const p of pcIds) {
      await execute("INSERT INTO scene_pc_links (scene_id, pc_id) VALUES (?, ?)", [sceneId, p]);
    }
  },

  pcLinksForCampaign: (campaignId: number) =>
    select<ScenePcLink>(
      "SELECT l.scene_id, l.pc_id FROM scene_pc_links l JOIN scenes s ON s.id = l.scene_id WHERE s.campaign_id = ?",
      [campaignId]
    ),

  scenesLinkedToPc: (pcId: number) =>
    select<Scene>(
      "SELECT s.* FROM scenes s JOIN scene_pc_links l ON l.scene_id = s.id WHERE l.pc_id = ? ORDER BY s.position",
      [pcId]
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

  remove: async (id: number) => {
    // pc_connections.target_id is not a foreign key (it's polymorphic), so
    // clear any passenger links pointing at this entry before deleting it.
    await pcConnections.removeForArchiveEntry(id);
    await execute("DELETE FROM archive_entries WHERE id = ?", [id]);
  },
};

/* ------------------------------- player characters ----------------------------- */

export const playerCharacters = {
  forCampaign: (campaignId: number) =>
    select<PlayerCharacter>(
      "SELECT * FROM player_characters WHERE campaign_id = ? ORDER BY position",
      [campaignId]
    ),

  create: async (c: {
    campaign_id: number;
    name: string;
    player: string;
    concept: string;
    pronouns: string;
    age: string;
    image: string | null;
    expertise: string;
    carrying: string;
    left_behind: string;
    comfort: string;
    question: string;
    the_pull: string;
    overview: string;
    secret: string;
    ferry_needs: string;
  }) => {
    const [{ p }] = await select<{ p: number }>(
      "SELECT COALESCE(MAX(position) + 1, 0) AS p FROM player_characters WHERE campaign_id = ?",
      [c.campaign_id]
    );
    const r = await execute(
      "INSERT INTO player_characters (campaign_id, name, player, concept, pronouns, age, image, expertise, carrying, left_behind, comfort, question, the_pull, overview, secret, ferry_needs, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        c.campaign_id,
        c.name,
        c.player,
        c.concept,
        c.pronouns,
        c.age,
        c.image,
        c.expertise,
        c.carrying,
        c.left_behind,
        c.comfort,
        c.question,
        c.the_pull,
        c.overview,
        c.secret,
        c.ferry_needs,
        p,
      ]
    );
    return r.lastInsertId!;
  },

  update: (
    id: number,
    c: {
      name: string;
      player: string;
      concept: string;
      pronouns: string;
      age: string;
      image: string | null;
      expertise: string;
      carrying: string;
      left_behind: string;
      comfort: string;
      question: string;
      the_pull: string;
      overview: string;
      secret: string;
      ferry_needs: string;
    }
  ) =>
    execute(
      "UPDATE player_characters SET name = ?, player = ?, concept = ?, pronouns = ?, age = ?, image = ?, expertise = ?, carrying = ?, left_behind = ?, comfort = ?, question = ?, the_pull = ?, overview = ?, secret = ?, ferry_needs = ?, updated_at = ? WHERE id = ?",
      [
        c.name,
        c.player,
        c.concept,
        c.pronouns,
        c.age,
        c.image,
        c.expertise,
        c.carrying,
        c.left_behind,
        c.comfort,
        c.question,
        c.the_pull,
        c.overview,
        c.secret,
        c.ferry_needs,
        now(),
        id,
      ]
    ),

  /** Cheap inline writes for the attribute dots and condition chips touched mid-session. */
  setStats: (
    id: number,
    s: { body: number; wits: number; heart: number; resolve: number; conditions: string }
  ) =>
    execute(
      "UPDATE player_characters SET body = ?, wits = ?, heart = ?, resolve = ?, conditions = ?, updated_at = ? WHERE id = ?",
      [s.body, s.wits, s.heart, s.resolve, s.conditions, now(), id]
    ),

  reorder: async (orderedIds: number[]) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await execute("UPDATE player_characters SET position = ? WHERE id = ?", [i, orderedIds[i]]);
    }
  },

  remove: async (id: number) => {
    // The PC's own connections cascade via FK, but ('pc', id) rows pointing AT
    // this PC from other passengers are polymorphic (no FK) — clear both directions.
    await execute("DELETE FROM pc_connections WHERE pc_id = ?", [id]);
    await execute("DELETE FROM pc_connections WHERE target_kind = 'pc' AND target_id = ?", [id]);
    await execute("DELETE FROM player_characters WHERE id = ?", [id]);
  },
};

export const pcConnections = {
  forCampaign: (campaignId: number) =>
    select<PcConnection>(
      "SELECT c.* FROM pc_connections c JOIN player_characters p ON p.id = c.pc_id WHERE p.campaign_id = ? ORDER BY c.pc_id, c.position",
      [campaignId]
    ),

  forPc: (pcId: number) =>
    select<PcConnection>("SELECT * FROM pc_connections WHERE pc_id = ? ORDER BY position", [pcId]),

  add: async (c: {
    pc_id: number;
    target_kind: PcConnectionKind;
    target_id: number;
    relationship: string;
  }) => {
    const [{ p }] = await select<{ p: number }>(
      "SELECT COALESCE(MAX(position) + 1, 0) AS p FROM pc_connections WHERE pc_id = ?",
      [c.pc_id]
    );
    const r = await execute(
      "INSERT INTO pc_connections (pc_id, target_kind, target_id, relationship, position) VALUES (?, ?, ?, ?, ?)",
      [c.pc_id, c.target_kind, c.target_id, c.relationship, p]
    );
    return r.lastInsertId!;
  },

  updateNote: (id: number, relationship: string) =>
    execute("UPDATE pc_connections SET relationship = ? WHERE id = ?", [relationship, id]),

  remove: (id: number) => execute("DELETE FROM pc_connections WHERE id = ?", [id]),

  removeForArchiveEntry: (entryId: number) =>
    execute("DELETE FROM pc_connections WHERE target_kind = 'archive' AND target_id = ?", [
      entryId,
    ]),
};

export const pcLog = {
  forPc: (pcId: number) =>
    select<PcLogEntry>(
      "SELECT * FROM pc_log_entries WHERE pc_id = ? ORDER BY created_at DESC, id DESC",
      [pcId]
    ),

  create: async (pcId: number, body: string) => {
    const r = await execute("INSERT INTO pc_log_entries (pc_id, body, created_at) VALUES (?, ?, ?)", [
      pcId,
      body,
      now(),
    ]);
    return r.lastInsertId!;
  },

  remove: (id: number) => execute("DELETE FROM pc_log_entries WHERE id = ?", [id]),
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

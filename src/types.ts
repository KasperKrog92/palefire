export interface Campaign {
  id: number;
  title: string;
  description: string;
  cover_image: string | null;
  active_scene_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: number;
  campaign_id: number;
  title: string;
  notes: string;
  position: number;
  preset_id: number | null;
  background_image: string | null;
  created_at: string;
  updated_at: string;
}

export type ArchiveCategory = "character" | "location" | "faction" | "note";

export const ARCHIVE_CATEGORIES: { id: ArchiveCategory; label: string; plural: string }[] = [
  { id: "character", label: "Character", plural: "Characters" },
  { id: "location", label: "Location", plural: "Locations" },
  { id: "faction", label: "Faction", plural: "Factions" },
  { id: "note", label: "Note", plural: "Notes" },
];

export interface ArchiveEntry {
  id: number;
  campaign_id: number;
  category: ArchiveCategory;
  title: string;
  body: string;
  tags: string;
  image: string | null;
  created_at: string;
  updated_at: string;
}

export interface AudioFile {
  id: number;
  name: string;
  /** "file:<name>" for imported sounds stored under data/audio */
  source: string;
  created_at: string;
}

export interface Preset {
  id: number;
  campaign_id: number;
  name: string;
  description: string;
  fade_in_ms: number;
  fade_out_ms: number;
  created_at: string;
}

export interface PresetLayer {
  id: number;
  preset_id: number;
  audio_file_id: number;
  volume: number;
  loop: number;
  position: number;
}

export interface SceneEntryLink {
  scene_id: number;
  entry_id: number;
}

export interface LogEntry {
  id: number;
  campaign_id: number;
  body: string;
  created_at: string;
}

/** A player character — a "passenger" aboard the Night Ferry. */
export interface PlayerCharacter {
  id: number;
  campaign_id: number;
  name: string;
  player: string;
  concept: string;
  pronouns: string;
  age: string;
  image: string | null;

  // attributes, rated 1..5
  body: number;
  wits: number;
  heart: number;
  resolve: number;
  expertise: string;

  /** comma keys: chilled,hurt,spent,shaken,adrift,haunted */
  conditions: string;

  // boarding prompts
  carrying: string;
  left_behind: string;
  comfort: string;
  question: string;
  the_pull: string;

  // narrative
  overview: string;
  secret: string;
  ferry_needs: string;

  position: number;
  created_at: string;
  updated_at: string;
}

export type PcConnectionKind = "archive" | "pc";

/** A structured link from a passenger to an Archive entry or another passenger. */
export interface PcConnection {
  id: number;
  pc_id: number;
  target_kind: PcConnectionKind;
  /** archive_entries.id when target_kind is "archive", player_characters.id when "pc" */
  target_id: number;
  relationship: string;
  position: number;
}

export interface PcLogEntry {
  id: number;
  pc_id: number;
  body: string;
  created_at: string;
}

export interface ScenePcLink {
  scene_id: number;
  pc_id: number;
}

export type PcAttribute = "body" | "wits" | "heart" | "resolve";

/** The four passenger attributes, in sheet order. Edited as 1..5 dot ratings. */
export const PC_ATTRIBUTES: { key: PcAttribute; label: string; blurb: string }[] = [
  {
    key: "body",
    label: "Body",
    blurb: "Strength, stamina, a steady hand — the work of ropes, weather, and hard nights.",
  },
  {
    key: "wits",
    label: "Wits",
    blurb: "Perception and reason; noticing the small changes before they grow large.",
  },
  {
    key: "heart",
    label: "Heart",
    blurb: "Warmth and empathy; the nerve to sit with someone else's grief.",
  },
  {
    key: "resolve",
    label: "Resolve",
    blurb: "Composure against the strange; the will to hold a door shut.",
  },
];

export type PcConditionTrack = "body" | "nerve";

/** The six conditions, in two tracks of three. A full track makes a passenger Overcome. */
export const PC_CONDITIONS: { key: string; label: string; track: PcConditionTrack; meaning: string }[] = [
  { key: "chilled", label: "Chilled", track: "body", meaning: "The cold gets in; everything is a little harder." },
  { key: "hurt", label: "Hurt", track: "body", meaning: "An injury that wants attention." },
  { key: "spent", label: "Spent", track: "body", meaning: "Out of strength; needs rest, food, the engine's warmth." },
  { key: "shaken", label: "Shaken", track: "nerve", meaning: "Frightened; the hands won't stay quite still." },
  { key: "adrift", label: "Adrift", track: "nerve", meaning: "Unmoored, hopeless; the shore feels imaginary." },
  { key: "haunted", label: "Haunted", track: "nerve", meaning: "Carrying something witnessed that won't let go." },
];

/** True when a passenger has taken every condition of at least one track. */
export function isOvercome(conditions: string[]): boolean {
  const taken = new Set(conditions);
  const tracks: PcConditionTrack[] = ["body", "nerve"];
  return tracks.some((track) => {
    const keys = PC_CONDITIONS.filter((c) => c.track === track).map((c) => c.key);
    return keys.length > 0 && keys.every((k) => taken.has(k));
  });
}

export function parseTags(tags: string): string[] {
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function joinTags(tags: string[]): string {
  return tags.map((t) => t.trim()).filter(Boolean).join(", ");
}

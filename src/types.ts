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
  /** "builtin:engine-hum.wav" for bundled loops, "file:<name>" for imports under data/audio */
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

export function parseTags(tags: string): string[] {
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function joinTags(tags: string[]): string {
  return tags.map((t) => t.trim()).filter(Boolean).join(", ");
}

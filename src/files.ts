import { appDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { copyFile, exists, mkdir, readFile, remove } from "@tauri-apps/plugin-fs";

let dataDir: string | null = null;

export async function getDataDir(): Promise<string> {
  if (!dataDir) dataDir = await appDataDir();
  return dataDir;
}

export async function ensureDirs(): Promise<void> {
  const base = await getDataDir();
  for (const sub of ["images", "audio"]) {
    const dir = await join(base, sub);
    if (!(await exists(dir))) await mkdir(dir, { recursive: true });
  }
}

function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function uniqueName(original: string): string {
  const dot = original.lastIndexOf(".");
  const stem = (dot > 0 ? original.slice(0, dot) : original)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const ext = dot > 0 ? original.slice(dot).toLowerCase() : "";
  return `${Date.now().toString(36)}-${stem || "file"}${ext}`;
}

/** Opens a picker and copies the chosen image into appdata/images. Returns the stored name. */
export async function importImage(): Promise<string | null> {
  const picked = await open({
    multiple: false,
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
  });
  if (!picked) return null;
  const stored = uniqueName(baseName(picked));
  const dest = await join(await getDataDir(), "images", stored);
  await copyFile(picked, dest);
  return stored;
}

/** Opens a picker and copies chosen audio files into appdata/audio. Returns stored names with display names. */
export async function importAudioFiles(): Promise<{ stored: string; display: string }[]> {
  const picked = await open({
    multiple: true,
    filters: [{ name: "Audio", extensions: ["mp3", "wav", "ogg", "flac", "m4a", "aac", "opus"] }],
  });
  if (!picked) return [];
  const paths = Array.isArray(picked) ? picked : [picked];
  const out: { stored: string; display: string }[] = [];
  for (const p of paths) {
    const original = baseName(p);
    const stored = uniqueName(original);
    const dest = await join(await getDataDir(), "audio", stored);
    await copyFile(p, dest);
    const display = (original.includes(".") ? original.slice(0, original.lastIndexOf(".")) : original)
      .replace(/[-_]+/g, " ")
      .trim();
    out.push({ stored, display: display || original });
  }
  return out;
}

export async function imageUrl(storedName: string): Promise<string> {
  return convertFileSrc(await join(await getDataDir(), "images", storedName));
}

export async function deleteImage(storedName: string): Promise<void> {
  const p = await join(await getDataDir(), "images", storedName);
  if (await exists(p)) await remove(p);
}

export async function deleteAudio(storedName: string): Promise<void> {
  const p = await join(await getDataDir(), "audio", storedName);
  if (await exists(p)) await remove(p);
}

/**
 * Loads the raw bytes for an audio_files.source value.
 * Built-in loops ship with the frontend; imports live in appdata/audio.
 */
export async function loadAudioBytes(source: string): Promise<ArrayBuffer> {
  if (source.startsWith("builtin:")) {
    const res = await fetch(`/audio/${source.slice("builtin:".length)}`);
    if (!res.ok) throw new Error(`Missing built-in audio: ${source}`);
    return res.arrayBuffer();
  }
  const name = source.startsWith("file:") ? source.slice("file:".length) : source;
  const bytes = await readFile(await join(await getDataDir(), "audio", name));
  return bytes.buffer as ArrayBuffer;
}

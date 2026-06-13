import { join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { copyFile, exists, mkdir, readFile, remove, writeFile } from "@tauri-apps/plugin-fs";
import { getProjectPaths } from "./projectPaths";

let dataDir: string | null = null;

export async function getDataDir(): Promise<string> {
  if (!dataDir) dataDir = (await getProjectPaths()).dataDir;
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

/** Longest edge an imported image is downscaled to; covers still look crisp fullscreen on 1440p. */
const MAX_IMAGE_DIM = 2560;
/** WebP quality for re-encoded imports — visually near-lossless, a fraction of the original size. */
const WEBP_QUALITY = 0.82;

/**
 * Re-encodes image bytes to WebP, downscaling so the longest edge is at most MAX_IMAGE_DIM.
 * Returns null when the source can't be decoded, or when re-encoding wouldn't shrink an
 * already-small image — the caller then stores the original untouched.
 */
async function compressToWebp(bytes: Uint8Array): Promise<Uint8Array | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(new Blob([bytes.buffer as ArrayBuffer]));
  } catch {
    return null; // unsupported/corrupt; keep the original
  }
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, MAX_IMAGE_DIM / longest);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return null;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await canvas.convertToBlob({ type: "image/webp", quality: WEBP_QUALITY });
  const out = new Uint8Array(await blob.arrayBuffer());
  // If we didn't downscale and WebP isn't smaller, the original already wins — leave it alone.
  if (scale === 1 && out.byteLength >= bytes.byteLength) return null;
  return out;
}

/** Opens a picker, compresses the chosen image to WebP, and stores it in data/images. Returns the stored name. */
export async function importImage(): Promise<string | null> {
  const picked = await open({
    multiple: false,
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
  });
  if (!picked) return null;
  const original = baseName(picked);
  const dir = await join(await getDataDir(), "images");

  // Animated GIFs must stay as-is — canvas would flatten them to a single frame.
  if (original.toLowerCase().endsWith(".gif")) {
    const stored = uniqueName(original);
    await copyFile(picked, await join(dir, stored));
    return stored;
  }

  const webp = await compressToWebp(await readFile(picked));
  if (webp) {
    const stored = uniqueName(original.replace(/\.[^.]+$/, "") + ".webp");
    await writeFile(await join(dir, stored), webp);
    return stored;
  }

  // Undecodable or already small: store the original untouched.
  const stored = uniqueName(original);
  await copyFile(picked, await join(dir, stored));
  return stored;
}

/** Opens a picker and copies chosen audio files into data/audio. Returns stored names with display names. */
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

/**
 * Re-encodes an already-stored image in place to WebP, using the same pipeline as import
 * (downscale to MAX_IMAGE_DIM, quality WEBP_QUALITY). Writes the new file, removes the old,
 * and returns the new stored name with the size delta — or null when the image is left
 * untouched (animated GIF, undecodable, or already small enough). Callers are responsible
 * for updating any database references from the old name to the returned name.
 */
export async function recompressStoredImage(
  name: string
): Promise<{ newName: string; oldBytes: number; newBytes: number } | null> {
  if (name.toLowerCase().endsWith(".gif")) return null; // preserve animation
  const dir = await join(await getDataDir(), "images");
  const src = await join(dir, name);
  if (!(await exists(src))) return null;
  const original = await readFile(src);
  const webp = await compressToWebp(original);
  if (!webp) return null;
  const newName = name.replace(/\.[^.]+$/, "") + ".webp";
  await writeFile(await join(dir, newName), webp);
  if (newName !== name) await remove(src);
  return { newName, oldBytes: original.byteLength, newBytes: webp.byteLength };
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
 * Built-in loops ship with the frontend; imports live in data/audio.
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

import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ManagedAudioFile } from "../types";
import { isTauriRuntime } from "./environment";

const browserUrls = new Map<string, string>();
const audioExtensions = ["mp3", "wav", "ogg", "flac", "m4a", "aac"];

function fileNameFromPath(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

function fileExtension(name: string) {
  const dotIndex = name.lastIndexOf(".");
  return dotIndex > 0 ? name.slice(dotIndex) : "";
}

function pickBrowserAudioFiles(): Promise<ManagedAudioFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = audioExtensions.map((extension) => `.${extension}`).join(",");
    input.multiple = true;

    input.addEventListener(
      "change",
      () => {
        const selected = Array.from(input.files ?? []).map((file) => {
          const path = `browser://${crypto.randomUUID()}/${file.name}`;
          browserUrls.set(path, URL.createObjectURL(file));
          return { name: file.name, path };
        });
        resolve(selected);
      },
      { once: true },
    );

    input.click();
  });
}

export async function importAudioFiles(): Promise<ManagedAudioFile[]> {
  if (!isTauriRuntime()) {
    return pickBrowserAudioFiles();
  }

  const selected = await open({
    multiple: true,
    directory: false,
    filters: [
      {
        name: "Audio",
        extensions: audioExtensions,
      },
    ],
  });

  if (!selected) {
    return [];
  }

  const paths = Array.isArray(selected) ? selected : [selected];
  return invoke<ManagedAudioFile[]>("import_audio_files", { paths });
}

export async function renameAudioFile(
  filePath: string,
  newName: string,
): Promise<ManagedAudioFile> {
  if (isTauriRuntime()) {
    return invoke<ManagedAudioFile>("rename_audio_file", {
      path: filePath,
      newName,
    });
  }

  const currentUrl = browserUrls.get(filePath);
  if (!currentUrl) {
    throw new Error("This browser-only audio file is no longer available.");
  }

  const extension = fileExtension(fileNameFromPath(filePath));
  const normalizedName = newName.trim().endsWith(extension)
    ? newName.trim()
    : `${newName.trim()}${extension}`;
  const renamedPath = `browser://${crypto.randomUUID()}/${normalizedName}`;
  browserUrls.delete(filePath);
  browserUrls.set(renamedPath, currentUrl);
  return { name: normalizedName, path: renamedPath };
}

function mimeTypeFor(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    flac: "audio/flac",
    m4a: "audio/mp4",
    aac: "audio/aac",
  };

  return mimeTypes[extension ?? ""] ?? "application/octet-stream";
}

export async function createPlayableUrl(filePath: string): Promise<string> {
  if (!isTauriRuntime()) {
    const url = browserUrls.get(filePath);
    if (!url) {
      throw new Error("Choose this browser-only audio file again to play it.");
    }
    return url;
  }

  const bytes = await invoke<ArrayBuffer>("read_audio_file", { path: filePath });
  const blob = new Blob([bytes], {
    type: mimeTypeFor(filePath),
  });
  return URL.createObjectURL(blob);
}

export function releasePlayableUrl(filePath: string, url: string) {
  if (browserUrls.get(filePath) === url) {
    browserUrls.delete(filePath);
  }
  URL.revokeObjectURL(url);
}

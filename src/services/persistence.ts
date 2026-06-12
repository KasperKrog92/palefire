import { invoke } from "@tauri-apps/api/core";
import type { AppState } from "../types";
import { isTauriRuntime } from "./environment";

const browserStorageKey = "palefire-state";

export async function loadAppState(): Promise<AppState> {
  if (isTauriRuntime()) {
    return invoke<AppState>("load_state");
  }

  const stored = window.localStorage.getItem(browserStorageKey);
  if (!stored) {
    return { version: 1, audioLayers: [] };
  }

  return JSON.parse(stored) as AppState;
}

export async function saveAppState(state: AppState): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("save_state", { state });
    return;
  }

  window.localStorage.setItem(browserStorageKey, JSON.stringify(state));
}

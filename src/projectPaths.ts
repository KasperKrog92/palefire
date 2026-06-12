import { invoke } from "@tauri-apps/api/core";

export type ProjectPaths = {
  dataDir: string;
  databasePath: string;
  databaseUrl: string;
};

let pathsPromise: Promise<ProjectPaths> | null = null;

export function getProjectPaths(): Promise<ProjectPaths> {
  pathsPromise ??= invoke<ProjectPaths>("project_paths");
  return pathsPromise;
}

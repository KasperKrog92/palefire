import Database from "@tauri-apps/plugin-sql";
import { getProjectPaths } from "../projectPaths";

let soloDbPromise: Promise<Database> | null = null;

export async function getSoloDb(): Promise<Database> {
  soloDbPromise ??= getProjectPaths().then((paths) => Database.load(paths.soloDatabaseUrl));
  return soloDbPromise;
}

export async function soloSelect<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getSoloDb();
  return db.select<T[]>(sql, params);
}

export async function soloExecute(
  sql: string,
  params: unknown[] = []
): Promise<{ lastInsertId?: number; rowsAffected: number }> {
  const db = await getSoloDb();
  return db.execute(sql, params);
}

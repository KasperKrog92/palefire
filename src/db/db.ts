import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export function inTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:palefire.db");
  }
  return db;
}

export async function select<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const d = await getDb();
  return d.select<T[]>(sql, params);
}

export async function execute(
  sql: string,
  params: unknown[] = []
): Promise<{ lastInsertId?: number; rowsAffected: number }> {
  const d = await getDb();
  return d.execute(sql, params);
}

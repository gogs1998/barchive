/**
 * Thin typed D1 helpers. Mirror the semantics of the old Python
 * `d1_first` / `d1_all` helpers: prepare → bind → first()/all()/run().
 */

/** Return the first row (or null). */
export async function first<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<T | null> {
  const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
  const row = await stmt.first<T>();
  return row ?? null;
}

/** Return all rows as an array. */
export async function all<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
  const res = await stmt.all<T>();
  return res.results ?? [];
}

/**
 * Execute a write. Returns the D1Result so callers can inspect
 * `meta.changes` (needed for idempotent inserts / 404-on-delete).
 */
export async function run(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<D1Result> {
  const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
  return stmt.run();
}

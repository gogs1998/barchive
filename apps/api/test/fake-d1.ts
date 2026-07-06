/**
 * In-memory D1 fake for offline tests.
 *
 * Backed by Node's built-in `node:sqlite` (real SQLite — D1 is SQLite, so query
 * semantics match exactly) and exposes just the `D1Database` surface the
 * handlers use: `prepare(sql).bind(...).first()/.all()/.run()`.
 *
 * Kept intentionally small: no batch/dump/exec-on-D1, no remote I/O — CI offline.
 */

// `node:sqlite` is a newer builtin Vite's resolver can't handle via a static
// import, so load it through createRequire (the type import is erased at
// runtime). Types come from test/node-sqlite.d.ts.
import { createRequire } from "node:module";
import type { DatabaseSync as DatabaseSyncHandle } from "node:sqlite";

const nodeRequire = createRequire(import.meta.url);
const { DatabaseSync } = nodeRequire("node:sqlite") as {
  DatabaseSync: new (path: string) => DatabaseSyncHandle;
};

// Schema mirrors migrations 0001–0007 (incl. display_name + ingredient slug).
const SCHEMA = `
CREATE TABLE ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  slug TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE UNIQUE INDEX ix_ingredients_slug ON ingredients(slug);

CREATE TABLE tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);

CREATE TABLE cocktails (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  method TEXT,
  garnish TEXT,
  glassware TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cocktail_ingredients (
  cocktail_id TEXT NOT NULL REFERENCES cocktails(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity TEXT, unit TEXT, notes TEXT,
  quantity_num REAL, unit_norm TEXT,
  PRIMARY KEY (cocktail_id, ingredient_id)
);

CREATE TABLE cocktail_tags (
  cocktail_id TEXT NOT NULL REFERENCES cocktails(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (cocktail_id, tag_id)
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (provider, provider_account_id)
);

CREATE TABLE user_favourites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL REFERENCES cocktails(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (user_id, recipe_id)
);

CREATE TABLE user_bar (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (user_id, ingredient_id)
);
`;

class FakeStatement {
  constructor(
    private readonly handle: DatabaseSyncHandle,
    private readonly sql: string,
    private readonly params: unknown[] = [],
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    return new FakeStatement(this.handle, this.sql, values) as unknown as D1PreparedStatement;
  }

  async first<T = unknown>(colName?: string): Promise<T | null> {
    const row = this.handle.prepare(this.sql).get(...(this.params as never[]));
    if (row == null) return null;
    if (colName !== undefined) return (row[colName] ?? null) as T;
    return row as T;
  }

  async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const r = this.handle.prepare(this.sql).run(...(this.params as never[]));
    return {
      results: [],
      success: true,
      meta: makeMeta(Number(r.changes), Number(r.lastInsertRowid)),
    } as unknown as D1Result<T>;
  }

  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const rows = this.handle.prepare(this.sql).all(...(this.params as never[]));
    return {
      results: rows as T[],
      success: true,
      meta: makeMeta(0, 0),
    } as unknown as D1Result<T>;
  }

}

function makeMeta(changes: number, lastRowId: number) {
  return {
    duration: 0,
    size_after: 0,
    rows_read: 0,
    rows_written: 0,
    last_row_id: lastRowId,
    changed_db: changes > 0,
    changes,
  };
}

class FakeD1 {
  constructor(readonly handle: DatabaseSyncHandle) {}
  prepare(sql: string): D1PreparedStatement {
    return new FakeStatement(this.handle, sql) as unknown as D1PreparedStatement;
  }
}

export interface FakeDb {
  /** Pass this to handlers where an `Env.DB` is expected. */
  db: D1Database;
  /** Underlying handle for direct seeding in tests. */
  raw: DatabaseSyncHandle;
}

/** Create a fresh in-memory D1 fake with the full schema applied. */
export function createFakeD1(): FakeDb {
  const raw = new DatabaseSync(":memory:");
  raw.exec(SCHEMA);
  const fake = new FakeD1(raw);
  return { db: fake as unknown as D1Database, raw };
}

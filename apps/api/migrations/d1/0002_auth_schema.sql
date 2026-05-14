-- D1 migration: 0002_auth_schema.sql
-- Adds users, sessions, and oauth_accounts tables for authentication.
-- D1 uses SQLite dialect; UUIDs stored as TEXT, timestamps as TEXT (ISO 8601).

CREATE TABLE IF NOT EXISTS users (
    id               TEXT PRIMARY KEY,
    email            TEXT NOT NULL UNIQUE,
    password_hash    TEXT,                          -- NULL for OAuth-only accounts
    email_verified   INTEGER NOT NULL DEFAULT 0,   -- SQLite boolean (0/1)
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);

CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT NOT NULL UNIQUE,              -- opaque refresh token (UUID)
    expires_at  TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS ix_sessions_user_id ON sessions (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_sessions_token ON sessions (token);

CREATE TABLE IF NOT EXISTS oauth_accounts (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            TEXT NOT NULL,             -- e.g. "google"
    provider_account_id TEXT NOT NULL,
    created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE (provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS ix_oauth_accounts_user_id ON oauth_accounts (user_id);

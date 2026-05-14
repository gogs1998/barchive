-- D1 migration: 0004_user_bar.sql
-- Adds user_bar table for My Bar ingredient inventory feature.
-- Composite PK (user_id, ingredient_id) enforces uniqueness; INSERT OR IGNORE
-- makes POST /api/user/bar/{ingredientId} idempotent at the DB level.

CREATE TABLE IF NOT EXISTS user_bar (
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    PRIMARY KEY (user_id, ingredient_id)
);

-- Index on user_id to make GET /api/user/bar fast
CREATE INDEX IF NOT EXISTS ix_user_bar_user_id ON user_bar (user_id);

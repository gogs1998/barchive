-- D1 migration: 0003_favourites.sql
-- Adds user_favourites table for saved cocktail recipes.
-- Composite PK (user_id, recipe_id) enforces uniqueness; ON CONFLICT DO NOTHING
-- makes POST idempotent at the DB level.

CREATE TABLE IF NOT EXISTS user_favourites (
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id  TEXT NOT NULL REFERENCES cocktails(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    PRIMARY KEY (user_id, recipe_id)
);

-- Index on user_id to make GET /api/user/favourites fast
CREATE INDEX IF NOT EXISTS ix_user_favourites_user_id ON user_favourites (user_id);

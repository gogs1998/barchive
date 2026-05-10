-- D1 migration: 0001_initial_schema.sql
-- Converted from Alembic PostgreSQL migration 2721416fde21_initial_schema
-- D1 uses SQLite dialect; UUIDs stored as TEXT, timestamps as TEXT (ISO 8601).

CREATE TABLE IF NOT EXISTS ingredients (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    category    TEXT NOT NULL,
    description TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS ix_ingredients_name ON ingredients (name);
CREATE INDEX IF NOT EXISTS ix_ingredients_category ON ingredients (category);

CREATE TABLE IF NOT EXISTS tags (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS ix_tags_name ON tags (name);

CREATE TABLE IF NOT EXISTS cocktails (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT,
    method      TEXT,
    garnish     TEXT,
    glassware   TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS ix_cocktails_name ON cocktails (name);
CREATE UNIQUE INDEX IF NOT EXISTS ix_cocktails_slug ON cocktails (slug);

CREATE TABLE IF NOT EXISTS cocktail_ingredients (
    cocktail_id   TEXT NOT NULL REFERENCES cocktails(id) ON DELETE CASCADE,
    ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity      TEXT,
    unit          TEXT,
    notes         TEXT,
    PRIMARY KEY (cocktail_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS ix_cocktail_ingredients_cocktail ON cocktail_ingredients (cocktail_id);
CREATE INDEX IF NOT EXISTS ix_cocktail_ingredients_ingredient ON cocktail_ingredients (ingredient_id);

CREATE TABLE IF NOT EXISTS cocktail_tags (
    cocktail_id TEXT NOT NULL REFERENCES cocktails(id) ON DELETE CASCADE,
    tag_id      TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (cocktail_id, tag_id)
);

CREATE INDEX IF NOT EXISTS ix_cocktail_tags_cocktail ON cocktail_tags (cocktail_id);

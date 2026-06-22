-- D1 migration: 0005_cocktail_full_fields.sql
-- Adds columns required by the frontend Cocktail type that were missing
-- from the initial schema.  All columns are nullable so the migration is
-- safe to run against an already-populated table (seed may follow).

ALTER TABLE cocktails ADD COLUMN category     TEXT;
ALTER TABLE cocktails ADD COLUMN img          TEXT;
ALTER TABLE cocktails ADD COLUMN color        TEXT;
ALTER TABLE cocktails ADD COLUMN abv          TEXT;
ALTER TABLE cocktails ADD COLUMN time_to_make TEXT;
ALTER TABLE cocktails ADD COLUMN vegan        INTEGER NOT NULL DEFAULT 1;
ALTER TABLE cocktails ADD COLUMN gluten_free  INTEGER NOT NULL DEFAULT 1;
ALTER TABLE cocktails ADD COLUMN steps_json   TEXT;   -- JSON array of strings

-- cocktail_ingredients: add a free-form amount column (e.g. "2 oz", "rinse")
-- quantity / unit columns remain for future structured queries.
ALTER TABLE cocktail_ingredients ADD COLUMN amount TEXT;

-- D1 migration: 0007_add_ingredient_slug.sql
-- Makes `slug` the stable, public ingredient identifier. The API accepts and
-- returns slugs (My Bar is slug-keyed); user_bar still stores the ingredient
-- UUID internally, resolved via this column.
--
-- Backfill note:
--   The authoritative slug must match the frontend's slugify() exactly:
--     name.normalize("NFD").replace(/[̀-ͯ]/g,"")   -- strip accents
--         .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")
--   SQLite has no Unicode-NFD or regex, so it cannot reproduce that for accented
--   or punctuated names. The simple UPDATE below is a best-effort fallback for
--   plain ASCII names; the REQUIRED, exact backfill is the one-off Node script
--   tools/backfill-ingredient-slugs.mjs (run it against the target D1 before My
--   Bar is used). Running that script after this migration is idempotent and
--   corrects any approximate slugs set here.

ALTER TABLE ingredients ADD COLUMN slug TEXT;

-- NULL slugs are treated as distinct by SQLite, so this unique index is safe to
-- create before the backfill completes.
CREATE UNIQUE INDEX IF NOT EXISTS ix_ingredients_slug ON ingredients (slug);

-- Best-effort ASCII backfill (lowercase, spaces -> hyphens). Superseded by the
-- Node script for exact frontend parity.
UPDATE ingredients
SET slug = LOWER(REPLACE(name, ' ', '-'))
WHERE slug IS NULL;

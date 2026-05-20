-- D1 migration: 0005_quantity_num_unit_norm.sql
-- BAR-55: add structured numeric quantity and normalised unit to cocktail_ingredients
--
-- Strategy:
--   quantity     TEXT  (kept as-is: human display string, e.g. "60", "1/2", "2")
--   quantity_num REAL  (new: machine-readable numeric value, e.g. 60.0, 0.5, 2.0)
--   unit         TEXT  (kept as-is)
--   unit_norm    TEXT  (new: normalised enum, one of: oz ml cl tsp tbsp dash bsp pinch piece leaves)
--
-- Backfill notes:
--   * Simple numeric strings ("60", "2") → CAST(quantity AS REAL)
--   * Fraction strings ("1/2") cannot be evaluated in SQLite directly; those rows
--     are left NULL and handled by the application-level backfill script / Worker seeding.
--   * Garnish/to-taste rows already have quantity = NULL → quantity_num stays NULL.
--   * unit_norm maps common aliases: "dashes" → "dash", "ml" → "ml", etc.

-- Step 1: add new columns
ALTER TABLE cocktail_ingredients ADD COLUMN quantity_num REAL;
ALTER TABLE cocktail_ingredients ADD COLUMN unit_norm TEXT;

-- Step 2: backfill quantity_num for simple numeric strings
-- CAST('60' AS REAL) = 60.0, CAST('1/2' AS REAL) = NULL in SQLite (safe)
UPDATE cocktail_ingredients
SET quantity_num = CAST(quantity AS REAL)
WHERE quantity IS NOT NULL
  AND CAST(quantity AS REAL) IS NOT NULL;

-- Step 3: backfill unit_norm — map aliases to canonical enum values
-- Canonical set: oz ml cl tsp tbsp dash bsp pinch piece leaves
UPDATE cocktail_ingredients SET unit_norm = 'dash'  WHERE unit IN ('dash', 'dashes');
UPDATE cocktail_ingredients SET unit_norm = 'ml'    WHERE unit = 'ml';
UPDATE cocktail_ingredients SET unit_norm = 'oz'    WHERE unit IN ('oz', 'fl oz');
UPDATE cocktail_ingredients SET unit_norm = 'cl'    WHERE unit = 'cl';
UPDATE cocktail_ingredients SET unit_norm = 'tsp'   WHERE unit IN ('tsp', 'teaspoon', 'teaspoons');
UPDATE cocktail_ingredients SET unit_norm = 'tbsp'  WHERE unit IN ('tbsp', 'tablespoon', 'tablespoons');
UPDATE cocktail_ingredients SET unit_norm = 'bsp'   WHERE unit = 'bsp';
UPDATE cocktail_ingredients SET unit_norm = 'pinch' WHERE unit = 'pinch';
UPDATE cocktail_ingredients SET unit_norm = 'piece' WHERE unit IN ('piece', 'pieces');
UPDATE cocktail_ingredients SET unit_norm = 'leaves' WHERE unit IN ('leaves', 'leaf');

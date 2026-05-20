/**
 * Batch scaling and unit conversion utilities for recipe ingredients.
 *
 * Conversion factors (all relative to oz):
 *   1 oz  = 29.57 ml  = 2.957 cl
 *   1 tsp = 5 ml      = 0.169 oz
 *   1 tbsp= 15 ml     = 0.507 oz
 *   1 dash= 0.6 ml    = 0.020 oz
 */

export type DisplayUnit = "oz" | "ml" | "cl";

/** Multiplier presets shown as pill buttons */
export const MULTIPLIER_PRESETS = [1, 2, 4, 8, 12] as const;

/** Conversion table: how many ml is 1 unit */
const TO_ML: Record<string, number> = {
  oz: 29.5735,
  ml: 1,
  cl: 10,
  tsp: 5,
  tbsp: 15,
  dash: 0.6,
};

/**
 * Convert a quantity from its source unit to the target display unit.
 * Returns null when conversion is not possible.
 */
export function convertQty(qty: number, fromUnit: string, toUnit: DisplayUnit): number | null {
  const fromMl = TO_ML[fromUnit];
  const toMl = TO_ML[toUnit];
  if (fromMl == null || toMl == null) return null;
  return (qty * fromMl) / toMl;
}

/**
 * Format a numeric quantity for display.
 * Uses ≤2 decimal places; trims trailing zeros.
 */
export function formatQty(value: number): string {
  // Round to 2dp then trim trailing zeros
  const rounded = Math.round(value * 100) / 100;
  // If it's a whole number, show no decimal
  if (rounded === Math.floor(rounded)) return String(rounded);
  // Otherwise format to 2dp and trim
  return rounded.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * Compute the scaled + converted display string for an ingredient.
 *
 * @param amount   - Original amount string (fallback if not numeric)
 * @param qty      - Parsed numeric quantity in the base unit, or null
 * @param unit     - Parsed base unit (oz, tsp, etc.), or null
 * @param multiplier - Batch multiplier (1, 2, 4, 8, 12, or custom)
 * @param displayUnit - Target unit for display
 * @returns Display string like "4 oz", "118.3 ml", or original amount if non-numeric
 */
export function scaleAmount(
  amount: string,
  qty: number | null,
  unit: string | null,
  multiplier: number,
  displayUnit: DisplayUnit
): string {
  if (qty === null || unit === null) {
    // Non-numeric: return original unchanged (garnish, "to taste", "top", etc.)
    return amount;
  }

  const scaled = qty * multiplier;
  const converted = convertQty(scaled, unit, displayUnit);

  if (converted === null) {
    // Conversion failed — fall back to original unit
    return `${formatQty(scaled)} ${unit}`;
  }

  return `${formatQty(converted)} ${displayUnit}`;
}

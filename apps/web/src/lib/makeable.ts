import type { Cocktail } from "./cocktails";

/**
 * Pantry staples and garnishes every bar is assumed to have. They never stop a
 * cocktail counting as makeable (lowercased names).
 */
export const PANTRY_ITEMS = new Set([
  "ice",
  "crushed ice",
  "water",
  "salt",
  "sugar",
  "caster sugar",
  "lemon peel",
  "orange peel",
  "lime peel",
  "maraschino cherry",
  "cherry",
  "nutmeg",
  "olive",
]);

/** True when every ingredient of the cocktail is present in the bar (lowercased names). */
export function isMakeable(cocktail: Cocktail, barNames: Set<string>): boolean {
  return cocktail.ingredients.every((i) => {
    const name = i.name.toLowerCase();
    return barNames.has(name) || PANTRY_ITEMS.has(name);
  });
}

/** Count cocktails fully makeable from the given bar. */
export function countMakeable(cocktails: Cocktail[], barNames: Set<string>): number {
  let n = 0;
  for (const c of cocktails) if (isMakeable(c, barNames)) n++;
  return n;
}

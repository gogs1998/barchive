// src/lib/cocktailiq/adapter.ts
import type { Cocktail } from "../cocktails";
import type { BuildIngredient } from "./types";
import { resolveCanonical, getCategoryInfo, getCompounds, getSubstituteScores, mapToBalanceGroup } from "./resolver";

/** ml per 1 unit — mirrors the scaler's conversion table. */
const TO_ML: Record<string, number> = { oz: 29.5735, ml: 1, cl: 10, tsp: 5, tbsp: 15, dash: 0.6 };

function toMl(qty: number | null, unit: string | null): number {
  if (qty == null || unit == null) return 0;
  const factor = TO_ML[unit];
  return factor ? qty * factor : 0;
}

/**
 * Get compounds for a canonical ingredient, falling back to the best-scored
 * substitute's compounds when the ingredient itself has none in FlavorDB.
 */
function getCompoundsWithFallback(canonical: string): string[] {
  const direct = getCompounds(canonical);
  if (direct.length > 0) return direct;
  // Fall back: walk substitutes in score order and return the first with compounds
  for (const [subName] of getSubstituteScores(canonical)) {
    const subCompounds = getCompounds(subName);
    if (subCompounds.length > 0) return subCompounds;
  }
  return [];
}

/** Convert a barchive Cocktail's ingredients to scorer input. */
export function cocktailToBuild(cocktail: Cocktail): BuildIngredient[] {
  return cocktail.ingredients.map((ing) => {
    const canonical = resolveCanonical(ing.name);
    const info = canonical ? getCategoryInfo(canonical) : null;
    return {
      name: canonical ?? ing.name.toLowerCase(),
      balanceGroup: mapToBalanceGroup(info),
      volumeMl: toMl(ing.qty, ing.unit),
      compounds: canonical ? getCompoundsWithFallback(canonical) : [],
    };
  });
}

/**
 * Gate: only show the meter for recipes it can judge fairly —
 * 2–6 ingredients, a resolvable base spirit, and at least half the
 * ingredients resolving to a known canonical.
 */
export function isBalanceEligible(cocktail: Cocktail): boolean {
  const n = cocktail.ingredients.length;
  if (n < 2 || n > 6) return false;

  const build = cocktailToBuild(cocktail);
  if (!build.some((b) => b.balanceGroup === "base_spirit")) return false;

  const resolved = cocktail.ingredients.filter((ing) => resolveCanonical(ing.name)).length;
  return resolved >= Math.ceil(n / 2);
}

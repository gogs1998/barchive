// src/lib/cocktailiq/resolver.ts
import aliasesJson from "./data/ingredient_aliases.json";
import categoriesJson from "./data/ingredient_categories.json";
import chemistryJson from "./data/flavordb_join.json";
import substitutionScores from "./data/substitution_scores.json";
import type { BalanceGroup } from "./types";

export interface CategoryInfo {
  primary_category: string;
  category_group: string;
}

const aliasMap = (aliasesJson as { alias_to_canonical: Record<string, string> })
  .alias_to_canonical;
const catMap = (categoriesJson as { ingredients: Record<string, CategoryInfo> })
  .ingredients;
const chemMap = chemistryJson as Record<string, { compounds?: string[] }>;
const subMap = substitutionScores as unknown as Record<string, [string, number][]>;

/** Qualifier words stripped when an exact match fails (e.g. "Tequila Blanco" -> "tequila"). */
const QUALIFIERS = new Set([
  "blanco", "reposado", "anejo", "añejo", "white", "dark", "gold", "golden",
  "light", "aged", "fresh", "dry", "sweet", "overproof", "spiced", "silver",
  "blended", "extra", "premium", "quality", "london",
]);

function inVocab(key: string): boolean {
  return Boolean(catMap[key] || subMap[key] || chemMap[key]);
}

function exact(name: string): string | null {
  const k = name.toLowerCase().trim();
  if (aliasMap[k]) return aliasMap[k];
  if (inVocab(k)) return k;
  return null;
}

/**
 * Resolve a free-text barchive ingredient name to a CocktailIQ canonical name.
 * Order: exact alias/vocab -> qualifier-stripped -> last word -> first word -> null.
 */
export function resolveCanonical(name: string): string | null {
  const direct = exact(name);
  if (direct) return direct;

  const words = name.toLowerCase().trim().split(/\s+/);
  const filtered = words.filter((w) => !QUALIFIERS.has(w));
  if (filtered.length && filtered.length < words.length) {
    const stripped = exact(filtered.join(" "));
    if (stripped) return stripped;
  }
  const last = exact(words[words.length - 1]);
  if (last) return last;
  const first = exact(words[0]);
  if (first) return first;
  return null;
}

export function getCategoryInfo(canonical: string): CategoryInfo | null {
  return catMap[canonical] ?? null;
}

export function getCompounds(canonical: string): string[] {
  return chemMap[canonical]?.compounds ?? [];
}

export function getSubstituteScores(canonical: string): [string, number][] {
  return subMap[canonical] ?? [];
}

/** Map a CocktailIQ category record to one of the four balance groups. */
export function mapToBalanceGroup(info: CategoryInfo | null): BalanceGroup {
  if (!info) return "modifier";
  if (info.category_group === "spirit") return "base_spirit";
  if (info.primary_category?.startsWith("juice_citrus")) return "citrus";
  if (info.category_group === "sweetener") return "sweetener";
  return "modifier";
}

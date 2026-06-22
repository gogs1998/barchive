// src/lib/cocktailiq/types.ts

/** The four balance groups the scorer reasons about. */
export type BalanceGroup = "base_spirit" | "citrus" | "sweetener" | "modifier";

/** One ingredient prepared for balance scoring. */
export interface BuildIngredient {
  /** Canonical CocktailIQ name, or a lowercased fallback when unresolved. */
  name: string;
  balanceGroup: BalanceGroup;
  /** Volume in millilitres (0 when the amount is non-numeric, e.g. a garnish). */
  volumeMl: number;
  /** FlavorDB compound names (empty when the ingredient is unknown). */
  compounds: string[];
}

export type BalanceRating = "Excellent" | "Good" | "Fair" | "Needs Work";

export interface BalanceScores {
  diversity: number;
  proportions: number;
  chemistry: number;
  harmony: number;
  overall: number;
  rating: BalanceRating;
  suggestions: string[];
}

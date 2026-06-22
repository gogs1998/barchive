/**
 * Curated starter ingredient set for the onboarding "Build your bar" step.
 *
 * Names are chosen to be common in the cocktail dataset so a guest's
 * selections produce meaningful makeable matches (the matcher is exact by
 * lowercased name — see `lib/makeable.ts`). Grouped into six display
 * categories the IngredientPicker renders as sections.
 */

export type StarterCategory =
  | "Spirits"
  | "Liqueurs"
  | "Mixers & Soda"
  | "Citrus & Juice"
  | "Syrups & Sweeteners"
  | "Bitters & Garnish";

export interface StarterIngredient {
  name: string;
  category: StarterCategory;
}

export const STARTER_INGREDIENTS: StarterIngredient[] = [
  // ── Spirits ────────────────────────────────────────────────────────────────
  { name: "Gin", category: "Spirits" },
  { name: "Vodka", category: "Spirits" },
  { name: "White Rum", category: "Spirits" },
  { name: "Dark Rum", category: "Spirits" },
  { name: "Tequila Blanco", category: "Spirits" },
  { name: "Reposado Tequila", category: "Spirits" },
  { name: "Mezcal", category: "Spirits" },
  { name: "Bourbon", category: "Spirits" },
  { name: "Rye Whiskey", category: "Spirits" },
  { name: "Scotch Whisky", category: "Spirits" },
  { name: "Cognac", category: "Spirits" },
  { name: "Pisco", category: "Spirits" },
  { name: "Absinthe", category: "Spirits" },

  // ── Liqueurs ───────────────────────────────────────────────────────────────
  { name: "Sweet Vermouth", category: "Liqueurs" },
  { name: "Dry Vermouth", category: "Liqueurs" },
  { name: "Campari", category: "Liqueurs" },
  { name: "Aperol", category: "Liqueurs" },
  { name: "Cointreau", category: "Liqueurs" },
  { name: "Triple Sec", category: "Liqueurs" },
  { name: "Maraschino Liqueur", category: "Liqueurs" },
  { name: "Grand Marnier", category: "Liqueurs" },
  { name: "Green Chartreuse", category: "Liqueurs" },
  { name: "Yellow Chartreuse", category: "Liqueurs" },
  { name: "Amaretto", category: "Liqueurs" },
  { name: "Coffee Liqueur", category: "Liqueurs" },
  { name: "Kahlúa", category: "Liqueurs" },
  { name: "Elderflower Liqueur", category: "Liqueurs" },
  { name: "Crème de Cassis", category: "Liqueurs" },

  // ── Mixers & Soda ──────────────────────────────────────────────────────────
  { name: "Soda Water", category: "Mixers & Soda" },
  { name: "Tonic Water", category: "Mixers & Soda" },
  { name: "Ginger Beer", category: "Mixers & Soda" },
  { name: "Ginger Ale", category: "Mixers & Soda" },
  { name: "Prosecco", category: "Mixers & Soda" },
  { name: "Champagne", category: "Mixers & Soda" },
  { name: "Cranberry Juice", category: "Mixers & Soda" },
  { name: "Pineapple Juice", category: "Mixers & Soda" },

  // ── Citrus & Juice ─────────────────────────────────────────────────────────
  { name: "Fresh Lime Juice", category: "Citrus & Juice" },
  { name: "Fresh Lemon Juice", category: "Citrus & Juice" },
  { name: "Fresh Orange Juice", category: "Citrus & Juice" },
  { name: "Fresh Grapefruit Juice", category: "Citrus & Juice" },

  // ── Syrups & Sweeteners ────────────────────────────────────────────────────
  { name: "Simple Syrup", category: "Syrups & Sweeteners" },
  { name: "Agave Syrup", category: "Syrups & Sweeteners" },
  { name: "Honey Syrup", category: "Syrups & Sweeteners" },
  { name: "Grenadine", category: "Syrups & Sweeteners" },
  { name: "Orgeat", category: "Syrups & Sweeteners" },

  // ── Bitters & Garnish ──────────────────────────────────────────────────────
  { name: "Angostura Bitters", category: "Bitters & Garnish" },
  { name: "Orange Bitters", category: "Bitters & Garnish" },
  { name: "Fresh Mint", category: "Bitters & Garnish" },
  { name: "Egg White", category: "Bitters & Garnish" },
  { name: "Heavy Cream", category: "Bitters & Garnish" },
];

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
  // Names below use the exact (lowercased-match) forms that appear most often in
  // the cocktail dataset so the makeable matcher actually finds drinks.
  { name: "Gin", category: "Spirits" },
  { name: "Vodka", category: "Spirits" },
  { name: "Light White Rum", category: "Spirits" },
  { name: "Aged Rum (6-10yr)", category: "Spirits" },
  { name: "Blanco Tequila", category: "Spirits" },
  { name: "Reposado Tequila", category: "Spirits" },
  { name: "Mezcal", category: "Spirits" },
  { name: "Bourbon Whiskey", category: "Spirits" },
  { name: "Rye Whiskey 50% Abv", category: "Spirits" },
  { name: "Scotch Whisky", category: "Spirits" },
  { name: "Cognac (Brandy)", category: "Spirits" },
  { name: "Pisco", category: "Spirits" },
  { name: "Absinthe", category: "Spirits" },

  // ── Liqueurs ───────────────────────────────────────────────────────────────
  { name: "Rosso/Sweet Vermouth", category: "Liqueurs" },
  { name: "Dry Vermouth", category: "Liqueurs" },
  { name: "Bianco/Blanco Vermouth", category: "Liqueurs" },
  { name: "Red Bitter Liqueur", category: "Liqueurs" },
  { name: "Triple Sec", category: "Liqueurs" },
  { name: "Orange Curaçao", category: "Liqueurs" },
  { name: "Maraschino Liqueur", category: "Liqueurs" },
  { name: "Grand Marnier", category: "Liqueurs" },
  { name: "Chartreuse Green", category: "Liqueurs" },
  { name: "Chartreuse Yellow", category: "Liqueurs" },
  { name: "Amaretto Liqueur", category: "Liqueurs" },
  { name: "Coffee Liqueur", category: "Liqueurs" },
  { name: "Apricot Liqueur", category: "Liqueurs" },
  { name: "Elderflower Liqueur", category: "Liqueurs" },
  { name: "Crème de Cassis", category: "Liqueurs" },

  // ── Mixers & Soda ──────────────────────────────────────────────────────────
  { name: "Soda (Club Soda) Water", category: "Mixers & Soda" },
  { name: "Tonic Water", category: "Mixers & Soda" },
  { name: "Ginger Beer", category: "Mixers & Soda" },
  { name: "Ginger Ale", category: "Mixers & Soda" },
  { name: "Cola", category: "Mixers & Soda" },
  { name: "Cranberry Juice", category: "Mixers & Soda" },
  { name: "Pineapple Juice", category: "Mixers & Soda" },
  { name: "Apple Juice", category: "Mixers & Soda" },

  // ── Citrus & Juice ─────────────────────────────────────────────────────────
  { name: "Lime Juice", category: "Citrus & Juice" },
  { name: "Lemon Juice", category: "Citrus & Juice" },
  { name: "Orange Juice", category: "Citrus & Juice" },
  { name: "Pink Grapefruit Juice", category: "Citrus & Juice" },

  // ── Syrups & Sweeteners ────────────────────────────────────────────────────
  { name: "Sugar Syrup (2:1)", category: "Syrups & Sweeteners" },
  { name: "Agave Syrup", category: "Syrups & Sweeteners" },
  { name: "Honey And Water Syrup", category: "Syrups & Sweeteners" },
  { name: "Grenadine Syrup", category: "Syrups & Sweeteners" },
  { name: "Orgeat Syrup", category: "Syrups & Sweeteners" },

  // ── Bitters & Garnish ──────────────────────────────────────────────────────
  { name: "Aromatic Bitters", category: "Bitters & Garnish" },
  { name: "Orange Bitters", category: "Bitters & Garnish" },
  { name: "Mint Leaves", category: "Bitters & Garnish" },
  { name: "Egg White (Pasteurised)", category: "Bitters & Garnish" },
  { name: "Whipping Cream", category: "Bitters & Garnish" },
];

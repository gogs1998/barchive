// src/lib/cocktailiq/balance.ts
import type { BuildIngredient, BalanceScores, BalanceRating } from "./types";

/** 4-dimension flavor balance scorer (ported from CocktailIQ). Pure function. */
export function calculateBalance(ingredients: BuildIngredient[]): BalanceScores {
  if (ingredients.length === 0) {
    return {
      diversity: 0, proportions: 0, chemistry: 0, harmony: 0, overall: 0,
      rating: "Needs Work",
      suggestions: ["Add ingredients to start building your cocktail"],
    };
  }

  const diversity = calcDiversity(ingredients);
  const proportions = calcProportions(ingredients);
  const chemistry = calcChemistry(ingredients);
  const harmony = calcHarmony(ingredients);
  const overall =
    proportions * 0.3 + harmony * 0.25 + diversity * 0.25 + chemistry * 0.2;

  return {
    diversity, proportions, chemistry, harmony, overall,
    rating: getRating(overall),
    suggestions: suggest(ingredients, diversity, proportions, chemistry, harmony),
  };
}

function calcDiversity(ings: BuildIngredient[]): number {
  const count = new Set(ings.map((i) => i.balanceGroup)).size;
  if (count >= 3 && count <= 4) return 100;
  if (count === 2) return 70;
  if (count === 5) return 85;
  if (count > 5) return 60;
  return 40;
}

function calcProportions(ings: BuildIngredient[]): number {
  const total = ings.reduce((s, i) => s + i.volumeMl, 0);
  if (total === 0) return 0;

  const vol: Record<string, number> = {};
  for (const i of ings) vol[i.balanceGroup] = (vol[i.balanceGroup] || 0) + i.volumeMl;

  const spirit = (vol.base_spirit || 0) / total;
  const citrus = (vol.citrus || 0) / total;
  const sweet = (vol.sweetener || 0) / total;

  let score = 100;
  if (spirit < 0.4) score -= 20;
  else if (spirit > 0.75) score -= 25;
  else if (spirit >= 0.5 && spirit <= 0.65) score -= 0;
  else score -= 10;

  if (citrus > 0 && citrus < 0.15) score -= 10;
  else if (citrus > 0.4) score -= 15;

  if (sweet > 0 && sweet < 0.08) score -= 10;
  else if (sweet > 0.3) score -= 15;

  if (total < 45 || total > 180) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const s1 = new Set(a);
  const s2 = new Set(b);
  let inter = 0;
  for (const x of s1) if (s2.has(x)) inter++;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

function calcChemistry(ings: BuildIngredient[]): number {
  if (ings.length < 2) return 50;
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < ings.length; i++) {
    for (let j = i + 1; j < ings.length; j++) {
      total += jaccard(ings[i].compounds, ings[j].compounds);
      pairs++;
    }
  }
  if (pairs === 0) return 50;
  return Math.min(100, (total / pairs) * 300);
}

function calcHarmony(ings: BuildIngredient[]): number {
  const count = ings.length;
  const groups = new Set(ings.map((i) => i.balanceGroup));
  let score: number;
  if (count < 2) score = 30;
  else if (count === 2) score = 60;
  else if (count >= 3 && count <= 5) score = 100;
  else if (count === 6) score = 80;
  else score = 60;
  if (!groups.has("base_spirit")) score -= 20;
  return Math.max(0, score);
}

function getRating(overall: number): BalanceRating {
  if (overall >= 80) return "Excellent";
  if (overall >= 65) return "Good";
  if (overall >= 50) return "Fair";
  return "Needs Work";
}

function suggest(
  ings: BuildIngredient[],
  diversity: number,
  proportions: number,
  chemistry: number,
  harmony: number
): string[] {
  const out: string[] = [];
  const total = ings.reduce((s, i) => s + i.volumeMl, 0);
  const groups = new Set(ings.map((i) => i.balanceGroup));

  if (diversity < 60) {
    if (!groups.has("citrus")) out.push("Add citrus (lime or lemon juice) for balance");
    if (!groups.has("sweetener") && groups.has("citrus"))
      out.push("Add sweetener (simple syrup) to balance acidity");
  }

  if (proportions < 70 && total > 0) {
    const vol: Record<string, number> = {};
    for (const i of ings) vol[i.balanceGroup] = (vol[i.balanceGroup] || 0) + i.volumeMl;
    const spiritPct = (vol.base_spirit || 0) / total;
    const citrusPct = (vol.citrus || 0) / total;
    if (spiritPct > 0.75) out.push("Too spirit-forward — add citrus or a modifier");
    else if (spiritPct < 0.4 && spiritPct > 0) out.push("Increase the base spirit for better balance");
    if (citrusPct > 0.4) out.push("Too much citrus — reduce it or add more spirit");
  }

  if (chemistry < 50) out.push("Try ingredients with more complementary flavor profiles");

  if (harmony < 60) {
    if (ings.length < 3) out.push("Add more ingredients for complexity (aim for 3–5)");
    else if (ings.length > 6) out.push("Quite complex — consider removing an ingredient");
  }

  if (out.length === 0) out.push("Well balanced.");
  return out;
}

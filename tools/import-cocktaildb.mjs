// Import TheCocktailDB raw dump -> barchive Cocktail[] TS module.
// Source: all_cocktails_expanded.json (441 drinks, native TheCocktailDB schema, all with images).
// Output: apps/web/src/lib/cocktails.imported.ts (IMPORTED_COCKTAILS: Cocktail[])
//
// Derives spirit category from ingredients (TheCocktailDB strCategory is not spirit-based),
// parses measures into {qty,unit} matching barchive's scaler (units: oz/ml/cl/tsp/tbsp/dash),
// splits instructions into steps, and keeps the strDrinkThumb image URL.

import { readFileSync, writeFileSync } from "node:fs";

const SRC = "D:/Cursor/CocktailIQ/claude_work/data/raw/all_cocktails_expanded.json";
const OUT = "D:/VM/BarIQ PC/barchive/apps/web/src/lib/cocktails.imported.ts";

// --- replicate barchive slugify exactly ---
function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// --- measure parser -> {amount(display), qty, unit} where unit in oz/ml/cl/tsp/tbsp/dash ---
const UNIT_MAP = {
  oz: "oz", ounce: "oz", ounces: "oz", shot: "oz", shots: "oz",
  ml: "ml", cl: "cl",
  tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  tbsp: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp", tblsp: "tbsp",
  dash: "dash", dashes: "dash",
};

function parseNumber(s) {
  s = s.trim();
  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)/); // mixed: 1 1/2
  if (m) return +m[1] + +m[2] / +m[3];
  m = s.match(/^(\d+)\/(\d+)/); // fraction: 3/4
  if (m) return +m[1] / +m[2];
  m = s.match(/^(\d+(?:\.\d+)?)/); // int/decimal
  if (m) return +m[1];
  return null;
}

function parseMeasure(raw) {
  const amount = (raw || "").replace(/\s+/g, " ").trim();
  if (!amount) return { amount: "", qty: null, unit: null };
  const num = parseNumber(amount);
  // find a unit token anywhere after the number
  const unitMatch = amount
    .toLowerCase()
    .match(/\b(oz|ounces?|shots?|ml|cl|tsp|teaspoons?|tbsp|tablespoons?|tblsp|dashes?)\b/);
  if (num != null && unitMatch) {
    const unit = UNIT_MAP[unitMatch[1]];
    if (unit) return { amount, qty: +num.toFixed(4), unit };
  }
  return { amount, qty: null, unit: null }; // non-numeric / unscalable -> display only
}

// --- derive spirit category from ingredient names ---
const SPIRITS = [
  [/\btequila\b/, "Tequila"],
  [/\bmezcal\b/, "Mezcal"],
  [/\b(rum|cacha[cç]a|rhum)\b/, "Rum"],
  [/\bgin\b/, "Gin"],
  [/\bvodka\b/, "Vodka"],
  [/\b(whisk(e)?y|bourbon|rye|scotch)\b/, "Whiskey"],
  [/\b(brandy|cognac|armagnac|pisco|calvados)\b/, "Brandy"],
  [/\b(triple sec|cointreau|curacao|cura[cç]ao|liqueur|amaretto|campari|aperol|chartreuse)\b/, "Liqueur"],
  [/\b(wine|champagne|prosecco|vermouth|sherry|port|sake)\b/, "Wine"],
  [/\b(beer|lager|ale|stout|cider)\b/, "Beer"],
];
function deriveCategory(ingredientNames, fallback) {
  const hay = ingredientNames.join(" ").toLowerCase();
  for (const [re, cat] of SPIRITS) if (re.test(hay)) return cat;
  if (fallback && /non[\s-]?alcohol/i.test(fallback)) return "Mocktail";
  return "Other";
}

const COLOR = {
  Tequila: "#D4E8A8", Mezcal: "#C9B79C", Rum: "#F5E6CA", Gin: "#BFD8C2",
  Vodka: "#E8EEF2", Whiskey: "#D4A56A", Brandy: "#E8C39E", Liqueur: "#E6C7E0",
  Wine: "#E8B3C0", Beer: "#F2D98D", Mocktail: "#BFE3E0", Other: "#D9D4CA",
};

function normalizeGlass(g) {
  if (!g) return "Coupe";
  return g
    .replace(/\s*glass\s*$/i, "")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || "Coupe";
}

function splitSteps(instr) {
  if (!instr) return ["Combine ingredients and serve."];
  let parts = instr.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) {
    parts = instr
      .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return parts.length ? parts : [instr.trim()];
}

// --- main ---
const rawData = JSON.parse(readFileSync(SRC, "utf8"));
const drinks = Array.isArray(rawData) ? rawData : rawData.drinks;

const cocktails = drinks.map((d) => {
  const ingredients = [];
  for (let i = 1; i <= 15; i++) {
    const name = (d["strIngredient" + i] || "").trim();
    if (!name) continue;
    const { amount, qty, unit } = parseMeasure(d["strMeasure" + i]);
    ingredients.push({ name, amount, qty, unit });
  }
  const category = deriveCategory(ingredients.map((x) => x.name), d.strAlcoholic);
  const tags = (d.strTags ? d.strTags.split(",").map((t) => t.trim()).filter(Boolean) : []);
  return {
    id: String(d.idDrink),
    name: d.strDrink.trim(),
    category,
    glass: normalizeGlass(d.strGlass),
    img: d.strDrinkThumb || "",
    color: COLOR[category] || COLOR.Other,
    ingredients,
    steps: splitSteps(d.strInstructions),
    tags,
    abv: "",
    time: "",
    vegan: false,
    glutenFree: false,
    lowAbv: false,
    slug: slugify(d.strDrink.trim()),
  };
});

// de-dupe within the import by slug (keep first)
const seen = new Set();
const deduped = cocktails.filter((c) => (seen.has(c.slug) ? false : (seen.add(c.slug), true)));

const header = `// AUTO-GENERATED by tools/import-cocktaildb.mjs — do not edit by hand.
// Source: TheCocktailDB (all_cocktails_expanded.json). ${deduped.length} cocktails with images.
import type { Cocktail } from "./cocktails";

export const IMPORTED_COCKTAILS: Cocktail[] = ${JSON.stringify(deduped, null, 2)};
`;

writeFileSync(OUT, header);
console.log(`Wrote ${deduped.length} cocktails to ${OUT}`);
console.log("category breakdown:");
const counts = {};
for (const c of deduped) counts[c.category] = (counts[c.category] || 0) + 1;
console.log(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${k}: ${v}`).join("\n"));
const withQty = deduped.reduce((n, c) => n + c.ingredients.filter((i) => i.qty != null).length, 0);
const totalIng = deduped.reduce((n, c) => n + c.ingredients.length, 0);
console.log(`scalable ingredients: ${withQty}/${totalIng}`);

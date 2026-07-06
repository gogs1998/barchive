// Shared derivation logic for both importers (TheCocktailDB + Difford's) so
// category and glass taxonomy are computed identically across all sources.

// ml per 1 unit — mirrors apps/web/src/lib/scaler + adapter conversion tables.
export const TO_ML = { oz: 29.5735, ml: 1, cl: 10, tsp: 5, tbsp: 15, dash: 0.6 };

export function toMl(qty, unit) {
  if (qty == null || unit == null) return 0;
  const f = TO_ML[unit];
  return f ? qty * f : 0;
}

// ── Category derivation ─────────────────────────────────────────────────────
// Priority order also acts as the tie-breaker when two categories have equal
// measured volume (base spirits beat modifiers/wine/beer).
const CAT_PATTERNS = [
  ["Tequila", /\btequila\b/],
  ["Mezcal", /\bmezcal\b/],
  ["Rum", /\b(rum|cacha[cç]a|rhum|cane spirit)\b/],
  ["Gin", /\b(gin|genever|jenever)\b/],
  ["Vodka", /\b(vodka|aquavit|akvavit)\b/],
  ["Whiskey", /\b(whisk(?:e)?y|bourbon|\brye\b|scotch)\b/],
  ["Brandy", /\b(brandy|cognac|armagnac|pisco|calvados|grappa|eau de vie|kirsch)\b/],
  [
    "Liqueur",
    /\b(triple sec|cointreau|cura[cç]ao|liqueur|amaretto|campari|aperol|chartreuse|kahl[uú]a|baileys|irish cream|grand marnier|absinthe|amaro|amari|cynar|fernet|sambuca|frangelico|drambuie|midori|chambord|st\.?\s*germain|galliano|j[aä]germeister|advocaat|limoncello|schnapps|pernod|ouzo|pastis|anisette|cr[eè]me de|maraschino|b[eé]n[eé]dictine|disaronno|southern comfort|malibu|tia maria|licor|anis|falernum)\b/,
  ],
  ["Wine", /\b(wine|champagne|prosecco|vermouth|sherry|\bport\b|sake|saké|lillet|dubonnet|cava|moscato)\b/],
  ["Beer", /\b(beer|lager|\bale\b|stout|cider|guinness|porter)\b/],
];
const PRIORITY = CAT_PATTERNS.map(([c]) => c);

// Substrings that must NOT count as "Beer" even though they contain ale/beer.
const NOT_BEER = /ginger ale|ginger beer|root beer/i;

/** Classify a single ingredient name to a spirit/liqueur category, or null. */
export function categoryOf(name) {
  const n = (name || "").toLowerCase();
  for (const [cat, re] of CAT_PATTERNS) {
    if (!re.test(n)) continue;
    if (cat === "Beer" && NOT_BEER.test(n)) continue; // ginger ale / root beer are mixers
    return cat;
  }
  return null;
}

/**
 * Derive a drink's category from its ingredients. Uses the DOMINANT spirit by
 * measured volume rather than the first regex match, so a 10 ml mezcal rinse
 * doesn't outrank a 50 ml cachaça base. Falls back to priority order when no
 * volumes are parseable, then to Mocktail (if flagged non-alcoholic) / Other.
 */
export function deriveCategory(ingredients, { nonAlcoholic = false } = {}) {
  const vol = {};
  const matched = new Set();
  for (const ing of ingredients) {
    const cat = categoryOf(ing.name);
    if (!cat) continue;
    matched.add(cat);
    vol[cat] = (vol[cat] || 0) + toMl(ing.qty, ing.unit);
  }

  let best = null;
  let bestVol = -1;
  for (const [cat, v] of Object.entries(vol)) {
    if (v > bestVol || (v === bestVol && PRIORITY.indexOf(cat) < PRIORITY.indexOf(best))) {
      best = cat;
      bestVol = v;
    }
  }
  if (best && bestVol > 0) return best;

  // No measured volume (all display-only pours) → highest-priority match.
  for (const cat of PRIORITY) if (matched.has(cat)) return cat;

  if (nonAlcoholic) return "Mocktail";
  return "Other";
}

// ── Glass taxonomy ──────────────────────────────────────────────────────────
// One canonical vocabulary applied across all three sources. Keys are compared
// case-insensitively after stripping a trailing "glass" and surrounding junk.
const GLASS_CANON = {
  // Stemmed / up
  cocktail: "Martini",
  martini: "Martini",
  "martini / cocktail": "Martini",
  coupe: "Coupe",
  coupette: "Coupe",
  "cocktail / martini": "Martini",
  nick_and_nora: "Coupe",
  "nick & nora": "Coupe",
  // Flutes
  flute: "Flute",
  "champagne flute": "Flute",
  "champagne coupe": "Coupe",
  champagne: "Flute",
  "champagne tulip": "Flute",
  // Rocks / old fashioned
  rocks: "Rocks",
  "old-fashioned": "Rocks",
  "old fashioned": "Rocks",
  "double old-fashioned": "Rocks",
  "double rocks": "Rocks",
  "whiskey sour": "Rocks",
  "sour glass": "Rocks",
  lowball: "Rocks",
  tumbler: "Rocks",
  // Tall
  highball: "Highball",
  collins: "Collins",
  "tall glass": "Highball",
  chimney: "Highball",
  // Specialty
  hurricane: "Hurricane",
  margarita: "Margarita",
  "margarita / coupette": "Margarita",
  "coupette / margarita": "Margarita",
  "irish coffee": "Irish Coffee",
  "coffee mug": "Irish Coffee",
  mug: "Mug",
  "copper mug": "Mug",
  "moscow mule": "Mug",
  "julep tin": "Julep",
  julep: "Julep",
  tiki: "Tiki",
  "tiki mug": "Tiki",
  goblet: "Goblet",
  "wine glass": "Wine",
  "white wine glass": "Wine",
  "red wine glass": "Wine",
  wine: "Wine",
  "shot glass": "Shot",
  shot: "Shot",
  "shooter": "Shot",
  balloon: "Copa",
  "copa": "Copa",
  "copa de balon": "Copa",
  snifter: "Snifter",
  "brandy snifter": "Snifter",
  "punch bowl": "Punch",
  punch: "Punch",
  // Junk / non-glasses collapse to the closest sensible default.
  beer: "Highball",
  "beer mug": "Mug",
  "beer pilsner": "Highball",
  pilsner: "Highball",
  pitcher: "Punch",
  jar: "Highball",
  "mason jar": "Highball",
  pint: "Highball",
};

/** Normalize any source glass value to the canonical BarIQ vocabulary. */
export function normalizeGlass(raw) {
  if (!raw) return "Coupe";
  const key = String(raw)
    .toLowerCase()
    .replace(/\s*glass\s*$/i, "")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (GLASS_CANON[key]) return GLASS_CANON[key];
  // Title-case unknown-but-plausible values so they at least merge on case.
  return key
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ") || "Coupe";
}

/**
 * Build a separate TheCocktailDB dataset from the licensed API dump.
 * SOURCE ONLY: the output is not imported by the app.
 *
 * Input:  raw/cocktaildb/all.json   (from fetch-cocktaildb.mjs)
 * Output: apps/web/src/lib/cocktails.cocktaildb.ts
 *         apps/web/src/lib/cocktails.cocktaildb.sources.json
 *         apps/web/tools/open-data/REPORT-cocktaildb.md
 *
 * Licence: TheCocktailDB Premium (lifetime) key, bought 2026-10-11.
 * Their terms require the credit line below wherever the data is shown.
 * Images are only used where strCreativeCommonsConfirmed === "Yes".
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALIASES, nameKey } from "./lib/normalize.mjs";
import { deriveDietary } from "./lib/dietary.mjs";
import { slugify } from "./lib/slug.mjs";
import { deriveCategory, normalizeGlass } from "../../../../tools/shared.mjs";

export const CREDIT = "Recipe data and imagery: TheCocktailDB (https://www.thecocktaildb.com/)";

const root = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(root, "../..");
const all = JSON.parse(fs.readFileSync(path.join(root, "raw", "cocktaildb", "all.json"), "utf8"));

// ---------- measures (same rules as the fixed import-cocktaildb.mjs) ----------
const UNIT_MAP = {
  oz: "oz", ounce: "oz", ounces: "oz", shot: "oz", shots: "oz",
  cl: "cl", tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  tbsp: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp", tblsp: "tbsp",
  dash: "dash", dashes: "dash",
};
const TO_ML = { oz: 29.5735, ml: 1, cl: 10, tsp: 5, tbsp: 15, dash: 0.6 };
const SINGLE_SERVE_ML_MAX = 250;
const BRAND_RE =
  /\b(bacardi|smirnoff|absolut|finlandia|malibu|captain morgan|jose cuervo|gordon'?s|(?:red|black|blue|gold) label)\b/gi;

function parseNumber(s) {
  s = s.trim();
  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (m) return +m[1] + +m[2] / +m[3];
  m = s.match(/^(\d+)\/(\d+)/);
  if (m) return +m[1] / +m[2];
  m = s.match(/^(\d+(?:\.\d+)?)/);
  if (m) return +m[1];
  return null;
}
const fmt = (n) => String(Math.round(n * 10000) / 10000);

function parseMeasure(raw) {
  const amount = (raw || "").replace(/\s+/g, " ").trim();
  if (!amount) return { amount: "", qty: null, unit: null };
  let mlVal = null;
  const mlM = amount.match(/(\d+(?:\.\d+)?)\s*ml\b/i);
  if (mlM) mlVal = parseFloat(mlM[1]);
  else {
    const litM = amount.match(/(\d+(?:\.\d+)?|\d+\/\d+)\s*(?:l|litre|liter|litres|liters)\b/i);
    if (litM) mlVal = parseNumber(litM[1]) * 1000;
  }
  if (mlVal != null) {
    if (mlVal >= SINGLE_SERVE_ML_MAX) return { amount, qty: null, unit: null };
    return { amount: `${fmt(mlVal)} ml`, qty: +mlVal.toFixed(4), unit: "ml" };
  }
  const num = parseNumber(amount);
  const um = amount.toLowerCase().match(/\b(oz|ounces?|shots?|cl|tsp|teaspoons?|tbsp|tablespoons?|tblsp|dashes?)\b/);
  if (num != null && um) {
    const unit = UNIT_MAP[um[1]];
    if (unit) {
      if (num * TO_ML[unit] >= SINGLE_SERVE_ML_MAX) return { amount, qty: null, unit: null };
      return { amount: `${fmt(num)} ${unit}`, qty: +num.toFixed(4), unit };
    }
  }
  return { amount: amount.replace(BRAND_RE, "").replace(/\s{2,}/g, " ").trim(), qty: null, unit: null };
}

// ---------- names ----------
function titleCase(s) {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toLocaleUpperCase() + w.slice(1).toLocaleLowerCase() : w))
    .join(" ");
}
/**
 * TheCocktailDB names → the starter-bar vocabulary in
 * src/lib/onboarding-ingredients.ts (the makeable matcher is exact by name).
 * Checked before the shared IBA aliases. Brand names map to their generic
 * spirit only where the drink doesn't depend on the brand.
 */
const TCDB_ALIASES = {
  "light rum": "Light White Rum", "white rum": "Light White Rum", "rum": "Light White Rum",
  "bacardi limon": "Light White Rum",
  "dark rum": "Aged Rum (6-10yr)", "anejo rum": "Aged Rum (6-10yr)", "gold rum": "Aged Rum (6-10yr)",
  "spiced rum": "Aged Rum (6-10yr)",
  "tequila": "Blanco Tequila", "silver tequila": "Blanco Tequila", "blanco tequila": "Blanco Tequila",
  "reposado tequila": "Reposado Tequila",
  "bourbon": "Bourbon Whiskey", "wild turkey": "Bourbon Whiskey",
  "rye whiskey": "Rye Whiskey 50% Abv", "rye": "Rye Whiskey 50% Abv",
  "scotch": "Scotch Whisky", "scotch whisky": "Scotch Whisky", "blended scotch": "Scotch Whisky",
  "brandy": "Cognac (Brandy)", "cognac": "Cognac (Brandy)",
  "absolut vodka": "Vodka", "absolut citron": "Vodka", "absolut kurant": "Vodka",
  "absolut peppar": "Vodka", "lemon vodka": "Vodka", "vanilla vodka": "Vodka",
  "sweet vermouth": "Rosso/Sweet Vermouth", "vermouth": "Rosso/Sweet Vermouth",
  "red vermouth": "Rosso/Sweet Vermouth", "dry vermouth": "Dry Vermouth",
  "campari": "Red Bitter Liqueur",
  "cointreau": "Triple Sec", "triple sec": "Triple Sec",
  "blue curacao": "Orange Curaçao", "orange curacao": "Orange Curaçao", "curacao": "Orange Curaçao",
  "grand marnier": "Grand Marnier",
  "maraschino liqueur": "Maraschino Liqueur",
  "green chartreuse": "Chartreuse Green", "yellow chartreuse": "Chartreuse Yellow",
  "amaretto": "Amaretto Liqueur",
  "kahlua": "Coffee Liqueur", "coffee liqueur": "Coffee Liqueur",
  "apricot brandy": "Apricot Liqueur", "apricot liqueur": "Apricot Liqueur",
  "elderflower liqueur": "Elderflower Liqueur", "st germain": "Elderflower Liqueur",
  "creme de cassis": "Crème de Cassis",
  "club soda": "Soda (Club Soda) Water", "soda water": "Soda (Club Soda) Water",
  "carbonated water": "Soda (Club Soda) Water", "sparkling water": "Soda (Club Soda) Water",
  "tonic water": "Tonic Water", "ginger beer": "Ginger Beer", "ginger ale": "Ginger Ale",
  "coca cola": "Cola", "cola": "Cola", "pepsi cola": "Cola",
  "cranberry juice": "Cranberry Juice", "pineapple juice": "Pineapple Juice",
  "apple juice": "Apple Juice", "lime juice": "Lime Juice", "fresh lime juice": "Lime Juice",
  "lemon juice": "Lemon Juice", "fresh lemon juice": "Lemon Juice", "orange juice": "Orange Juice",
  "grapefruit juice": "Pink Grapefruit Juice",
  "simple syrup": "Sugar Syrup (2:1)", "sugar syrup": "Sugar Syrup (2:1)",
  "agave syrup": "Agave Syrup", "honey syrup": "Honey And Water Syrup",
  "grenadine": "Grenadine Syrup", "orgeat syrup": "Orgeat Syrup", "almond syrup": "Orgeat Syrup",
  "angostura bitters": "Aromatic Bitters", "bitters": "Aromatic Bitters",
  "orange bitters": "Orange Bitters",
  "mint": "Mint Leaves", "fresh mint": "Mint Leaves", "mint leaves": "Mint Leaves",
  "egg white": "Egg White (Pasteurised)",
  "heavy cream": "Whipping Cream", "cream": "Whipping Cream", "whipping cream": "Whipping Cream",
};

let mapped = 0, kept = 0;
function barName(raw) {
  const alias = TCDB_ALIASES[nameKey(raw).trim()] ?? ALIASES[nameKey(raw)];
  if (alias) { mapped++; return alias; }
  kept++;
  return titleCase(raw);
}

// ---------- steps ----------
function splitSteps(instr) {
  if (!instr) return ["Combine the ingredients and serve."];
  let parts = instr.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) {
    parts = instr.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map((s) => s.trim()).filter(Boolean);
  }
  return parts.length ? parts : [instr.trim()];
}

const COLOR = {
  Tequila: "#D4E8A8", Mezcal: "#C9B79C", Rum: "#F5E6CA", Gin: "#BFD8C2",
  Vodka: "#E8EEF2", Whiskey: "#D4A56A", Brandy: "#E8C39E", Liqueur: "#E6C7E0",
  Wine: "#E8B3C0", Beer: "#F2D98D", Mocktail: "#BFE3E0", Other: "#D9D4CA",
};

// ---------- existing sets, for the overlap report ----------
const curatedSrc = fs.readFileSync(path.join(webRoot, "src/lib/cocktails.ts"), "utf8");
const curatedNames = [...curatedSrc.matchAll(/\bC\("[^"]*",\s*"([^"]+)"/g)].map((m) => m[1]);
const curatedSlugs = new Set(curatedNames.map(slugify));
const openSrc = fs.readFileSync(path.join(webRoot, "src/lib/cocktails.open.ts"), "utf8");
const openSlugs = new Set([...openSrc.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));

// ---------- build ----------
const out = [];
const sources = {};
const seen = new Set();
for (const d of all) {
  const name = d.strDrink.trim();
  let slug = slugify(name);
  if (!slug || seen.has(slug)) continue;
  seen.add(slug);

  const ingredients = [];
  for (let i = 1; i <= 15; i++) {
    const ing = (d[`strIngredient${i}`] || "").trim();
    if (!ing) continue;
    const { amount, qty, unit } = parseMeasure(d[`strMeasure${i}`]);
    // "Lime" measured as "Juice of 1" is lime juice, not a garnish.
    const fruit = /^(lime|lemon|orange)$/i.exec(ing);
    const name = fruit && /juice/i.test(amount) ? barName(`${fruit[1]} juice`) : barName(ing);
    ingredients.push({ name, amount, qty, unit });
  }
  if (!ingredients.length) continue;

  const nonAlcoholic = /non[\s-]?alcohol/i.test(d.strAlcoholic || "");
  const category = deriveCategory(ingredients, { nonAlcoholic });
  const { vegan, glutenFree } = deriveDietary(ingredients.map((x) => x.name));
  // Use only CC-confirmed images, and never one TheCocktailDB sourced from Difford's.
  const cc =
    d.strCreativeCommonsConfirmed === "Yes" && !/diffords/i.test(d.strImageSource || "");
  const tags = [
    ...(d.strTags ? d.strTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) : []),
    ...(d.strIBA ? ["iba"] : []),
    ...(nonAlcoholic ? ["non-alcoholic"] : []),
    "cocktaildb",
  ];

  out.push({
    id: `cdb-${d.idDrink}`,
    name,
    category,
    glass: normalizeGlass(d.strGlass),
    img: cc && d.strDrinkThumb ? d.strDrinkThumb : "",
    color: COLOR[category] || COLOR.Other,
    ingredients,
    steps: splitSteps(d.strInstructions),
    tags: [...new Set(tags)],
    abv: "",
    time: "",
    vegan,
    glutenFree,
    lowAbv: false,
    slug,
  });

  sources[slug] = {
    source: "TheCocktailDB",
    sourceUrl: `https://www.thecocktaildb.com/drink/${d.idDrink}`,
    licence: "TheCocktailDB Premium API key (lifetime), credit required",
    credit: CREDIT,
    alcoholic: d.strAlcoholic,
    iba: d.strIBA || null,
    image: {
      url: d.strDrinkThumb || null,
      creativeCommonsConfirmed: cc,
      used: cc && !!d.strDrinkThumb,
      source: d.strImageSource || null,
      attribution: d.strImageAttribution || null,
    },
    overlapsCurated: curatedSlugs.has(slug),
    overlapsOpenIba: openSlugs.has(slug),
  };
}

// ---------- write ----------
const header = `/**
 * TheCocktailDB dataset (licensed via Premium API). Not imported by the app.
 * Generated by apps/web/tools/open-data/build-cocktaildb.mjs — do not edit by hand.
 * Credit required wherever shown: ${CREDIT}
 * Sources and image licences: ./cocktails.cocktaildb.sources.json
 */
import type { Cocktail } from "./cocktails";

export const COCKTAILDB_CREDIT = ${JSON.stringify(CREDIT)};

export const COCKTAILDB_COCKTAILS: Cocktail[] = ${JSON.stringify(out, null, 2)};
`;
fs.writeFileSync(path.join(webRoot, "src/lib/cocktails.cocktaildb.ts"), header);
fs.writeFileSync(
  path.join(webRoot, "src/lib/cocktails.cocktaildb.sources.json"),
  JSON.stringify(sources, null, 2),
);

// ---------- report ----------
const withImg = out.filter((c) => c.img).length;
const byCat = {};
for (const c of out) byCat[c.category] = (byCat[c.category] || 0) + 1;
const ovCur = Object.values(sources).filter((s) => s.overlapsCurated).length;
const ovIba = Object.values(sources).filter((s) => s.overlapsOpenIba).length;
const newOnes = Object.values(sources).filter((s) => !s.overlapsCurated && !s.overlapsOpenIba).length;
const nonAlc = out.filter((c) => c.tags.includes("non-alcoholic")).length;

const report = `# TheCocktailDB dataset

Separate from the live library. Nothing here is imported by the app.

Licence: TheCocktailDB Premium API key (lifetime, bought 2026-10-11). Data pulled only through
the official V2 API, never scraped. Their terms require this credit wherever it is shown:

> ${CREDIT}

## Counts

- Recipes: ${out.length} (from ${all.length} drinks in the API).
- Non-alcoholic: ${nonAlc}.
- With an image: ${withImg}. Only images TheCocktailDB marks \`strCreativeCommonsConfirmed: Yes\` are used.
- Without an image: ${out.length - withImg}. Their image URLs are kept in the sources file in case
  you decide to use them later, but they are not used here.
- Overlap with your 79 curated cocktails (same slug): ${ovCur}.
- Overlap with Grok's 102 IBA cocktails (same slug): ${ovIba}.
- New, in neither set: ${newOnes}.

## By category

${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

## Ingredient names

${mapped} ingredient lines were mapped to the bar vocabulary used by onboarding (so "What Can I
Make?" matches). ${kept} kept TheCocktailDB's own name, title-cased. Those will not match the
starter bar until more aliases are added to \`lib/normalize.mjs\`.

## Notes

- Method text is TheCocktailDB's own instructions, shown under their licence with credit.
  It is not rewritten.
- Measures use the same parser as the fixed importer: ml first, batch pours over 250 ml are
  display-only, brand names stripped from amounts.
- Image URLs point at thecocktaildb.com, which their terms allow (use the \`strDrinkThumb\` URL).
  Self-hosting them is an option later.

## Re-run

From \`apps/web/tools/open-data\` (needs \`.env\` with \`COCKTAILDB_KEY\`):

\`\`\`
node fetch-cocktaildb.mjs     # download via API into raw/cocktaildb (--refresh to redownload)
node build-cocktaildb.mjs     # write the module, sources file and this report
\`\`\`
`;
fs.writeFileSync(path.join(root, "REPORT-cocktaildb.md"), report);
console.log(report);

// Transform scraped Difford's recipes -> barchive Cocktail[] TS module.
// Inputs:
//   tools/diffords/raw/diffords_recipes.json  (scraped recipes)
//   tools/diffords/raw/images.json            (source_url -> image URL; optional)
// Output:
//   apps/web/src/lib/cocktails.diffords.ts  (DIFFORDS_COCKTAILS: Cocktail[])

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const RECIPES = "D:/VM/BarIQ PC/barchive/tools/diffords/raw/diffords_recipes.json";
const IMAGES = "D:/VM/BarIQ PC/barchive/tools/diffords/raw/images.json";
const OUT = "D:/VM/BarIQ PC/barchive/apps/web/src/lib/cocktails.diffords.ts";

function slugify(name) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function titleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
function fmtMl(n) {
  const r = Math.round(n * 100) / 100;
  return (r === Math.floor(r) ? String(r) : r.toFixed(2).replace(/\.?0+$/, "")) + " ml";
}

// Decode the HTML entities Difford's leaves in its JSON-LD text.
function decodeEntities(s) {
  return String(s == null ? "" : s)
    .replace(/&frasl;/gi, "/")
    .replace(/&frac12;/gi, "1/2").replace(/&frac14;/gi, "1/4").replace(/&frac34;/gi, "3/4")
    .replace(/&frac13;/gi, "1/3").replace(/&frac23;/gi, "2/3")
    .replace(/&nbsp;/gi, " ").replace(/&hellip;/gi, "…").replace(/&deg;/gi, "°")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#0?39;|&apos;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&amp;/gi, "&");
}

// Normalise Difford's typography: fraction slash (U+2044) and vulgar fractions.
const FRAC = { "½": "1/2", "¼": "1/4", "¾": "3/4", "⅓": "1/3", "⅔": "2/3", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8", "⅙": "1/6", "⅚": "5/6", "⅕": "1/5", "⅖": "2/5", "⅗": "3/5", "⅘": "4/5" };
function normFrac(s) {
  return decodeEntities(s)
    .replace(/⁄/g, "/")
    .replace(/[½¼¾⅓⅔⅛⅜⅝⅞⅙⅚⅕⅖⅗⅘]/g, (m) => " " + FRAC[m])
    .replace(/\s+/g, " ")
    .trim();
}
const COUNT_UNITS =
  "whole|fresh|dried|cube|cubes|slice|slices|sprig|sprigs|leaf|leaves|pinch|wedge|wedges|dash|dashes|drop|drops|barspoon|spoon|scoop|scoops|piece|pieces|strip|strips|wheel|wheels|twist|twists|chunk|chunks|handful|stick|sticks|stalk|stalks|stem|stems|head|cup|cups|tsp|tbsp|teaspoon|tablespoon|shot|shots|part|parts";
const COUNT_RE = new RegExp(
  "^((?:\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:\\.\\d+)?))\\s+(?:(" + COUNT_UNITS + ")\\s+)?(.+)$",
  "i"
);
// Split a raw measure string into a display amount + clean ingredient name.
function cleanCountIngredient(original) {
  const s = normFrac(original || "");
  const m = s.match(COUNT_RE);
  if (m) {
    const amount = (m[1] + (m[2] ? " " + m[2] : "")).trim();
    return { name: m[3].trim(), amount };
  }
  return { name: s, amount: "" };
}

const SPIRITS = [
  [/\btequila\b/, "Tequila"], [/\bmezcal\b/, "Mezcal"],
  [/\b(rum|cacha[cç]a|rhum)\b/, "Rum"], [/\bgin\b/, "Gin"], [/\bvodka\b/, "Vodka"],
  [/\b(whisk(e)?y|bourbon|rye|scotch)\b/, "Whiskey"],
  [/\b(brandy|cognac|armagnac|pisco|calvados)\b/, "Brandy"],
  [/\b(triple sec|cointreau|curacao|cura[cç]ao|liqueur|amaretto|campari|aperol|chartreuse)\b/, "Liqueur"],
  [/\b(wine|champagne|prosecco|vermouth|sherry|port|sake)\b/, "Wine"],
  [/\b(beer|lager|ale|stout|cider)\b/, "Beer"],
];
function deriveCategory(names) {
  const hay = names.join(" ").toLowerCase();
  for (const [re, cat] of SPIRITS) if (re.test(hay)) return cat;
  return "Other";
}
const COLOR = {
  Tequila: "#D4E8A8", Mezcal: "#C9B79C", Rum: "#F5E6CA", Gin: "#BFD8C2", Vodka: "#E8EEF2",
  Whiskey: "#D4A56A", Brandy: "#E8C39E", Liqueur: "#E6C7E0", Wine: "#E8B3C0", Beer: "#F2D98D", Other: "#D9D4CA",
};
const GLASS_MAP = { unknown: "Coupe", martini: "Martini", coupe: "Coupe", rocks: "Rocks", highball: "Highball", collins: "Collins", flute: "Flute", hurricane: "Hurricane" };

const allRecipes = JSON.parse(readFileSync(RECIPES, "utf8"));
const images = existsSync(IMAGES) ? JSON.parse(readFileSync(IMAGES, "utf8")) : {};
const haveImages = Object.keys(images).length;

// Quality subset: confidently-parsed glass, well-rated, real recipe.
const QUALITY = (r) =>
  r.glass && r.glass !== "unknown" &&
  Array.isArray(r.ingredients) && r.ingredients.length >= 2 &&
  typeof r.rating === "number" && r.rating >= 4;
const recipes = allRecipes.filter(QUALITY);
console.log(`quality filter: ${recipes.length}/${allRecipes.length} pass (real glass + >=2 ing + rating>=4)`);

const out = [];
const seen = new Set();
for (const r of recipes) {
  const slug = slugify(r.name);
  if (!slug || seen.has(slug)) continue;
  seen.add(slug);

  const ingredients = (r.ingredients || []).map((ing) => {
    if (ing.amount_ml != null && Number.isFinite(ing.amount_ml)) {
      return { name: titleCase(decodeEntities(ing.name)), amount: fmtMl(ing.amount_ml), qty: ing.amount_ml, unit: "ml" };
    }
    // Non-ml (countable garnish / muddled item): re-parse the raw measure so the
    // count + qualifier land in `amount`, not in the ingredient name.
    const { name, amount } = cleanCountIngredient(ing.original || ing.name);
    return { name: titleCase(name), amount, qty: null, unit: null };
  });
  if (!ingredients.length) continue;

  const category = deriveCategory(ingredients.map((i) => i.name));
  const steps = (r.notes ? r.notes.split("|").map((s) => decodeEntities(s).trim()).filter(Boolean) : []);
  const idm = (r.source_url || "").match(/\/recipe\/(\d+)\//);

  out.push({
    id: "diffords-" + (idm ? idm[1] : slug),
    name: decodeEntities(r.name).trim(),
    category,
    glass: GLASS_MAP[r.glass] || titleCase(r.glass || "Coupe"),
    img: images[r.source_url] || "",
    color: COLOR[category] || COLOR.Other,
    ingredients,
    steps: steps.length ? steps : ["Combine ingredients and serve."],
    tags: r.technique && r.technique !== "unknown" ? [r.technique] : [],
    abv: "",
    time: "",
    vegan: false,
    glutenFree: false,
    lowAbv: false,
    slug,
  });
}

const header = `// AUTO-GENERATED by tools/import-diffords.mjs — do not edit by hand.
// Source: Difford's Guide (scraped). ${out.length} cocktails${haveImages ? `, ${haveImages} with images` : " (images pending backfill)"}.
import type { Cocktail } from "./cocktails";

export const DIFFORDS_COCKTAILS: Cocktail[] = ${JSON.stringify(out, null, 2)};
`;
writeFileSync(OUT, header);

const withImg = out.filter((c) => c.img).length;
const counts = {};
for (const c of out) counts[c.category] = (counts[c.category] || 0) + 1;
console.log(`Wrote ${out.length} Difford's cocktails to ${OUT}`);
console.log(`with images: ${withImg}/${out.length} (image map size ${haveImages})`);
console.log("categories:", Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(", "));

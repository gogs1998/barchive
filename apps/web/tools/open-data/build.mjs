/**
 * Build the open cocktail module from raw IBA facts.
 *
 * Usage:
 *   node build.mjs            write the dataset
 *   node build.mjs --preview  print technique choices and write nothing
 *
 * Outputs (only when not previewing):
 *   apps/web/src/lib/cocktails.open.ts
 *   apps/web/src/lib/cocktails.open.sources.json
 *   apps/web/tools/open-data/REPORT.md
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseIngredientList } from "./lib/normalize.mjs";
import { deriveDietary, parseAmount } from "./lib/dietary.mjs";
import { slugify, tidyName } from "./lib/slug.mjs";
import { classify, writeSteps } from "./lib/steps.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(root, "../..");
const preview = process.argv.includes("--preview");

const DISPLAY = {
  "pina-colada": "Piña Colada",
  "corpse-reviver-2": "Corpse Reviver No. 2",
  "porn-star-martini": "Pornstar Martini",
  "dark-n-stormy": "Dark 'n' Stormy",
  "mai-tai": "Mai Tai",
  "bees-knees": "Bee's Knees",
  "tommys-margarita": "Tommy's Margarita",
  "dons-special-daiquiri": "Don's Special Daiquiri",
  "missionarys-downfall": "Missionary's Downfall",
  "horses-neck": "Horse's Neck",
};

/** Open slug → curated slug, when the official name differs. */
const COVERS = {
  "dry-martini": "martini",
  "john-collins": "tom-collins",
  "spritz": "aperol-spritz",
  "alexander": "brandy-alexander",
  "hemingway-special": "hemingway-daiquiri",
  "vesper": "vesper-martini",
};

const ABV = {
  Gin: 40, "Old Tom Gin": 40, Vodka: 40, "Citrus Vodka": 40, "Vanilla Vodka": 40,
  "Light White Rum": 40, "Aged Rum (6-10yr)": 40, "Blackstrap Rum": 40, "Smoked Rum": 40,
  "Overproof Rum": 63, "Agricole Rhum": 50, "Cachaça": 40, Aguardiente: 40,
  "Blanco Tequila": 40, "Reposado Tequila": 40, Mezcal: 40,
  "Bourbon Whiskey": 40, "Rye Whiskey 50% Abv": 50, "Scotch Whisky": 40,
  "Islay Scotch Whisky": 43, "Irish Whiskey": 40, "Cognac (Brandy)": 40,
  Calvados: 40, Pisco: 40, Grappa: 40, Absinthe: 45,
  "Red Bitter Liqueur": 25, Aperol: 11, "Rosso/Sweet Vermouth": 16, "Dry Vermouth": 18,
  "Lillet Blanc": 17, "Triple Sec": 40, "Orange Curaçao": 40, "Maraschino Liqueur": 32,
  "Chartreuse Green": 55, "Chartreuse Yellow": 40, "Grand Marnier": 40,
  "Amaretto Liqueur": 28, "Coffee Liqueur": 20, "Apricot Liqueur": 24,
  "Crème de Cassis": 15, "Crème de Mûre": 16, "Crème de Cacao (white)": 25,
  "Crème de Cacao (dark)": 25, "Crème de Menthe (green)": 24, "Crème de Menthe (white)": 24,
  "Crème de Violette": 20, "Bénédictine": 40, Drambuie: 40, Falernum: 11,
  "Fernet-Branca": 39, Frangelico: 20, "Cherry Liqueur": 24, "Peach Schnapps": 18,
  "Passionfruit Liqueur": 17, "Raspberry Liqueur": 15, "Elderflower Cordial": 0,
  Cynar: 16, "Amaro Nonino": 35, "Allspice Dram": 22,
  Prosecco: 11, Champagne: 12, "Sparkling Wine": 11,
  "Dry White Wine": 12, "Dry Red Wine": 13, "Tawny Port": 20,
  "Amontillado Sherry": 18, "Palo Cortado": 18,
  "Aromatic Bitters": 44.5, "Peychaud's Bitters": 35, "Orange Bitters": 28,
};

const SPIRITS = [
  ["Blanco Tequila", "Tequila"], ["Reposado Tequila", "Tequila"], ["Mezcal", "Mezcal"],
  ["Light White Rum", "Rum"], ["Aged Rum (6-10yr)", "Rum"], ["Blackstrap Rum", "Rum"],
  ["Smoked Rum", "Rum"], ["Overproof Rum", "Rum"], ["Agricole Rhum", "Rum"],
  ["Cachaça", "Cachaça"], ["Aguardiente", "Other"],
  ["Gin", "Gin"], ["Old Tom Gin", "Gin"],
  ["Vodka", "Vodka"], ["Citrus Vodka", "Vodka"], ["Vanilla Vodka", "Vodka"],
  ["Bourbon Whiskey", "Whiskey"], ["Rye Whiskey 50% Abv", "Whiskey"],
  ["Scotch Whisky", "Whiskey"], ["Islay Scotch Whisky", "Whiskey"], ["Irish Whiskey", "Whiskey"],
  ["Cognac (Brandy)", "Brandy"], ["Calvados", "Brandy"], ["Pisco", "Pisco"],
  ["Grappa", "Other"], ["Absinthe", "Other"],
];

const COLORS = {
  Tequila: "#C6D98C", Mezcal: "#C4A06A", Rum: "#E4C48A", "Cachaça": "#D4E09A",
  Gin: "#D7E8DC", Whiskey: "#C9956A", Vodka: "#E6E6DE", Brandy: "#E6D2AE",
  Champagne: "#F3D5C4", Aperitivo: "#E07040", Pisco: "#E8D7B8", Wine: "#8C3A4A",
  Beer: "#C4B06A", Liqueur: "#C9D7C4", Other: "#C4B7A6",
};

function round(n) {
  return Math.round(n * 100) / 100;
}

function abvOf(name) {
  if (Object.prototype.hasOwnProperty.call(ABV, name)) return ABV[name];
  if (/bitters/i.test(name)) return 40;
  if (/liqueur|schnapps|amaro|chartreuse/i.test(name)) return 20;
  if (/wine|sherry|port|prosecco|champagne/i.test(name)) return 12;
  if (/\b(rum|gin|vodka|tequila|whiskey|whisky|brandy|cognac|mezcal|pisco|grappa|absinthe|scotch)\b/i.test(name)) return 40;
  return 0;
}

function mergeIngredients(items) {
  const out = [];
  for (const item of items) {
    const prev = out.find((p) => p.name === item.name && p.unit && p.unit === item.unit && p.qty != null && item.qty != null);
    if (prev) {
      prev.qty = round(prev.qty + item.qty);
      prev.amount = `${prev.qty} ${prev.unit}`;
      prev.ml = round(prev.ml + item.ml);
      prev.merged = (prev.merged || 1) + 1;
    } else {
      out.push({ ...item, notes: [...(item.notes || [])] });
    }
  }
  return out;
}

function categoryOf(ingredients) {
  const byName = new Map(ingredients.map((i) => [i.name, i]));
  const has = (n) => byName.has(n);
  const found = SPIRITS.map(([name, category]) => ({
    name, category, ml: byName.get(name)?.ml || 0,
  })).filter((s) => s.ml > 0);
  found.sort((a, b) => b.ml - a.ml);
  const best = found[0];
  const close = best ? found.filter((s) => s.ml >= best.ml - 1) : [];
  if (close.length >= 3) return "Other";
  const sparkling = has("Prosecco") || has("Champagne") || has("Sparkling Wine");
  if ((has("Aperol") || has("Red Bitter Liqueur")) && sparkling && (!best || best.ml < 20)) return "Aperitivo";
  if (has("Red Bitter Liqueur") && has("Rosso/Sweet Vermouth") && has("Soda (Club Soda) Water") && !best) return "Aperitivo";
  if (!best && sparkling) return "Champagne";
  if (!best && (has("Dry White Wine") || has("Dry Red Wine") || has("Tawny Port") || has("Amontillado Sherry") || has("Palo Cortado"))) return "Wine";
  if (!best && has("Red Bitter Liqueur")) return "Aperitivo";
  if (!best) return "Liqueur";
  return best.category;
}

function colorFor(category, slug) {
  const base = COLORS[category] || COLORS.Other;
  const n = [...slug].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const shift = (n % 7) - 3;
  const hex = base.slice(1).match(/../g).map((h) => {
    const v = Math.max(0, Math.min(255, parseInt(h, 16) + shift));
    return v.toString(16).padStart(2, "0");
  });
  return `#${hex.join("")}`.toUpperCase();
}

function estimateAbv(ingredients, info) {
  let alcohol = 0;
  let volume = 0;
  for (const item of ingredients) {
    let ml = item.ml || 0;
    if (info.rinse && item.name === "Absinthe") ml = Math.min(ml, 1);
    if (!ml) continue;
    volume += ml;
    alcohol += ml * (abvOf(item.name) / 100);
  }
  if (volume <= 0) return "0%";
  return `${Math.round((alcohol / volume) * 100)}%`;
}

function timeFor(technique) {
  if (technique === "hot") return "5 min";
  if (technique === "blend" || technique === "swizzle" || technique === "muddle" || technique === "muddle-shake") return "3 min";
  return "2 min";
}

function foldWords(s) {
  return s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}

function phraseOverlap(step, source) {
  const words = foldWords(step);
  const hay = foldWords(source).join(" ");
  for (let n = 8; n >= 6; n--) {
    for (let i = 0; i + n <= words.length; i++) {
      const phrase = words.slice(i, i + n).join(" ");
      if (phrase.length > 20 && hay.includes(phrase)) return phrase;
    }
  }
  return null;
}

function loadIba() {
  const dir = path.join(root, "raw", "iba");
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
}

function loadImageManifest() {
  const p = path.join(root, "raw", "images", "manifest.json");
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function curatedNames() {
  const text = fs.readFileSync(path.join(webRoot, "src/lib/cocktails.ts"), "utf8");
  const block = text.split("const CURATED_COCKTAILS")[1].split("export const COCKTAILS")[0];
  return [...block.matchAll(/C\("[^"]+", "([^"]+)"/g)].map((m) => m[1]);
}

function libraryNames() {
  const names = new Set(curatedNames());
  for (const file of ["cocktails.imported.ts", "cocktails.diffords.ts"]) {
    const text = fs.readFileSync(path.join(webRoot, "src/lib", file), "utf8");
    for (const m of text.matchAll(/^ {4}"name": "([^"]+)"/gm)) names.add(m[1]);
  }
  return names;
}

function buildOne(rec, images) {
  const parsed = parseIngredientList(rec.ingredientsRaw);
  if (parsed.errors.length) {
    throw new Error(`${rec.name}: ${parsed.errors.join("; ")}`);
  }
  let ingredients = mergeIngredients(parsed.items);
  const mergedNote = ingredients.filter((i) => i.merged > 1).map((i) => `${i.merged} published measures of ${i.name} were combined`);
  const display = tidyName(DISPLAY[rec.slug] || rec.name);
  const slug = slugify(display);
  const info = classify(rec, ingredients);
  const steps = writeSteps(rec, ingredients, info);
  const overlaps = [];
  const sourceText = rec.methodRaw || "";
  for (const step of steps) {
    const hit = phraseOverlap(step, sourceText);
    if (hit) overlaps.push({ step, hit });
  }
  const names = ingredients.map((i) => i.name);
  const dietary = deriveDietary(names);
  const abv = estimateAbv(ingredients, info);
  const category = categoryOf(ingredients);
  const image = images[slug] || images[rec.slug] || null;
  if (image && image.file) {
    const abs = path.join(webRoot, "public", image.file.replace(/^\//, ""));
    if (!fs.existsSync(abs)) throw new Error(`image listed but missing on disk: ${image.file}`);
  }
  const cocktail = {
    id: `open-${slug}`,
    name: display,
    category,
    glass: info.glass,
    img: image ? image.file : "",
    color: colorFor(category, slug),
    ingredients: ingredients.map((i) => {
      const parsedAmt = parseAmount(i.amount);
      const qty = parsedAmt.qty == null ? null : parsedAmt.qty;
      const unit = parsedAmt.unit;
      return { name: i.name, amount: i.amount, qty, unit };
    }),
    steps,
    tags: ["iba", rec.ibaCategory || "unlisted", info.technique],
    abv,
    time: timeFor(info.technique),
    vegan: dietary.vegan,
    glutenFree: dietary.glutenFree,
    lowAbv: Number.parseInt(abv, 10) < 15,
    slug,
  };
  const notes = [...parsed.notes, ...mergedNote];
  const source = {
    slug,
    name: display,
    publishedName: tidyName(rec.name),
    ibaCategory: rec.ibaCategory,
    recipeSources: [rec.url],
    recipeLicence:
      "Ingredient names, amounts, glass and garnish are facts from the IBA official cocktail specification at recipeSources. Preparation steps were written for this dataset and do not reproduce IBA wording. IBA photographs and method text were not copied.",
    publishedIngredients: rec.ingredientsRaw,
    notes,
    imageSourceUrl: image ? image.sourceUrl : null,
    imageAuthor: image ? image.author : null,
    imageLicence: image ? image.licence : null,
  };
  return { cocktail, source, info, overlaps, ibaSlug: rec.slug };
}

function emitTs(cocktails) {
  const lines = [];
  lines.push("/**");
  lines.push(" * Open-licence cocktail dataset. Not imported by the app.");
  lines.push(" * Generated by apps/web/tools/open-data/build.mjs — do not edit by hand.");
  lines.push(" * Sources and licences: ./cocktails.open.sources.json");
  lines.push(" */");
  lines.push('import type { Cocktail } from "./cocktails";');
  lines.push("");
  lines.push("export const OPEN_COCKTAILS: Cocktail[] = [");
  for (const c of cocktails) {
    lines.push("  {");
    lines.push(`    id: ${JSON.stringify(c.id)},`);
    lines.push(`    name: ${JSON.stringify(c.name)},`);
    lines.push(`    category: ${JSON.stringify(c.category)},`);
    lines.push(`    glass: ${JSON.stringify(c.glass)},`);
    lines.push(`    img: ${JSON.stringify(c.img)},`);
    lines.push(`    color: ${JSON.stringify(c.color)},`);
    lines.push("    ingredients: [");
    for (const i of c.ingredients) {
      lines.push(
        `      { name: ${JSON.stringify(i.name)}, amount: ${JSON.stringify(i.amount)}, qty: ${i.qty === null ? "null" : i.qty}, unit: ${i.unit === null ? "null" : JSON.stringify(i.unit)} },`,
      );
    }
    lines.push("    ],");
    lines.push(`    steps: ${JSON.stringify(c.steps)},`);
    lines.push(`    tags: ${JSON.stringify(c.tags)},`);
    lines.push(`    abv: ${JSON.stringify(c.abv)},`);
    lines.push(`    time: ${JSON.stringify(c.time)},`);
    lines.push(`    vegan: ${c.vegan},`);
    lines.push(`    glutenFree: ${c.glutenFree},`);
    lines.push(`    lowAbv: ${c.lowAbv},`);
    lines.push(`    slug: ${JSON.stringify(c.slug)},`);
    lines.push("  },");
  }
  lines.push("];");
  lines.push("");
  return lines.join("\n");
}

function writeReport(cocktails, sources, curated) {
  const withImg = cocktails.filter((c) => c.img).length;
  const bySlug = new Map(cocktails.map((c) => [c.slug, c]));
  const covered = [];
  const missed = [];
  for (const name of curated) {
    const slug = slugify(name);
    const via = [...bySlug.keys()].find((s) => s === slug || COVERS[s] === slug);
    if (via) covered.push(`${name} (as ${bySlug.get(via).name})`);
    else missed.push(name);
  }
  const lib = libraryNames();
  let libHit = 0;
  for (const c of cocktails) if (lib.has(c.name) || [...lib].some((n) => slugify(n) === c.slug)) libHit++;

  const lines = [];
  lines.push("# Open cocktail dataset");
  lines.push("");
  lines.push("Separate from the live library. Nothing here is imported by the app.");
  lines.push("");
  lines.push("## Counts");
  lines.push("");
  lines.push(`- Recipes: ${cocktails.length}, all from the IBA official list published at iba-world.com.`);
  lines.push(`- With a self-hosted Commons image: ${withImg}.`);
  lines.push(`- Without an image (the UI falls back to a colour card): ${cocktails.length - withImg}.`);
  const noImg = cocktails.filter((c) => !c.img).map((c) => c.name);
  if (noImg.length) lines.push(`- No clean Commons photo for: ${noImg.join(", ")}.`);
  lines.push(`- Curated classics covered: ${covered.length} of ${curated.length}.`);
  lines.push(`- Name overlap with the current full library (curated + imported + Difford's): ${libHit} of ${cocktails.length} open recipes use a name already in that library.`);
  lines.push("");
  lines.push("## Curated classics covered");
  lines.push("");
  for (const row of covered) lines.push(`- ${row}`);
  lines.push("");
  lines.push("## Curated classics not covered");
  lines.push("");
  lines.push("These are not on the current IBA list, or they are house recipes with no open specification. They were not invented to fill the gap.");
  lines.push("");
  for (const name of missed) lines.push(`- ${name}`);
  lines.push("");
  lines.push("## Licence notes");
  lines.push("");
  lines.push("- IBA pages are copyrighted. This dataset uses ingredient names, amounts, the serving glass and the garnish as facts. Steps are original. IBA photos were not downloaded.");
  lines.push("- Simple syrup and sugar syrup from the IBA (usually 1:1) are named Sugar Syrup (2:1), and Campari is named Red Bitter Liqueur, so they match the starter bar in onboarding. The published wording is kept on each record in cocktails.open.sources.json.");
  lines.push("- Rye is named Rye Whiskey 50% Abv for the same reason. ABV maths treats that bottle as 50%.");
  lines.push("- Gosling's rum in Dark 'n' Stormy is stored as Aged Rum (6-10yr). The drink name is the IBA's. Gosling's treats that name as a trademark.");
  lines.push("- A bar spoon was read as 5 ml (1 tsp). Donn's Mix was split using the IBA's own note (2 parts grapefruit juice, 1 part cinnamon syrup). One IBA list item had two measures jammed together and was split.");
  lines.push("- John Collins is the IBA gin collins. The page notes Old Tom gin if you want a Tom Collins. It is counted here as the Tom Collins classic.");
  lines.push("- Alexander on the IBA list is cognac, crème de cacao and cream, which is the brandy Alexander.");
  lines.push("- Vesper is the same drink as the curated Vesper Martini. The IBA name does not include the word Martini.");
  lines.push("- The Kir page notes that champagne in place of the wine makes a Kir Royal. The Black Russian page notes that cream floated on top makes a White Russian. Those pages do not give the variants their own measures, so they are not separate records.");
  lines.push("- Images, where present, are Wikimedia Commons files with a CC0, CC BY or CC BY-SA licence. Author, licence and source URL are in the sources file. NC and ND files were skipped.");
  lines.push("- No recipe was taken from Difford's Guide, TheCocktailDB, Liquor.com or Punch.");
  lines.push("");
  lines.push("## Re-run");
  lines.push("");
  lines.push("From `apps/web/tools/open-data`:");
  lines.push("");
  lines.push("```");
  lines.push("node fetch-iba.mjs          # download IBA pages into raw/ (skipped if already saved; --refresh forces it)");
  lines.push("node reparse-iba.mjs         # parse saved HTML again after a parser change");
  lines.push("node fetch-images.mjs        # Commons search, licence check, webp into public/img/cocktails");
  lines.push("node build.mjs               # write cocktails.open.ts, the sources file, and this report");
  lines.push("```");
  lines.push("");
  lines.push("`raw/` is gitignored. The generated module, the sources file and the images are the committed output.");
  lines.push("");
  return lines.join("\n");
}

function main() {
  const records = loadIba();
  const images = loadImageManifest();
  const built = records.map((rec) => buildOne(rec, images));
  const overlaps = built.filter((b) => b.overlaps.length);
  if (overlaps.length) {
    console.log("OVERLAP with source wording:");
    for (const b of overlaps) {
      for (const o of b.overlaps) console.log(`  ${b.cocktail.name}: "${o.hit}"`);
    }
    if (!preview) process.exitCode = 1;
  }
  const slugs = new Set();
  for (const b of built) {
    if (slugs.has(b.cocktail.slug)) throw new Error(`duplicate slug ${b.cocktail.slug}`);
    slugs.add(b.cocktail.slug);
    if (b.cocktail.steps.length < 3 || b.cocktail.steps.length > 6) {
      throw new Error(`${b.cocktail.name} has ${b.cocktail.steps.length} steps`);
    }
  }
  built.sort((a, b) => a.cocktail.name.localeCompare(b.cocktail.name));
  if (preview) {
    for (const b of built) {
      console.log(`${b.info.technique}\t${b.info.service}\t${b.cocktail.glass}\t${b.cocktail.category}\t${b.cocktail.abv}\t${b.cocktail.name}`);
    }
    console.log("drinks", built.length, "overlaps", overlaps.length);
    return;
  }
  const cocktails = built.map((b) => b.cocktail);
  const sources = {};
  for (const b of built) sources[b.cocktail.slug] = b.source;
  const tsPath = path.join(webRoot, "src/lib/cocktails.open.ts");
  const jsonPath = path.join(webRoot, "src/lib/cocktails.open.sources.json");
  fs.writeFileSync(tsPath, emitTs(cocktails));
  fs.writeFileSync(jsonPath, JSON.stringify(sources, null, 2) + "\n");
  const report = writeReport(cocktails, sources, curatedNames());
  fs.writeFileSync(path.join(root, "REPORT.md"), report);
  console.log(`wrote ${cocktails.length} cocktails`);
  console.log(tsPath);
  console.log(jsonPath);
}

main();
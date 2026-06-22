// Difford's Guide scraper (Node port of scrape_diffords_v2.py)
// Extracts schema.org/Recipe JSON-LD from each recipe page.
// Resumable: checkpoints every CHECKPOINT recipes; skips already-scraped URLs.
//
// Usage:
//   node scrape.mjs                 # full run, 2s delay
//   node scrape.mjs --limit 50      # first 50 URLs (test)
//   node scrape.mjs --delay 2500    # custom delay (ms)
//
// Output:
//   raw/diffords_recipes.json  (array of recipe objects)
//   raw/checkpoint.json        ({ scrapedUrls, failedUrls })
//   raw/scrape_log.txt         (progress log)

import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const URLS_FILE = join(ROOT, "difford_all_urls.json");
const OUT_FILE = join(ROOT, "raw", "diffords_recipes.json");
const CKPT_FILE = join(ROOT, "raw", "checkpoint.json");
const LOG_FILE = join(ROOT, "raw", "scrape_log.txt");

const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const LIMIT = parseInt(getArg("--limit", "0"), 10);
const DELAY = parseInt(getArg("--delay", "2000"), 10);
const CHECKPOINT = 50;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const ML = {
  oz: 30, ml: 1, cl: 10, dash: 1, dashes: 1, drop: 0.05, drops: 0.05,
  barspoon: 5, tsp: 5, tbsp: 15, part: 30, parts: 30, splash: 5, shot: 30, shots: 30,
};

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { appendFileSync(LOG_FILE, line + "\n"); } catch {}
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseFraction(s) {
  if (s.includes("/")) {
    const [a, b] = s.split("/");
    return parseFloat(a) / parseFloat(b);
  }
  return parseFloat(s);
}

function parseIngredient(str) {
  const m = str.match(
    /^([\d.]+(?:\/[\d]+)?)\s*(ml|cl|oz|dashes|dash|drops|drop|barspoon|tsp|tbsp|parts|part|splash|shots|shot)\b\.?\s*(.+)$/i
  );
  if (m) {
    const amount = parseFraction(m[1]);
    const unit = m[2].toLowerCase();
    return {
      name: m[3].trim().toLowerCase(),
      amount_ml: +(amount * (ML[unit] ?? 30)).toFixed(2),
      unit: "ml",
      original: str.trim(),
    };
  }
  return { name: str.trim().toLowerCase(), amount_ml: null, unit: null, original: str.trim() };
}

function instrText(inst) {
  if (typeof inst === "string") return inst;
  if (inst && typeof inst === "object") return inst.text || inst.name || "";
  return String(inst ?? "");
}

function detect(textJoined) {
  const t = textJoined.toLowerCase();
  let technique = "unknown";
  if (t.includes("shake")) technique = "shaken";
  else if (t.includes("stir")) technique = "stirred";
  else if (t.includes("build")) technique = "built";
  else if (t.includes("blend")) technique = "blended";
  let glass = "unknown";
  if (t.includes("martini") || t.includes("cocktail glass")) glass = "martini";
  else if (t.includes("coupe")) glass = "coupe";
  else if (t.includes("rocks") || t.includes("old fashioned")) glass = "rocks";
  else if (t.includes("highball")) glass = "highball";
  else if (t.includes("collins")) glass = "collins";
  else if (t.includes("flute")) glass = "flute";
  else if (t.includes("hurricane")) glass = "hurricane";
  return { technique, glass };
}

function findRecipe(node) {
  // node may be an object, array, or have @graph
  const candidates = [];
  const visit = (n) => {
    if (!n) return;
    if (Array.isArray(n)) return n.forEach(visit);
    if (typeof n === "object") {
      if (n["@graph"]) visit(n["@graph"]);
      const t = n["@type"];
      const isRecipe = t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"));
      if (isRecipe) candidates.push(n);
    }
  };
  visit(node);
  return candidates[0] || null;
}

function extractRecipe(html, url) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  let recipe = null;
  for (const b of blocks) {
    let data;
    try { data = JSON.parse(b[1].trim()); } catch { continue; }
    recipe = findRecipe(data);
    if (recipe) break;
  }
  if (!recipe) return null;

  const name = (recipe.name || "").trim();
  if (!name) return null;

  const rawIngredients = recipe.recipeIngredient || recipe.ingredients || [];
  const ingredients = rawIngredients.map(parseIngredient).filter((i) => i.name);
  if (!ingredients.length) return null;

  const instrArr = Array.isArray(recipe.recipeInstructions)
    ? recipe.recipeInstructions
    : recipe.recipeInstructions
    ? [recipe.recipeInstructions]
    : [];
  const notesList = instrArr.map(instrText).filter(Boolean);
  const { technique, glass } = detect(notesList.join(" "));

  let rating = recipe.aggregateRating?.ratingValue;
  rating = rating != null ? parseFloat(rating) : null;

  return {
    name,
    source_book: "Difford's Guide",
    source_url: url,
    ingredients,
    technique,
    glass,
    notes: notesList.slice(0, 4).join(" | ") || recipe.description || "",
    rating: Number.isFinite(rating) ? rating : null,
    expert_validated: true,
  };
}

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html" },
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.text();
  } finally {
    clearTimeout(to);
  }
}

async function main() {
  let urls = JSON.parse(readFileSync(URLS_FILE, "utf8"));
  if (LIMIT > 0) urls = urls.slice(0, LIMIT);

  const recipes = existsSync(OUT_FILE) ? JSON.parse(readFileSync(OUT_FILE, "utf8")) : [];
  const ckpt = existsSync(CKPT_FILE)
    ? JSON.parse(readFileSync(CKPT_FILE, "utf8"))
    : { scrapedUrls: [], failedUrls: [] };
  const done = new Set(ckpt.scrapedUrls);
  const seenNames = new Set(recipes.map((r) => r.name.toLowerCase()));

  const todo = urls.filter((u) => !done.has(u));
  log(`Total URLs: ${urls.length} | already done: ${done.size} | to scrape: ${todo.length}`);

  let success = 0, failed = 0;
  const t0 = Date.now();

  const save = () => {
    writeFileSync(OUT_FILE, JSON.stringify(recipes, null, 2));
    writeFileSync(CKPT_FILE, JSON.stringify(ckpt, null, 2));
  };

  for (let i = 0; i < todo.length; i++) {
    const url = todo[i];
    try {
      const html = await fetchHtml(url);
      const recipe = extractRecipe(html, url);
      if (recipe && !seenNames.has(recipe.name.toLowerCase())) {
        recipes.push(recipe);
        seenNames.add(recipe.name.toLowerCase());
        success++;
      } else if (recipe) {
        success++; // duplicate name, counted as success but not re-added
      } else {
        failed++;
        ckpt.failedUrls.push(url);
      }
      done.add(url);
      ckpt.scrapedUrls.push(url);
    } catch (e) {
      failed++;
      ckpt.failedUrls.push(url);
      done.add(url);
      ckpt.scrapedUrls.push(url);
    }

    if ((i + 1) % 10 === 0 || i === 0) {
      const el = (Date.now() - t0) / 1000;
      const rate = (i + 1) / el;
      const eta = (todo.length - i - 1) / rate / 60;
      log(`[${i + 1}/${todo.length}] ok=${success} fail=${failed} | ${rate.toFixed(2)}/s | ETA ${eta.toFixed(1)} min | recipes=${recipes.length}`);
    }
    if ((i + 1) % CHECKPOINT === 0) { save(); log(`[checkpoint] saved ${recipes.length} recipes`); }

    if (i < todo.length - 1) await sleep(DELAY);
  }

  save();
  log(`DONE. success=${success} failed=${failed} | total recipes=${recipes.length} | ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}

main().catch((e) => { log("FATAL " + e.stack); process.exit(1); });

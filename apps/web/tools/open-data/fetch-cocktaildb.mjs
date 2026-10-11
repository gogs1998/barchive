/**
 * Download the full TheCocktailDB catalogue through the licensed V2 API.
 * Uses the Premium key from .env (COCKTAILDB_KEY). Never scrapes the website.
 *
 * Usage:  node fetch-cocktaildb.mjs [--refresh]
 * Output: raw/cocktaildb/letter-<x>.json and raw/cocktaildb/all.json (gitignored)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getJson, sleep } from "./lib/http.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, "raw", "cocktaildb");
const refresh = process.argv.includes("--refresh");

function loadKey() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) throw new Error("Missing .env with COCKTAILDB_KEY");
  const line = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("COCKTAILDB_KEY="));
  const key = line?.slice("COCKTAILDB_KEY=".length).trim();
  if (!key) throw new Error("COCKTAILDB_KEY is empty");
  return key;
}

const key = loadKey();
const base = `https://www.thecocktaildb.com/api/json/v2/${key}`;
fs.mkdirSync(outDir, { recursive: true });

const letters = [..."abcdefghijklmnopqrstuvwxyz0123456789"];
const byId = new Map();

for (const ch of letters) {
  const file = path.join(outDir, `letter-${ch}.json`);
  let data;
  if (!refresh && fs.existsSync(file)) {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } else {
    data = await getJson(`${base}/search.php?f=${ch}`);
    fs.writeFileSync(file, JSON.stringify(data));
    await sleep(400);
  }
  const drinks = data?.drinks || [];
  for (const d of drinks) byId.set(d.idDrink, d);
  console.log(`${ch}: ${drinks.length}`);
}

const all = [...byId.values()].sort((a, b) => a.strDrink.localeCompare(b.strDrink));
fs.writeFileSync(path.join(outDir, "all.json"), JSON.stringify(all, null, 1));
const cc = all.filter((d) => d.strCreativeCommonsConfirmed === "Yes").length;
const alc = {};
for (const d of all) alc[d.strAlcoholic || "?"] = (alc[d.strAlcoholic || "?"] || 0) + 1;
console.log(`\nTotal unique drinks: ${all.length}`);
console.log(`Images marked Creative Commons confirmed: ${cc}`);
console.log("By type:", alc);

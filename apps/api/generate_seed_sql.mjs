#!/usr/bin/env node
/**
 * generate_seed_sql.mjs
 *
 * Parses apps/web/src/lib/cocktails.ts at the text level and emits a
 * D1-compatible SQL seed file.  Run from anywhere:
 *
 *   node apps/api/generate_seed_sql.mjs > apps/api/seed.sql
 *
 * Requires Node ≥ 18 (crypto.randomUUID built-in).
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomUUID } from "crypto";

const __dir = dirname(fileURLToPath(import.meta.url));
const srcPath = process.argv[2] ?? join(__dir, "../web/src/lib/cocktails.ts");
const src = readFileSync(srcPath, "utf8");

// ── helpers ────────────────────────────────────────────────────────────────

function esc(s) {
  return s == null ? "NULL" : `'${String(s).replace(/'/g, "''")}'`;
}

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/, "");
}

function parseAmount(amount) {
  const s = amount.trim().toLowerCase();
  const match = s.match(
    /^(\d+(?:\.\d+)?|\d+\/\d+)\s*(oz|ml|cl|tsp|tbsp|dashes?|dash)$/
  );
  if (!match) return { qty: null, unit: null };
  const [, numStr, rawUnit] = match;
  let qty;
  if (numStr.includes("/")) {
    const [num, den] = numStr.split("/").map(Number);
    qty = num / den;
  } else {
    qty = parseFloat(numStr);
  }
  const unit = rawUnit === "dashes" ? "dash" : rawUnit;
  return { qty, unit };
}

// ── parse C(…) calls from source ──────────────────────────────────────────

/**
 * Very simple brace-aware extractor: find each C("…") call in the
 * COCKTAILS array, collect its text and eval-like-parse the arguments.
 */

// Grab the COCKTAILS array body
const arrStart = src.indexOf("export const COCKTAILS: Cocktail[] = [");
const arrEnd = src.indexOf("];", arrStart);
const arrBody = src.slice(arrStart, arrEnd + 2);

// Extract individual C(…) call strings (brace-depth aware)
function extractCalls(text) {
  const calls = [];
  let i = 0;
  while (i < text.length) {
    const ci = text.indexOf("C(", i);
    if (ci === -1) break;
    // Make sure it is a standalone C( not part of another token
    const before = text[ci - 1] ?? "\n";
    if (/\w/.test(before)) { i = ci + 1; continue; }
    // Collect until matching closing paren
    let depth = 0;
    let start = ci + 1; // position of '('
    let j = ci;
    let inStr = false;
    let strChar = "";
    while (j < text.length) {
      const ch = text[j];
      if (inStr) {
        if (ch === "\\" ) { j += 2; continue; }
        if (ch === strChar) inStr = false;
      } else {
        if (ch === '"' || ch === "'") { inStr = true; strChar = ch; }
        else if (ch === "(") depth++;
        else if (ch === ")") {
          depth--;
          if (depth === 0) {
            calls.push(text.slice(ci, j + 1));
            i = j + 1;
            break;
          }
        }
      }
      j++;
    }
    if (j >= text.length) break;
  }
  return calls;
}

const calls = extractCalls(arrBody);

// Parse each C(…) call into a structured object
// C(id, name, category, glass, imgKey, color, [[name,amount],...], [steps,...], [tags,...], abv, time, dietary?)
function parseCCall(callText) {
  // Remove outer C( and )
  const inner = callText.slice(2, -1);

  // Tokenise at comma boundaries respecting nesting
  function splitArgs(s) {
    const args = [];
    let depth = 0;
    let inStr = false;
    let strChar = "";
    let cur = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (inStr) {
        if (ch === "\\" ) { cur += ch + s[++i]; continue; }
        if (ch === strChar) inStr = false;
        cur += ch;
      } else {
        if (ch === '"' || ch === "'") { inStr = true; strChar = ch; cur += ch; }
        else if (ch === "(" || ch === "[" || ch === "{") { depth++; cur += ch; }
        else if (ch === ")" || ch === "]" || ch === "}") { depth--; cur += ch; }
        else if (ch === "," && depth === 0) {
          args.push(cur.trim());
          cur = "";
        } else {
          cur += ch;
        }
      }
    }
    if (cur.trim()) args.push(cur.trim());
    return args;
  }

  const args = splitArgs(inner);

  function unquote(s) {
    s = s.trim();
    if ((s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
    }
    return s;
  }

  function parseStringArray(s) {
    s = s.trim();
    if (!s.startsWith("[")) return [];
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return splitArgs(inner).map(unquote);
  }

  function parseTupleArray(s) {
    s = s.trim();
    if (!s.startsWith("[")) return [];
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    // each element is ["name","amount"]
    const tuples = [];
    const items = splitArgs(inner);
    for (const item of items) {
      const t = item.trim();
      if (!t.startsWith("[")) continue;
      const parts = splitArgs(t.slice(1, -1));
      if (parts.length >= 2) tuples.push([unquote(parts[0]), unquote(parts[1])]);
    }
    return tuples;
  }

  const id         = unquote(args[0]);
  const name       = unquote(args[1]);
  const category   = unquote(args[2]);
  const glass      = unquote(args[3]);
  // args[4] = imgKey, args[5] = color
  const rawIngredients = parseTupleArray(args[6]);
  const steps      = parseStringArray(args[7]);
  const tags       = args[8] ? parseStringArray(args[8]) : [];
  const abv        = args[9] ? unquote(args[9]) : "20%";
  const time       = args[10] ? unquote(args[10]) : "2 min";

  return { id, name, category, glass, rawIngredients, steps, tags, abv, time,
           slug: slugify(name) };
}

const cocktails = calls.map(parseCCall);
console.error(`Parsed ${cocktails.length} cocktails`);

// ── build SQL ──────────────────────────────────────────────────────────────

const lines = [];
lines.push("-- Auto-generated seed — do not edit manually");
lines.push("-- Generated by apps/api/generate_seed_sql.mjs");
lines.push("-- Run:  node apps/api/generate_seed_sql.mjs > apps/api/seed.sql");
lines.push("");

// Collect all unique ingredients and tags
const ingredientMap = new Map(); // name -> uuid
const tagMap = new Map();        // name -> uuid

for (const c of cocktails) {
  for (const [name] of c.rawIngredients) {
    if (!ingredientMap.has(name)) ingredientMap.set(name, randomUUID());
  }
  for (const tag of c.tags) {
    if (!tagMap.has(tag)) tagMap.set(tag, randomUUID());
  }
}

// Infer ingredient category from name (simple heuristic)
const SPIRITS = /rum|whiskey|whisky|gin|vodka|tequila|mezcal|brandy|cognac|pisco|cachaça|absinthe|chartreuse|fernet|amaro|campari|aperol|cointreau|curaçao|triple sec|maraschino|kahlúa|drambuie|galliano|amaretto|applejack|bourbon|rye/i;
const LIQUEURS = /liqueur|crème|schnapps|prosecco|champagne|lillet|vermouth|sherry/i;
const JUICES = /juice|purée|puree/i;
const SYRUPS = /syrup|grenadine|orgeat/i;
const OTHERS = /bitters|sugar|salt|pepper|cream|egg|mint|lime|lemon|orange|grapefruit|pineapple|coffee|espresso|water|soda|beer/i;

function ingredientCategory(name) {
  if (SPIRITS.test(name)) return "spirit";
  if (LIQUEURS.test(name)) return "liqueur";
  if (JUICES.test(name)) return "juice";
  if (SYRUPS.test(name)) return "syrup";
  if (OTHERS.test(name)) return "other";
  return "other";
}

// ingredients
lines.push("-- ingredients");
for (const [name, id] of ingredientMap) {
  const cat = ingredientCategory(name);
  lines.push(
    `INSERT OR IGNORE INTO ingredients (id, name, category) VALUES (${esc(id)}, ${esc(name)}, ${esc(cat)});`
  );
}
lines.push("");

// tags
lines.push("-- tags");
for (const [name, id] of tagMap) {
  lines.push(
    `INSERT OR IGNORE INTO tags (id, name) VALUES (${esc(id)}, ${esc(name)});`
  );
}
lines.push("");

// cocktails
lines.push("-- cocktails");
for (const c of cocktails) {
  lines.push(
    `INSERT OR IGNORE INTO cocktails (id, name, slug, glassware) VALUES (${esc(c.id)}, ${esc(c.name)}, ${esc(c.slug)}, ${esc(c.glass)});`
  );
}
lines.push("");

// cocktail_ingredients
lines.push("-- cocktail_ingredients");
for (const c of cocktails) {
  for (const [ingName, amount] of c.rawIngredients) {
    const ingId = ingredientMap.get(ingName);
    const { qty, unit } = parseAmount(amount);
    const qtyNum = qty !== null ? qty : null;
    const unitNorm = unit;
    lines.push(
      `INSERT OR IGNORE INTO cocktail_ingredients (cocktail_id, ingredient_id, quantity, unit, quantity_num, unit_norm) VALUES (${esc(c.id)}, ${esc(ingId)}, ${esc(amount)}, ${esc(unit)}, ${qtyNum !== null ? qtyNum : "NULL"}, ${esc(unitNorm)});`
    );
  }
}
lines.push("");

// cocktail_tags
lines.push("-- cocktail_tags");
for (const c of cocktails) {
  for (const tag of c.tags) {
    const tagId = tagMap.get(tag);
    lines.push(
      `INSERT OR IGNORE INTO cocktail_tags (cocktail_id, tag_id) VALUES (${esc(c.id)}, ${esc(tagId)});`
    );
  }
}
lines.push("");

const sql = lines.join("\n");
process.stdout.write(sql);

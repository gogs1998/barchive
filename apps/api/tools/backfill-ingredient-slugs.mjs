#!/usr/bin/env node
/**
 * One-off backfill: set `ingredients.slug` to match the frontend's slugify()
 * EXACTLY (accent-stripping + regex), which SQLite can't reproduce in-migration.
 *
 * Reads/writes the target D1 via `wrangler d1 execute`. It is idempotent —
 * re-running only overwrites slugs that differ — so it may be run after the
 * 0007 migration's approximate SQL backfill to correct it.
 *
 * DO NOT run automatically; deploy is parked. Usage (from apps/api):
 *   node tools/backfill-ingredient-slugs.mjs --env production          # apply
 *   node tools/backfill-ingredient-slugs.mjs --env staging --dry-run   # preview
 *
 * Requires `wrangler` auth and the D1 binding `DB` in wrangler.toml.
 */

import { execFileSync } from "node:child_process";

// Must stay identical to apps/web/src/lib/cocktails.ts `slugify`.
function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseArgs(argv) {
  const args = { env: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--env") args.env = argv[++i];
    else if (argv[i] === "--dry-run") args.dryRun = true;
  }
  return args;
}

function wrangler(sql, env) {
  const cmd = ["d1", "execute", "DB", "--json", "--command", sql];
  if (env) cmd.push("--env", env);
  const out = execFileSync("npx", ["wrangler", ...cmd], { encoding: "utf8" });
  const parsed = JSON.parse(out);
  // wrangler returns an array of result blocks
  return Array.isArray(parsed) ? parsed[0]?.results ?? [] : parsed.results ?? [];
}

function escape(value) {
  return value.replace(/'/g, "''");
}

function main() {
  const { env, dryRun } = parseArgs(process.argv.slice(2));
  const rows = wrangler("SELECT id, name, slug FROM ingredients", env);

  const updates = [];
  for (const row of rows) {
    const desired = slugify(row.name);
    if (row.slug !== desired) updates.push({ id: row.id, name: row.name, desired });
  }

  if (updates.length === 0) {
    console.log("All ingredient slugs already correct — nothing to do.");
    return;
  }

  console.log(`${updates.length} ingredient slug(s) need updating:`);
  for (const u of updates) console.log(`  ${u.name} -> ${u.desired}`);

  if (dryRun) {
    console.log("\n--dry-run: no changes written.");
    return;
  }

  for (const u of updates) {
    wrangler(
      `UPDATE ingredients SET slug = '${escape(u.desired)}' WHERE id = '${escape(u.id)}'`,
      env,
    );
  }
  console.log(`\nUpdated ${updates.length} slug(s).`);
}

main();

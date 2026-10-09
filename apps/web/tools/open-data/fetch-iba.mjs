/**
 * Download every IBA official cocktail page listed in the WordPress sitemap
 * and store parsed facts under raw/iba/. Re-running skips pages already saved
 * unless --refresh is passed.
 *
 * Usage: node fetch-iba.mjs [--refresh]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getText, sleep } from "./lib/http.mjs";
import { parseIbaHtml } from "./lib/parse-iba.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const rawDir = path.join(root, "raw", "iba");
const refresh = process.argv.includes("--refresh");
const SITEMAP = "https://iba-world.com/wp-sitemap-posts-iba-cocktail-1.xml";

async function main() {
  fs.mkdirSync(rawDir, { recursive: true });
  const xml = await getText(SITEMAP);
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (!urls.length) throw new Error("IBA sitemap had no cocktail URLs");
  console.log(`IBA sitemap: ${urls.length} cocktails`);

  const records = [];
  for (const url of urls) {
    const slug = (url.match(/\/iba-cocktail\/([^/]+)\/?$/) || [])[1];
    const out = path.join(rawDir, `${slug}.json`);
    if (!refresh && fs.existsSync(out)) {
      records.push(JSON.parse(fs.readFileSync(out, "utf8")));
      continue;
    }
    await sleep(200);
    const html = await getText(url);
    fs.mkdirSync(path.join(rawDir, "html"), { recursive: true });
    fs.writeFileSync(path.join(rawDir, "html", `${slug}.html`), html);
    const parsed = parseIbaHtml(html, url);
    parsed.fetchedAt = new Date().toISOString();
    fs.writeFileSync(out, JSON.stringify(parsed, null, 2));
    const flag = parsed.ingredientsRaw.length ? "ok" : "NO INGREDIENTS";
    console.log(
      `${flag}\t${parsed.ibaCategory || "?"}\t${parsed.name}\t${parsed.ingredientsRaw.length}`,
    );
    records.push(parsed);
  }

  const bad = records.filter((r) => !r.ingredientsRaw.length || !r.name);
  fs.writeFileSync(
    path.join(rawDir, "_index.json"),
    JSON.stringify(
      records.map((r) => ({
        slug: r.slug,
        name: r.name,
        url: r.url,
        ibaCategory: r.ibaCategory,
        ingredientCount: r.ingredientsRaw.length,
      })),
      null,
      2,
    ),
  );
  console.log(`saved ${records.length}, unparsed ${bad.length}`);
  if (bad.length) {
    for (const r of bad) console.log(`  missing: ${r.url}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
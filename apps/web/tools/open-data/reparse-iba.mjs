import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseIbaHtml } from "./lib/parse-iba.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const htmlDir = path.join(root, "raw", "iba", "html");
const outDir = path.join(root, "raw", "iba");
const files = fs.readdirSync(htmlDir).filter((f) => f.endsWith(".html"));
const ings = new Map();
const names = [];
let empty = 0;
for (const f of files) {
  const html = fs.readFileSync(path.join(htmlDir, f), "utf8");
  const slug = f.replace(/\.html$/, "");
  const url = `https://iba-world.com/iba-cocktail/${slug}/`;
  const parsed = parseIbaHtml(html, url);
  const prevPath = path.join(outDir, `${slug}.json`);
  const prev = JSON.parse(fs.readFileSync(prevPath, "utf8"));
  parsed.fetchedAt = prev.fetchedAt;
  fs.writeFileSync(prevPath, JSON.stringify(parsed, null, 2));
  if (!parsed.ingredientsRaw.length) empty++;
  names.push(
    `${parsed.ibaCategory}\t${parsed.name}\t${parsed.garnishRaw.replace(/\s+/g, " ").slice(0, 90)}`,
  );
  for (const line of parsed.ingredientsRaw) ings.set(line, (ings.get(line) || 0) + 1);
}
console.log("COUNT", files.length, "EMPTY", empty);
console.log("--- NAMES ---");
console.log(names.sort().join("\n"));
console.log("--- INGREDIENTS ---");
console.log(
  [...ings.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([n, c]) => `${c}\t${n}`)
    .join("\n"),
);
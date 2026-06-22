// Backfill real Difford's images: re-fetch each recipe page and extract the
// JSON-LD Recipe image URL (cdn.diffordsguide.com/.../512x512.webp).
// The first scrape captured recipes but dropped the image field; CDN ids are
// opaque so a re-fetch is required. Resumable, checkpoints every 50.
//
// Output: raw/images.json  ({ [source_url]: imageUrl })

import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const URLS_FILE = join(ROOT, "difford_all_urls.json");
const OUT_FILE = join(ROOT, "raw", "images.json");
const CKPT_FILE = join(ROOT, "raw", "images_checkpoint.json");
const LOG_FILE = join(ROOT, "raw", "images_log.txt");
const DELAY = 2000;
const CHECKPOINT = 50;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const log = (m) => {
  const l = `[${new Date().toISOString()}] ${m}`;
  console.log(l);
  try { appendFileSync(LOG_FILE, l + "\n"); } catch {}
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findImage(node) {
  let img = null;
  const visit = (n) => {
    if (!n || img) return;
    if (Array.isArray(n)) return n.forEach(visit);
    if (typeof n === "object") {
      if (n["@graph"]) visit(n["@graph"]);
      const t = n["@type"];
      const isRecipe = t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"));
      if (isRecipe && n.image) {
        const im = n.image;
        if (typeof im === "string") img = im;
        else if (Array.isArray(im)) img = (typeof im[0] === "string" ? im[0] : im[0]?.url) || null;
        else if (typeof im === "object") img = im.url || null;
      }
    }
  };
  visit(node);
  return img;
}

function extractImage(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    let data;
    try { data = JSON.parse(b[1].trim()); } catch { continue; }
    const img = findImage(data);
    if (img) return img;
  }
  return null;
}

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": UA, Accept: "text/html" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.text();
  } finally { clearTimeout(to); }
}

async function main() {
  const urls = JSON.parse(readFileSync(URLS_FILE, "utf8"));
  const images = existsSync(OUT_FILE) ? JSON.parse(readFileSync(OUT_FILE, "utf8")) : {};
  const ckpt = existsSync(CKPT_FILE) ? JSON.parse(readFileSync(CKPT_FILE, "utf8")) : { done: [] };
  const done = new Set(ckpt.done);
  const todo = urls.filter((u) => !done.has(u));
  log(`Total: ${urls.length} | done: ${done.size} | todo: ${todo.length}`);

  let ok = 0, miss = 0;
  const t0 = Date.now();
  const save = () => { writeFileSync(OUT_FILE, JSON.stringify(images)); writeFileSync(CKPT_FILE, JSON.stringify({ done: [...done] })); };

  for (let i = 0; i < todo.length; i++) {
    const url = todo[i];
    try {
      const html = await fetchHtml(url);
      const img = extractImage(html);
      if (img) { images[url] = img; ok++; } else miss++;
    } catch { miss++; }
    done.add(url);

    if ((i + 1) % 10 === 0 || i === 0) {
      const el = (Date.now() - t0) / 1000, rate = (i + 1) / el;
      log(`[${i + 1}/${todo.length}] img=${ok} miss=${miss} | ${rate.toFixed(2)}/s | ETA ${((todo.length - i - 1) / rate / 60).toFixed(1)} min`);
    }
    if ((i + 1) % CHECKPOINT === 0) { save(); }
    if (i < todo.length - 1) await sleep(DELAY);
  }
  save();
  log(`DONE. images=${ok} miss=${miss} | total mapped=${Object.keys(images).length} | ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}

main().catch((e) => { log("FATAL " + e.stack); process.exit(1); });

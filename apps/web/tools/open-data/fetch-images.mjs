/**
 * Find a Wikimedia Commons photo for each open cocktail and save a webp.
 *
 * Only CC0, public domain, CC BY and CC BY-SA. NC, ND, GFDL-only and unknown
 * licences are skipped. Nothing is hotlinked.
 *
 *   node fetch-images.mjs
 *   node fetch-images.mjs --only negroni,mai-tai
 *   node fetch-images.mjs --refresh
 */

import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { getJson, getBuffer, sleep } from "./lib/http.mjs";
import { slugify, tidyName } from "./lib/slug.mjs";

const exec = promisify(execFile);
const root = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(root, "../..");
const outDir = path.join(webRoot, "public", "img", "cocktails");
const manifestPath = path.join(root, "raw", "images", "manifest.json");
const tmpDir = path.join(root, "raw", "images", "tmp");
const refresh = process.argv.includes("--refresh");
const onlyArg = process.argv.find((a) => a.startsWith("--only"));
const only = new Set((onlyArg ? onlyArg.slice("--only=".length).split(",") : []).filter(Boolean));

const DISPLAY = {
  "pina-colada": "Pina Colada",
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

const STOP = new Set(["with", "from", "cocktail", "drink", "special", "the", "and", "old"]);

function plain(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensOf(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => (t.length >= 3 || /^\d+$/.test(t)) && !STOP.has(t));
}

function matchesName(text, name) {
  const hay = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const need = tokensOf(name);
  if (!need.length) {
    const compact = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return compact.length >= 4 && hay.replace(/[^a-z0-9]/g, "").includes(compact);
  }
  const hit = need.filter((t) => hay.includes(t));
  if (need.length === 1) return hit.length === 1;
  return hit.length >= Math.min(2, need.length);
}

function pageScore(title, name) {
  const a = title.toLowerCase();
  const b = name.toLowerCase();
  let score = 0;
  if (a === b || a.startsWith(b + " ") || a.startsWith(b + "(")) score += 3;
  else if (a.includes(b)) score += 1;
  if (/\bcocktail\b/.test(a)) score += 1;
  return score;
}

function licenceOf(ext) {
  const short = plain(ext?.LicenseShortName?.value || "");
  const usage = plain(ext?.UsageTerms?.value || "");
  const blob = `${short} ${usage}`.toLowerCase();
  if (!blob.trim()) return null;
  if (/non-?commercial|\bnc\b|no.?deriv|\bnd\b/.test(blob)) return null;
  if (/all rights reserved|copyrighted|fair use/.test(blob)) return null;
  if (/public domain|\bcc0\b|cc zero|cc-zero/.test(blob)) return short || "Public domain";
  if (/cc by-sa|cc-by-sa|attribution-share ?alike/.test(blob)) return short || "CC BY-SA";
  if (/\bcc by\b|\bcc-by\b|attribution\b/.test(blob)) return short || "CC BY";
  return null;
}

function authorOf(ext) {
  const artist = plain(ext?.Artist?.value || "");
  if (artist && !/^unknown$/i.test(artist)) return artist.slice(0, 180);
  const credit = plain(ext?.Credit?.value || "");
  if (credit) return credit.slice(0, 180);
  return "Unknown";
}

function badFile(title, ext) {
  const blob = `${title} ${plain(ext?.ImageDescription?.value || "")} ${plain(ext?.ObjectName?.value || "")}`;
  return /\blogo\b|wordmark|coat of arms|flag of|locator map|icon\b|svg\b|banner\b|advertisement|ritratto|portrait of|painting by|statue of|basilica|cathedral|piazza |blossom|botanical|\bresort\b|\bingredients\b/i.test(blob);
}

async function wiki(params) {
  const url = "https://en.wikipedia.org/w/api.php?" + new URLSearchParams({ ...params, format: "json" });
  await sleep(700);
  return getJson(url);
}

async function commons(params) {
  const url = "https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({ ...params, format: "json" });
  await sleep(700);
  return getJson(url);
}

async function fileInfo(fileTitle) {
  const title = fileTitle.startsWith("File:") ? fileTitle : `File:${fileTitle}`;
  const json = await commons({
    action: "query",
    titles: title,
    prop: "imageinfo",
    iiprop: "url|extmetadata|mime|size",
    iiurlwidth: "800",
  });
  const page = Object.values(json.query?.pages || {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  return { title: page.title, info };
}

async function consider(fileTitle, drinkName) {
  const got = await fileInfo(fileTitle);
  if (!got) return null;
  const { title, info } = got;
  if (!/^image\/(jpeg|png|webp)$/.test(info.mime || "")) return null;
  if ((info.size || 0) < 4000 && !info.thumburl) return null;
  const ext = info.extmetadata || {};
  if (badFile(title, ext)) return null;
  const blob = `${title} ${plain(ext.ImageDescription?.value || "")} ${plain(ext.ObjectName?.value || "")}`;
  if (!matchesName(blob, drinkName)) return null;
  if (tokensOf(drinkName).length === 1 && !/cocktail/i.test(title)) return null;
  const licence = licenceOf(ext);
  if (!licence) return null;
  return {
    title,
    licence,
    author: authorOf(ext),
    sourceUrl: info.descriptionurl,
    downloadUrl: info.thumburl || info.url,
  };
}

async function fromWikipedia(name) {
  const json = await wiki({
    action: "query",
    generator: "search",
    gsrsearch: `${name} cocktail`,
    gsrlimit: "4",
    gsrnamespace: "0",
    prop: "pageimages",
    piprop: "name|thumbnail",
    pithumbsize: "800",
  });
  const pages = Object.values(json.query?.pages || {});
  pages.sort((a, b) => pageScore(b.title, name) - pageScore(a.title, name) || (a.index || 0) - (b.index || 0));
  for (const page of pages) {
    if (pageScore(page.title, name) < 3) continue;
    if (!page.pageimage) continue;
    const hit = await consider(page.pageimage, name);
    if (hit) return hit;
  }
  return null;
}

async function fromCommonsSearch(name) {
  const json = await commons({
    action: "query",
    list: "search",
    srsearch: `${name} cocktail`,
    srnamespace: "6",
    srlimit: "8",
  });
  for (const row of json.query?.search || []) {
    const hit = await consider(row.title, name);
    if (hit) return hit;
  }
  return null;
}

async function toWebp(downloadUrl, dest) {
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmp = path.join(tmpDir, `dl-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const buf = await getBuffer(downloadUrl);
  if (buf.length < 4000) throw new Error("image too small");
  fs.writeFileSync(tmp, buf);
  try {
    await exec("magick", [tmp, "-auto-orient", "-resize", "800x800>", "-strip", "-quality", "75", dest]);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function loadRecords() {
  const dir = path.join(root, "raw", "iba");
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
}

function outputSlug(rec) {
  return slugify(tidyName(DISPLAY[rec.slug] || rec.name));
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
  const records = loadRecords().filter((rec) => {
    if (!only.size) return true;
    const slug = outputSlug(rec);
    return only.has(rec.slug) || only.has(slug);
  });
  let saved = 0;
  let missed = 0;
  for (const rec of records) {
    const slug = outputSlug(rec);
    const name = tidyName(DISPLAY[rec.slug] || rec.name);
    const dest = path.join(outDir, `${slug}.webp`);
    if (!refresh && manifest[slug] && fs.existsSync(dest)) {
      console.log(`keep ${slug}`);
      saved++;
      continue;
    }
    try {
      const hit = (await fromWikipedia(name)) || (await fromCommonsSearch(name));
      if (!hit) {
        console.log(`miss ${slug}`);
        missed++;
        continue;
      }
      await toWebp(hit.downloadUrl, dest);
      manifest[slug] = {
        file: `/img/cocktails/${slug}.webp`,
        sourceUrl: hit.sourceUrl,
        author: hit.author,
        licence: hit.licence,
      };
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
      console.log(`save ${slug} ${hit.licence} ${hit.title}`);
      saved++;
    } catch (err) {
      if (/429/.test(String(err.message))) {
        console.log(`wait ${slug}`);
        await sleep(15000);
        try {
          const hit = (await fromWikipedia(name)) || (await fromCommonsSearch(name));
          if (!hit) {
            console.log(`miss ${slug}`);
            missed++;
            continue;
          }
          await toWebp(hit.downloadUrl, dest);
          manifest[slug] = {
            file: `/img/cocktails/${slug}.webp`,
            sourceUrl: hit.sourceUrl,
            author: hit.author,
            licence: hit.licence,
          };
          fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
          console.log(`save ${slug} ${hit.licence} ${hit.title}`);
          saved++;
          continue;
        } catch (err2) {
          console.log(`fail ${slug} ${err2.message}`);
          missed++;
          continue;
        }
      }
      console.log(`fail ${slug} ${err.message}`);
      missed++;
    }
  }
  console.log(`images saved ${saved} missed ${missed} of ${records.length}`);
}

main();
/**
 * Pull facts off an IBA cocktail page: name, ingredient lines, and garnish.
 * Method prose is stored only under raw/ so the builder can classify the
 * technique (stir, shake, build). It is never copied into the dataset.
 */

import { collapse, sectionAfter } from "./html.mjs";

const CATEGORY_RE =
  /iba-cocktail-(the-unforgettables|contemporary-classics|new-era|the-contemporary|the-new-era)/i;

const CATEGORY_LABEL = {
  "the-unforgettables": "unforgettables",
  "contemporary-classics": "contemporary-classics",
  "the-contemporary": "contemporary-classics",
  "new-era": "new-era",
  "the-new-era": "new-era",
};

/** The recipe widget is the first shortcode after the heading. Later markup is chrome. */
function firstShortcode(sectionHtml) {
  const m = sectionHtml.match(/elementor-shortcode">([\s\S]*?)<\/div>/i);
  return m ? m[1] : sectionHtml.slice(0, 2000);
}

function listItems(sectionHtml) {
  const items = [];
  const re = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const scope = firstShortcode(sectionHtml);
  let m;
  while ((m = re.exec(scope))) {
    const text = collapse(m[1]).replace(/\s*\n\s*/g, " ").trim();
    if (text) items.push(text);
  }
  return items;
}

function paragraphs(sectionHtml) {
  const scope = firstShortcode(sectionHtml);
  const parts = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(scope))) {
    const text = collapse(m[1]).replace(/\s*\n\s*/g, " ").trim();
    if (text) parts.push(text);
  }
  if (parts.length) return parts.join("\n");
  return collapse(scope).replace(/\s*\n\s*/g, " ").trim();
}

export function parseIbaHtml(html, url) {
  const slug = (url.match(/\/iba-cocktail\/([^/]+)\/?$/) || [])[1] || "";
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1\s*>/i);
  const title = html.match(/<title>([\s\S]*?)<\/title>/i);
  let name = h1 ? collapse(h1[1]).replace(/\s+/g, " ").trim() : "";
  if (!name && title) {
    name = collapse(title[1]).replace(/\s+[–—-]\s+IBA\s*$/i, "").trim();
  }
  if (!name) name = slug;
  const ingredientSection = sectionAfter(html, "Ingredients");
  const methodSection = sectionAfter(html, "Method");
  const garnishSection = sectionAfter(html, "Garnish");
  const cat = html.match(CATEGORY_RE);
  return {
    slug,
    url,
    name,
    ibaCategory: cat ? CATEGORY_LABEL[cat[1].toLowerCase()] || cat[1].toLowerCase() : "",
    ingredientsRaw: listItems(ingredientSection),
    methodRaw: paragraphs(methodSection),
    garnishRaw: paragraphs(garnishSection),
  };
}
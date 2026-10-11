/**
 * SEO helpers: canonical URLs, indexing policy and schema.org JSON-LD.
 *
 * Indexing policy: recipes scraped from Difford's Guide (ids "diffords-*")
 * stay browsable but are `noindex, follow`, and are left out of the sitemap.
 * Everything else (curated + TheCocktailDB, licensed) is indexable.
 */

import { COCKTAILS, slugify, type Cocktail } from "./cocktails";
import { IMPORTED_COCKTAILS } from "./cocktails.imported";

export const SITE_URL = "https://bariq.co.uk";
export const SITE_NAME = "BarIQ";

/** Last time the recipe data changed. Bump when the cocktail data is regenerated. */
export const CONTENT_UPDATED = "2026-10-11";

/** Ingredient pages need this many indexable cocktails to be indexed. */
export const INGREDIENT_INDEX_MIN = 3;

export const COCKTAILDB_CREDIT_TEXT = "Recipe data and imagery: TheCocktailDB";
export const COCKTAILDB_URL = "https://www.thecocktaildb.com/";

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Difford's-sourced recipes are not indexed. */
export function isIndexable(c: Pick<Cocktail, "id">): boolean {
  return !c.id.startsWith("diffords-");
}

const IMPORTED_IDS = new Set(IMPORTED_COCKTAILS.map((c) => c.id));

/** TheCocktailDB's licence requires a credit wherever its data or images appear. */
export function needsCocktailDbCredit(c: Pick<Cocktail, "id" | "img">): boolean {
  return IMPORTED_IDS.has(c.id) || /thecocktaildb\.com/i.test(c.img);
}

// ─── Spirit hubs ─────────────────────────────────────────────────────────────

export function spiritSlug(category: string): string {
  return slugify(category);
}

export function spiritPath(category: string): string {
  return `/cocktails/spirit/${spiritSlug(category)}`;
}

/** Hub heading, e.g. "Tequila Cocktails", "Mocktails". */
export function spiritTitle(category: string): string {
  if (category === "Mocktail") return "Mocktails";
  if (category === "Other") return "Other Cocktails";
  return `${category} Cocktails`;
}

export interface SpiritHub {
  category: string;
  slug: string;
  title: string;
  cocktails: Cocktail[];
}

let hubCache: SpiritHub[] | null = null;

/** One hub per category, cocktails sorted by name. */
export function getSpiritHubs(): SpiritHub[] {
  if (hubCache) return hubCache;
  const byCat = new Map<string, Cocktail[]>();
  for (const c of COCKTAILS) {
    const list = byCat.get(c.category) ?? [];
    list.push(c);
    byCat.set(c.category, list);
  }
  hubCache = [...byCat.entries()]
    .map(([category, cocktails]) => ({
      category,
      slug: spiritSlug(category),
      title: spiritTitle(category),
      cocktails: [...cocktails].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => b.cocktails.length - a.cocktails.length);
  return hubCache;
}

export function getSpiritHub(slug: string): SpiritHub | null {
  return getSpiritHubs().find((h) => h.slug === slug) ?? null;
}

// ─── JSON-LD ─────────────────────────────────────────────────────────────────

/** "2 min" → "PT2M"; anything unparseable → undefined. */
export function toIsoDuration(time: string): string | undefined {
  const m = time.match(/(\d+)\s*(?:min|minute)/i);
  return m ? `PT${parseInt(m[1], 10)}M` : undefined;
}

export function recipeDescription(c: Cocktail): string {
  const details = [`${c.ingredients.length} ingredients`];
  if (c.glass) details.push(`served in a ${c.glass.toLowerCase()} glass`);
  if (c.abv) details.push(`about ${c.abv} ABV`);
  if (c.time) details.push(`ready in ${c.time}`);
  return `How to make a ${c.name}: ${details.join(", ")}.`;
}

export function recipeJsonLd(c: Cocktail) {
  const duration = toIsoDuration(c.time);
  const diets: string[] = [];
  if (c.vegan) diets.push("https://schema.org/VeganDiet");
  if (c.glutenFree) diets.push("https://schema.org/GlutenFreeDiet");

  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: c.name,
    url: absoluteUrl(`/cocktails/${c.slug}`),
    description: recipeDescription(c),
    ...(c.img ? { image: [absoluteUrl(c.img)] } : {}),
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    recipeCategory: "Cocktail",
    recipeCuisine: c.category,
    keywords: [c.category, c.glass, ...c.tags].filter(Boolean).join(", "),
    recipeYield: "1 drink",
    ...(duration ? { prepTime: duration, totalTime: duration } : {}),
    ...(diets.length ? { suitableForDiet: diets.length === 1 ? diets[0] : diets } : {}),
    recipeIngredient: c.ingredients.map((i) =>
      i.amount ? `${i.amount} ${i.name}` : i.name
    ),
    recipeInstructions: c.steps.map((text, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      text,
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Serialise for a <script type="application/ld+json"> without breaking out of the tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

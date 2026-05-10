/**
 * API client — typed fetch functions for the BarIQ backend.
 *
 * Currently backed by static in-memory data; swap BASE_URL
 * when the BackendEngineer ships the REST API.
 */

import {
  COCKTAILS,
  CATEGORIES,
  GLASSES,
  ALL_INGREDIENTS,
  searchCocktails,
  getCocktailBySlug,
  getCocktailById,
  type Cocktail,
} from "./cocktails";

// Re-export types so consumers only import from api.ts
export type { Cocktail };

const STUB_DELAY = 0; // Set > 0 to simulate network latency in development

function delay(ms: number) {
  return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
}

/** Fetch params for cocktail list queries */
export interface GetCocktailsParams {
  query?: string;
  category?: string;
  glass?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedCocktails {
  cocktails: Cocktail[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Fetch a paginated, filterable list of cocktails.
 * When a real API is available, replace stub with:
 *   const res = await fetch(`${BASE_URL}/cocktails?${params}`);
 */
export async function getCocktails(
  params: GetCocktailsParams = {}
): Promise<PaginatedCocktails> {
  await delay(STUB_DELAY);

  let results = params.query ? searchCocktails(params.query) : [...COCKTAILS];

  if (params.category) {
    results = results.filter((c) => c.category === params.category);
  }
  if (params.glass) {
    results = results.filter((c) => c.glass === params.glass);
  }

  const pageSize = params.pageSize ?? 24;
  const page = params.page ?? 1;
  const start = (page - 1) * pageSize;
  const cocktails = results.slice(start, start + pageSize);

  return { cocktails, total: results.length, page, pageSize };
}

/**
 * Fetch a single cocktail by URL slug.
 * Returns null if not found.
 */
export async function getCocktail(slug: string): Promise<Cocktail | null> {
  await delay(STUB_DELAY);
  return getCocktailBySlug(slug) ?? null;
}

/**
 * Fetch a single cocktail by its numeric id.
 */
export async function getCocktailById_api(id: string): Promise<Cocktail | null> {
  await delay(STUB_DELAY);
  return getCocktailById(id) ?? null;
}

export interface IngredientSummary {
  name: string;
  /** Number of cocktails that use this ingredient */
  cocktailCount: number;
  /** Cocktail slugs that use this ingredient */
  cocktails: { name: string; slug: string }[];
}

/**
 * Fetch the full ingredient index.
 */
export async function getIngredients(): Promise<IngredientSummary[]> {
  await delay(STUB_DELAY);

  return ALL_INGREDIENTS.map((name) => {
    const cocktails = COCKTAILS.filter((c) =>
      c.ingredients.some((i) => i.name === name)
    ).map((c) => ({ name: c.name, slug: c.slug }));
    return { name, cocktailCount: cocktails.length, cocktails };
  });
}

/** Fetch all unique categories */
export async function getCategories(): Promise<string[]> {
  await delay(STUB_DELAY);
  return CATEGORIES;
}

/** Fetch all unique glass types */
export async function getGlasses(): Promise<string[]> {
  await delay(STUB_DELAY);
  return GLASSES;
}

/**
 * API client — typed fetch functions for the BarIQ backend.
 *
 * Cocktail and ingredient data comes from the Cloudflare Worker at
 * NEXT_PUBLIC_API_URL (https://bariq.co.uk in production).
 *
 * Auth + user-data endpoints also live on the same origin.
 */

// Re-export types so consumers only import from api.ts
export type { Cocktail } from "./cocktails";

// The Worker API base URL.  Defaults to localhost:8787 (wrangler dev) for
// local development. Set NEXT_PUBLIC_API_URL=https://bariq.co.uk in CI.
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

// ─── Types ────────────────────────────────────────────────────────────────

import type { Cocktail } from "./cocktails";

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

export interface IngredientSummary {
  name: string;
  slug: string;
  /** Number of cocktails that use this ingredient */
  cocktailCount: number;
  /** Cocktail slugs that use this ingredient */
  cocktails: { name: string; slug: string }[];
}

// ─── Worker API response shapes ───────────────────────────────────────────

interface ApiCocktailListResponse {
  total: number;
  page: number;
  per_page: number;
  items: Cocktail[];
}

interface ApiIngredientItem {
  id: string;
  name: string;
  category: string;
  description?: string;
}

interface ApiIngredientListResponse {
  total: number;
  page: number;
  per_page: number;
  items: ApiIngredientItem[];
}

// ─── Cocktail endpoints ───────────────────────────────────────────────────

/**
 * Fetch a paginated, filterable list of cocktails from the Worker API.
 */
export async function getCocktails(
  params: GetCocktailsParams = {}
): Promise<PaginatedCocktails> {
  const qs = new URLSearchParams();
  if (params.query)    qs.set("q",        params.query);
  if (params.category) qs.set("category", params.category);
  if (params.glass)    qs.set("glass",    params.glass);
  if (params.page)     qs.set("page",     String(params.page));
  const perPage = params.pageSize ?? 500;        // fetch all for client-side filter
  qs.set("per_page", String(perPage));

  const url = `${API_BASE}/api/v1/cocktails?${qs.toString()}`;
  const res = await fetch(url, { next: { revalidate: 3600 } } as RequestInit);
  if (!res.ok) throw new Error(`getCocktails failed: ${res.status}`);

  const data: ApiCocktailListResponse = await res.json();
  return {
    cocktails: data.items,
    total:     data.total,
    page:      data.page,
    pageSize:  data.per_page,
  };
}

/**
 * Fetch a single cocktail by URL slug.
 * Returns null if not found.
 */
export async function getCocktail(slug: string): Promise<Cocktail | null> {
  const res = await fetch(`${API_BASE}/api/v1/cocktails/${encodeURIComponent(slug)}`, {
    next: { revalidate: 3600 },
  } as RequestInit);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getCocktail failed: ${res.status}`);
  return res.json();
}

/**
 * Fetch a single cocktail by its numeric/string id.
 * The Worker doesn't have a by-id route; fall back to a filtered list.
 */
export async function getCocktailById_api(id: string): Promise<Cocktail | null> {
  // Slug lookup: id is typically the same as the cocktail id stored in DB.
  // We must scan the full list since the Worker only exposes slug-based detail.
  const { cocktails } = await getCocktails({ pageSize: 500 });
  return cocktails.find((c) => c.id === id) ?? null;
}

// ─── Ingredient endpoints ─────────────────────────────────────────────────

/**
 * Fetch the full ingredient index from the Worker.
 * The Worker returns a flat list; we augment with cocktail back-references
 * by fetching all cocktails and cross-referencing.
 */
export async function getIngredients(): Promise<IngredientSummary[]> {
  // Fetch ingredients and cocktails in parallel
  const [ingRes, { cocktails }] = await Promise.all([
    fetch(`${API_BASE}/api/v1/ingredients?per_page=200`, {
      next: { revalidate: 3600 },
    } as RequestInit).then((r) => {
      if (!r.ok) throw new Error(`getIngredients failed: ${r.status}`);
      return r.json() as Promise<ApiIngredientListResponse>;
    }),
    getCocktails({ pageSize: 500 }),
  ]);

  const { slugify } = await import("./cocktails");

  return ingRes.items.map((ing) => {
    const related = cocktails.filter((c) =>
      c.ingredients.some((i) => i.name === ing.name)
    );
    return {
      name:         ing.name,
      slug:         slugify(ing.name),
      cocktailCount: related.length,
      cocktails:    related.map((c) => ({ name: c.name, slug: c.slug })),
    };
  });
}

/**
 * Fetch a single ingredient by its URL slug.
 * Returns null if not found.
 */
export async function getIngredient(slug: string): Promise<IngredientSummary | null> {
  const all = await getIngredients();
  return all.find((i) => i.slug === slug) ?? null;
}

/** Fetch all unique categories */
export async function getCategories(): Promise<string[]> {
  const { cocktails } = await getCocktails({ pageSize: 500 });
  return [...new Set(cocktails.map((c) => c.category))].sort();
}

/** Fetch all unique glass types */
export async function getGlasses(): Promise<string[]> {
  const { cocktails } = await getCocktails({ pageSize: 500 });
  return [...new Set(cocktails.map((c) => c.glass))].sort();
}

// ─── Auth API ────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  email_verified: boolean;
  display_name?: string;
}

export interface AuthError {
  error: string;
}

/**
 * GET /api/user/me — returns the current session user or throws 401.
 * Uses httpOnly auth cookie; no token needed in headers.
 */
export async function getMe(): Promise<AuthUser | null> {
  const res = await fetch(`${API_BASE}/api/user/me`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`getMe failed: ${res.status}`);
  return res.json();
}

/**
 * POST /api/v1/auth/login — sets access_token + refresh_token cookies.
 */
export async function loginApi(
  email: string,
  password: string
): Promise<{ user?: AuthUser; error?: string }> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (res.ok) {
    const user: AuthUser = await res.json();
    return { user };
  }
  const data = await res.json().catch(() => ({}));
  return { error: (data as AuthError).error ?? "Login failed" };
}

/**
 * POST /api/v1/auth/register — creates account, sends verification email.
 */
export async function registerApi(
  email: string,
  password: string
): Promise<{ error?: string }> {
  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (res.status === 201 || res.ok) return {};
  const data = await res.json().catch(() => ({}));
  return { error: (data as AuthError).error ?? "Registration failed" };
}

/**
 * POST /api/v1/auth/logout — clears cookies and revokes refresh token.
 */
export async function logoutApi(): Promise<void> {
  await fetch(`${API_BASE}/api/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

/**
 * POST /api/v1/auth/password-reset/request — sends reset email.
 * Always returns 200 (anti-enumeration).
 */
export async function requestPasswordResetApi(email: string): Promise<void> {
  await fetch(`${API_BASE}/api/v1/auth/password-reset/request`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

/**
 * POST /api/v1/auth/password-reset/confirm — sets new password with token.
 */
export async function confirmPasswordResetApi(
  token: string,
  newPassword: string
): Promise<{ error?: string }> {
  const res = await fetch(`${API_BASE}/api/v1/auth/password-reset/confirm`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (res.ok) return {};
  const data = await res.json().catch(() => ({}));
  return { error: (data as AuthError).error ?? "Reset failed" };
}

/**
 * GET /api/v1/auth/google — returns the Google OAuth authorization URL.
 * Redirect the user to that URL to start the flow.
 */
export async function getGoogleOAuthUrl(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/v1/auth/google`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to get Google OAuth URL");
  const data: { authorization_url: string } = await res.json();
  return data.authorization_url;
}

// ─── My Bar API ──────────────────────────────────────────────────────────────

export interface BarIngredientAPI {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface GetBarResponse {
  items: BarIngredientAPI[];
  total: number;
}

/**
 * Fetch the current user's bar ingredient inventory.
 * Requires auth cookie (httpOnly, set by the backend).
 */
export async function getUserBar(): Promise<GetBarResponse> {
  const res = await fetch(`${API_BASE}/api/user/bar`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch bar: ${res.status}`);
  }
  return res.json();
}

/**
 * Add an ingredient to the current user's bar (idempotent).
 * Returns 204 on success.
 */
export async function addUserBarIngredient(ingredientId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/user/bar/${encodeURIComponent(ingredientId)}`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to add ingredient: ${res.status}`);
  }
}

/**
 * Remove an ingredient from the current user's bar.
 * Returns 204 on success, 404 if not in bar.
 */
export async function removeUserBarIngredient(ingredientId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/user/bar/${encodeURIComponent(ingredientId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to remove ingredient: ${res.status}`);
  }
}

// ─── Favourites API ──────────────────────────────────────────────────────────

/**
 * Fetch the current user's saved favourite recipes.
 * Requires auth cookie. Returns full Cocktail objects.
 */
export async function getUserFavourites(): Promise<Cocktail[]> {
  const res = await fetch(`${API_BASE}/api/user/favourites`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch favourites: ${res.status}`);
  }
  return res.json();
}

/**
 * Save a recipe to the current user's favourites (idempotent).
 */
export async function addUserFavourite(recipeSlug: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/user/favourites/${encodeURIComponent(recipeSlug)}`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to save favourite: ${res.status}`);
  }
}

/**
 * Remove a recipe from the current user's favourites.
 */
export async function removeUserFavourite(recipeSlug: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/user/favourites/${encodeURIComponent(recipeSlug)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to remove favourite: ${res.status}`);
  }
}

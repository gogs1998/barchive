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
  slugify,
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
  slug: string;
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
    return { name, slug: slugify(name), cocktailCount: cocktails.length, cocktails };
  });
}

/**
 * Fetch a single ingredient by its URL slug.
 * Returns null if not found.
 */
export async function getIngredient(slug: string): Promise<IngredientSummary | null> {
  await delay(STUB_DELAY);
  const all = await getIngredients();
  return all.find((i) => i.slug === slug) ?? null;
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

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

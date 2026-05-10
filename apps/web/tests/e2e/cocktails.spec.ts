/**
 * E2E: Cocktails — browse, search, and recipe detail flows.
 *
 * All API calls are intercepted with page.route() so tests run without a live
 * backend. Adjust mock payloads here when the API schema changes.
 */

import { test, expect } from "@playwright/test";
import { checkA11y, injectAxe } from "axe-playwright";

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const MOCK_COCKTAILS = [
  {
    id: "11111111-0000-0000-0000-000000000001",
    name: "Negroni",
    slug: "negroni",
    description: "A classic Italian aperitivo.",
    method: "Stir",
    garnish: "Orange peel",
    glassware: "Rocks",
  },
  {
    id: "11111111-0000-0000-0000-000000000002",
    name: "Margarita",
    slug: "margarita",
    description: "Tequila, lime, triple sec.",
    method: "Shake",
    garnish: "Lime wheel",
    glassware: "Coupe",
  },
];

const MOCK_NEGRONI = MOCK_COCKTAILS[0];

/**
 * Register route mocks common to cocktail list tests.
 */
async function mockCocktailRoutes(page: import("@playwright/test").Page) {
  await page.route("**/api/v1/cocktails", (route) => {
    route.fulfill({ json: MOCK_COCKTAILS });
  });
  await page.route("**/api/v1/cocktails?**", (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get("q") ?? "";
    const filtered = q
      ? MOCK_COCKTAILS.filter((c) =>
          c.name.toLowerCase().includes(q.toLowerCase())
        )
      : MOCK_COCKTAILS;
    route.fulfill({ json: filtered });
  });
}

// ---------------------------------------------------------------------------
// Browse cocktails list
// ---------------------------------------------------------------------------

test.describe("Browse cocktails", () => {
  test("shows list of cocktails at /cocktails", async ({ page }) => {
    await mockCocktailRoutes(page);
    await page.goto("/cocktails");

    // Each cocktail name should be visible
    await expect(page.getByText("Negroni", { exact: true })).toBeVisible();
    await expect(page.getByText("Margarita", { exact: true })).toBeVisible();
  });

  test("cocktail list has no accessibility violations", async ({ page }) => {
    await mockCocktailRoutes(page);
    await page.goto("/cocktails");

    await injectAxe(page);
    // Only fail on critical/serious violations; minor/moderate tracked separately
    await checkA11y(page, undefined, { includedImpacts: ["critical", "serious"] });
  });

  test("search filter narrows cocktail list", async ({ page }) => {
    await mockCocktailRoutes(page);
    await page.goto("/cocktails");

    // Type into the search input (assumes a visible search field)
    await page.getByRole("searchbox").fill("Negroni");

    // After filtering, Margarita should disappear
    await expect(page.getByText("Negroni", { exact: true })).toBeVisible();
    await expect(page.getByText("Margarita", { exact: true })).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// Recipe detail page
// ---------------------------------------------------------------------------

test.describe("Recipe detail", () => {
  test("shows cocktail detail at /cocktails/[slug]", async ({ page }) => {
    await page.route("**/api/v1/cocktails/negroni", (route) => {
      route.fulfill({ json: MOCK_NEGRONI });
    });

    await page.goto("/cocktails/negroni");

    await expect(page.getByRole("heading", { name: "Negroni" })).toBeVisible();
    await expect(page.getByText("Stir")).toBeVisible();
    await expect(page.getByText("Orange peel")).toBeVisible();
  });

  test("recipe detail has no accessibility violations", async ({ page }) => {
    await page.route("**/api/v1/cocktails/negroni", (route) => {
      route.fulfill({ json: MOCK_NEGRONI });
    });

    await page.goto("/cocktails/negroni");

    await injectAxe(page);
    // Only fail on critical/serious violations; minor/moderate tracked separately
    await checkA11y(page, undefined, { includedImpacts: ["critical", "serious"] });
  });

  test("navigating from list to detail works", async ({ page }) => {
    await mockCocktailRoutes(page);
    await page.route("**/api/v1/cocktails/negroni", (route) => {
      route.fulfill({ json: MOCK_NEGRONI });
    });

    await page.goto("/cocktails");
    // Click the first cocktail card / link for Negroni
    // Cards use aria-label "Name — Category" format
    await page.getByRole("link", { name: "Negroni — Gin" }).click();
    await page.waitForURL("**/cocktails/negroni");

    await expect(page.getByRole("heading", { name: "Negroni" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 404 — unknown slug
// ---------------------------------------------------------------------------

test.describe("404 handling", () => {
  test("shows 404 page for unknown cocktail slug", async ({ page }) => {
    await page.route("**/api/v1/cocktails/does-not-exist", (route) => {
      route.fulfill({ status: 404, json: { detail: "Cocktail not found" } });
    });

    const response = await page.goto("/cocktails/does-not-exist");

    // Either the server returns 404 or the page renders a not-found UI
    const is404Status = response?.status() === 404;
    const has404Text =
      (await page.getByText(/not found/i).isVisible()) ||
      (await page.getByText(/404/i).isVisible());

    expect(is404Status || has404Text).toBe(true);
  });
});

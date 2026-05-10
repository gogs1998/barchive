/**
 * E2E: Ingredients — index and category browsing.
 *
 * All API calls are intercepted with page.route() so tests run without a live
 * backend.
 */

import { test, expect } from "@playwright/test";
import { checkA11y, injectAxe } from "axe-playwright";

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const MOCK_INGREDIENTS = [
  {
    id: "22222222-0000-0000-0000-000000000001",
    name: "Gin",
    category: "spirit",
    description: "Juniper-forward distilled spirit.",
  },
  {
    id: "22222222-0000-0000-0000-000000000002",
    name: "Sweet Vermouth",
    category: "liqueur",
    description: "Fortified aromatised wine.",
  },
  {
    id: "22222222-0000-0000-0000-000000000003",
    name: "Campari",
    category: "liqueur",
    description: "Bitter Italian aperitivo.",
  },
  {
    id: "22222222-0000-0000-0000-000000000004",
    name: "Tonic Water",
    category: "mixer",
    description: "Carbonated water with quinine.",
  },
];

async function mockIngredientRoutes(page: import("@playwright/test").Page) {
  await page.route("**/api/v1/ingredients", (route) => {
    route.fulfill({ json: MOCK_INGREDIENTS });
  });
}

// ---------------------------------------------------------------------------
// Ingredient index
// ---------------------------------------------------------------------------

test.describe("Ingredient index", () => {
  test("shows categorised ingredient list at /ingredients", async ({
    page,
  }) => {
    await mockIngredientRoutes(page);
    await page.goto("/ingredients");

    await expect(page.getByText("Gin", { exact: true })).toBeVisible();
    await expect(page.getByText("Sweet Vermouth", { exact: true })).toBeVisible();
    await expect(page.getByText("Campari", { exact: true })).toBeVisible();
    await expect(page.getByText("Soda Water", { exact: true })).toBeVisible();
  });

  test("ingredient categories are visible", async ({ page }) => {
    await mockIngredientRoutes(page);
    await page.goto("/ingredients");

    // The page groups ingredients alphabetically — verify letter heading sections exist
    // (A through Z letter headings appear as <h2> elements for each group)
    await expect(page.getByRole("heading", { name: "G", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "S", exact: true })).toBeVisible();
  });

  test("ingredient index has no accessibility violations", async ({ page }) => {
    await mockIngredientRoutes(page);
    await page.goto("/ingredients");

    await injectAxe(page);
    // Only fail on critical/serious violations; minor/moderate tracked separately
    await checkA11y(page, undefined, { includedImpacts: ["critical", "serious"] });
  });
});

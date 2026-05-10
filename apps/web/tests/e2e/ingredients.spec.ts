/**
 * E2E: Ingredients — index and category browsing.
 *
 * All API calls are intercepted with page.route() so tests run without a live
 * backend.
 */

import { test, expect } from "@playwright/test";
import { checkA11y } from "axe-playwright";

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

    await expect(page.getByText("Gin")).toBeVisible();
    await expect(page.getByText("Sweet Vermouth")).toBeVisible();
    await expect(page.getByText("Campari")).toBeVisible();
    await expect(page.getByText("Tonic Water")).toBeVisible();
  });

  test("ingredient categories are visible", async ({ page }) => {
    await mockIngredientRoutes(page);
    await page.goto("/ingredients");

    // Categories should appear as headings or labels
    await expect(
      page.getByText(/spirit/i).or(page.getByText(/spirits/i)).first()
    ).toBeVisible();
    await expect(
      page.getByText(/liqueur/i).or(page.getByText(/liqueurs/i)).first()
    ).toBeVisible();
  });

  test("ingredient index has no accessibility violations", async ({ page }) => {
    await mockIngredientRoutes(page);
    await page.goto("/ingredients");

    await checkA11y(page);
  });
});

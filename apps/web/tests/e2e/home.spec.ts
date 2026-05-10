import { test, expect } from "@playwright/test";
import { checkA11y, injectAxe } from "axe-playwright";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
});

test("home page has no accessibility violations", async ({ page }) => {
  await page.goto("/");
  await injectAxe(page);
  // Only fail on critical/serious violations; minor/moderate tracked separately
  await checkA11y(page, undefined, { includedImpacts: ["critical", "serious"] });
});

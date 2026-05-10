import { test, expect } from "@playwright/test";
import { checkA11y } from "axe-playwright";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
});

test("home page has no accessibility violations", async ({ page }) => {
  await page.goto("/");
  await checkA11y(page);
});

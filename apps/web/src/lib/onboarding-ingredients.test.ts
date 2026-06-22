import { describe, it, expect } from "vitest";
import { STARTER_INGREDIENTS } from "./onboarding-ingredients";
import { ALL_INGREDIENTS, COCKTAILS } from "./cocktails";
import { countMakeable } from "./makeable";

describe("STARTER_INGREDIENTS", () => {
  const lib = new Set(ALL_INGREDIENTS.map((n) => n.toLowerCase()));
  it("has a reasonable size", () => {
    expect(STARTER_INGREDIENTS.length).toBeGreaterThanOrEqual(30);
    expect(STARTER_INGREDIENTS.length).toBeLessThanOrEqual(60);
  });
  it("mostly maps to real dataset ingredient names", () => {
    const hits = STARTER_INGREDIENTS.filter((s) => lib.has(s.name.toLowerCase())).length;
    expect(hits / STARTER_INGREDIENTS.length).toBeGreaterThanOrEqual(0.8);
  });
  it("a representative ~11-ingredient starter bar can make a meaningful number of cocktails", () => {
    // Guards the onboarding payoff: tapping common starter items must surface
    // a healthy makeable count, not near-zero (regression test for C1 — the
    // old names like "Simple Syrup"/"Fresh Lime Juice" matched almost nothing).
    const selection = [
      "Gin",
      "Vodka",
      "Light White Rum",
      "Lime Juice",
      "Lemon Juice",
      "Sugar Syrup (2:1)",
      "Dry Vermouth",
      "Rosso/Sweet Vermouth",
      "Triple Sec",
      "Aromatic Bitters",
      "Orange Bitters",
    ];
    // Every name in the representative selection is a real starter ingredient.
    const starterNames = new Set(
      STARTER_INGREDIENTS.map((s) => s.name.toLowerCase())
    );
    for (const name of selection) {
      expect(starterNames.has(name.toLowerCase())).toBe(true);
    }
    const bar = new Set(selection.map((n) => n.toLowerCase()));
    expect(countMakeable(COCKTAILS, bar)).toBeGreaterThan(20);
  });
});

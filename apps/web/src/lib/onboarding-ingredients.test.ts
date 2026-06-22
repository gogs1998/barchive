import { describe, it, expect } from "vitest";
import { STARTER_INGREDIENTS } from "./onboarding-ingredients";
import { ALL_INGREDIENTS } from "./cocktails";

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
});

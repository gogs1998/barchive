// src/lib/cocktailiq/balance.test.ts
import { describe, it, expect } from "vitest";
import { calculateBalance } from "./balance";
import type { BuildIngredient } from "./types";

// A classic sour-style build: spirit + citrus + sweetener.
const margarita: BuildIngredient[] = [
  { name: "tequila", balanceGroup: "base_spirit", volumeMl: 60, compounds: ["a", "b", "c"] },
  { name: "lime juice", balanceGroup: "citrus", volumeMl: 30, compounds: ["b", "c", "d"] },
  { name: "triple sec", balanceGroup: "modifier", volumeMl: 22, compounds: ["c", "d", "e"] },
];

describe("calculateBalance", () => {
  it("returns a zeroed result for an empty build", () => {
    const s = calculateBalance([]);
    expect(s.overall).toBe(0);
    expect(s.rating).toBe("Needs Work");
  });

  it("scores a classic build well across dimensions", () => {
    const s = calculateBalance(margarita);
    expect(s.diversity).toBeGreaterThanOrEqual(70);
    expect(s.proportions).toBeGreaterThanOrEqual(70);
    expect(s.harmony).toBe(100);
    expect(s.overall).toBeGreaterThan(50);
    expect(["Excellent", "Good", "Fair"]).toContain(s.rating);
    expect(Array.isArray(s.suggestions)).toBe(true);
  });

  it("penalizes a single-ingredient build", () => {
    const s = calculateBalance([margarita[0]]);
    expect(s.harmony).toBeLessThan(60);
  });
});

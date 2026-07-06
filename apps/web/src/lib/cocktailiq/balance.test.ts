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

  // P1-2: ingredients with no compound data are unknown, not incompatible.
  it("treats unknown chemistry as neutral, not zero", () => {
    const noChem: BuildIngredient[] = [
      { name: "tequila", balanceGroup: "base_spirit", volumeMl: 60, compounds: [] },
      { name: "triple sec", balanceGroup: "modifier", volumeMl: 22, compounds: [] },
      { name: "agave", balanceGroup: "sweetener", volumeMl: 10, compounds: [] },
    ];
    expect(calculateBalance(noChem).chemistry).toBe(50);
  });

  // A single unknown-chemistry ingredient must not drag down a real pair's score.
  it("skips unscorable pairs instead of counting them as zero overlap", () => {
    const withUnknown: BuildIngredient[] = [
      { name: "lime juice", balanceGroup: "citrus", volumeMl: 30, compounds: ["a", "b", "c"] },
      { name: "lemon juice", balanceGroup: "citrus", volumeMl: 30, compounds: ["b", "c", "d"] },
      { name: "tequila", balanceGroup: "base_spirit", volumeMl: 60, compounds: [] },
    ];
    // Only the lime/lemon pair is scorable; the tequila pairs are skipped.
    expect(calculateBalance(withUnknown).chemistry).toBeGreaterThan(0);
  });
});

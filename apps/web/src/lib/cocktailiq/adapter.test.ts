// src/lib/cocktailiq/adapter.test.ts
import { describe, it, expect } from "vitest";
import { cocktailToBuild, isBalanceEligible } from "./adapter";
import type { Cocktail } from "../cocktails";

function cocktail(partial: Partial<Cocktail>): Cocktail {
  return {
    id: "x", name: "X", category: "Gin", glass: "Coupe", img: "", color: "#000",
    ingredients: [], steps: [], tags: [], abv: "", time: "",
    vegan: false, glutenFree: false, lowAbv: false, slug: "x",
    ...partial,
  };
}

const margarita = cocktail({
  ingredients: [
    { name: "Tequila Blanco", amount: "2 oz", qty: 2, unit: "oz" },
    { name: "Fresh Lime Juice", amount: "1 oz", qty: 1, unit: "oz" },
    { name: "Cointreau", amount: "0.75 oz", qty: 0.75, unit: "oz" },
  ],
});

describe("cocktailToBuild", () => {
  it("converts qty/unit to ml and resolves balance groups", () => {
    const build = cocktailToBuild(margarita);
    expect(build[0].balanceGroup).toBe("base_spirit");
    expect(Math.round(build[0].volumeMl)).toBe(59); // 2 oz * 29.5735
    expect(build[1].balanceGroup).toBe("citrus");
    expect(build[0].compounds.length).toBeGreaterThan(0);
  });
  it("gives non-numeric amounts zero volume", () => {
    const c = cocktail({ ingredients: [{ name: "Salt", amount: "rim", qty: null, unit: null }] });
    expect(cocktailToBuild(c)[0].volumeMl).toBe(0);
  });
});

describe("isBalanceEligible", () => {
  it("is true for a classic 3-ingredient spirit drink", () => {
    expect(isBalanceEligible(margarita)).toBe(true);
  });
  it("is false for a single-ingredient build", () => {
    expect(isBalanceEligible(cocktail({ ingredients: [margarita.ingredients[0]] }))).toBe(false);
  });
  it("is false when there is no base spirit", () => {
    const mocktail = cocktail({
      ingredients: [
        { name: "Fresh Lime Juice", amount: "1 oz", qty: 1, unit: "oz" },
        { name: "Simple Syrup", amount: "1 oz", qty: 1, unit: "oz" },
        { name: "Soda Water", amount: "top", qty: null, unit: null },
      ],
    });
    expect(isBalanceEligible(mocktail)).toBe(false);
  });
  it("is false for an oversized punch (>6 ingredients)", () => {
    const big = cocktail({
      ingredients: Array.from({ length: 8 }, (_, i) => ({
        name: i === 0 ? "Gin" : `Thing ${i}`, amount: "1 oz", qty: 1, unit: "oz",
      })),
    });
    expect(isBalanceEligible(big)).toBe(false);
  });
});

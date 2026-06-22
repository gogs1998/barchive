import { describe, it, expect } from "vitest";
import { isMakeable, countMakeable } from "./makeable";
import type { Cocktail } from "./cocktails";

const c = (names: string[]): Cocktail => ({
  id: names.join(), name: "T", category: "Gin", glass: "Coupe", img: "", color: "#000",
  ingredients: names.map((n) => ({ name: n, amount: "1 oz", qty: 1, unit: "oz" })),
  steps: [], tags: [], abv: "", time: "", vegan: false, glutenFree: false, lowAbv: false, slug: "t",
});

describe("makeable", () => {
  const bar = new Set(["gin", "lime juice", "simple syrup"]);
  it("isMakeable true when all ingredients are in the bar", () => {
    expect(isMakeable(c(["Gin", "Lime Juice"]), bar)).toBe(true);
  });
  it("isMakeable false when one is missing", () => {
    expect(isMakeable(c(["Gin", "Campari"]), bar)).toBe(false);
  });
  it("countMakeable counts only fully-makeable cocktails", () => {
    expect(countMakeable([c(["Gin"]), c(["Gin", "Campari"])], bar)).toBe(1);
  });
});

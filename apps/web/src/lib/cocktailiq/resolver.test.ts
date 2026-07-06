// src/lib/cocktailiq/resolver.test.ts
import { describe, it, expect } from "vitest";
import {
  resolveCanonical,
  getCategoryInfo,
  getCompounds,
  getSubstituteScores,
  mapToBalanceGroup,
} from "./resolver";

describe("resolveCanonical", () => {
  it("resolves via alias map", () => {
    expect(resolveCanonical("White Rum")).toBe("rum");
    expect(resolveCanonical("Fresh Lime Juice")).toBe("lime juice");
    expect(resolveCanonical("Cointreau")).toBe("triple sec");
  });
  it("resolves a direct vocabulary hit", () => {
    expect(resolveCanonical("Gin")).toBe("gin");
  });
  it("resolves by stripping qualifier words", () => {
    expect(resolveCanonical("Tequila Blanco")).toBe("tequila");
    expect(resolveCanonical("Reposado Tequila")).toBe("tequila");
  });
  it("returns null for unknown ingredients", () => {
    expect(resolveCanonical("Unicorn Tears")).toBeNull();
  });
});

// P1-3: canonical spirit spellings + tightened fallback (liqueur/schnapps/juice
// must never fall through to a base spirit).
describe("resolver P1-3 canonical spellings + fallback tightening", () => {
  const group = (name: string) =>
    mapToBalanceGroup(getCategoryInfo(resolveCanonical(name) ?? ""));

  it("resolves rye/scotch spellings to a base spirit", () => {
    expect(group("Rye Whiskey 50% Abv")).toBe("base_spirit");
    expect(group("Scotch Whisky")).toBe("base_spirit");
  });

  it("never resolves a liqueur/schnapps to a base spirit", () => {
    expect(group("Ginger Liqueur")).not.toBe("base_spirit");
    expect(resolveCanonical("Ginger Liqueur")).toBe("ginger liqueur");
    expect(group("Apple Schnapps")).not.toBe("base_spirit");
    expect(resolveCanonical("Apple Schnapps")).toBe("apple schnapps");
  });

  it("passion fruit is a (non-citrus) juice, not fake citrus", () => {
    expect(group("Passion Fruit")).not.toBe("citrus");
    expect(resolveCanonical("Passion Fruit")).toBe("passion fruit");
  });

  it("brut sparkling wine is a sparkling wine, not red wine", () => {
    expect(resolveCanonical("Brut Sparkling Wine")).toBe("sparkling wine");
    expect(getCategoryInfo("sparkling wine")?.category_group).not.toBe("wine_beer");
  });
});

describe("data lookups", () => {
  it("maps spirit to base_spirit", () => {
    expect(mapToBalanceGroup(getCategoryInfo("gin"))).toBe("base_spirit");
  });
  it("maps citrus juice to citrus via primary_category", () => {
    expect(mapToBalanceGroup(getCategoryInfo("lime juice"))).toBe("citrus");
  });
  it("maps sweetener to sweetener", () => {
    expect(mapToBalanceGroup(getCategoryInfo("simple syrup"))).toBe("sweetener");
  });
  it("maps everything else to modifier", () => {
    expect(mapToBalanceGroup(getCategoryInfo("triple sec"))).toBe("modifier");
    expect(mapToBalanceGroup(null)).toBe("modifier");
  });
  it("returns compounds and substitutes for a known ingredient", () => {
    expect(getCompounds("gin").length).toBeGreaterThan(0);
    expect(getSubstituteScores("gin").length).toBeGreaterThan(0);
  });
});

// P0-5: substring/fuzzy-join corruption in the alias + category tables.
describe("alias/category corruption is fixed (P0-5)", () => {
  const group = (name: string) =>
    mapToBalanceGroup(getCategoryInfo(resolveCanonical(name) ?? ""));

  it("fruit/veg juices resolve to a juice, never ice", () => {
    for (const j of [
      "Pineapple Juice",
      "Apple Juice",
      "Tomato Juice",
      "Pomegranate Juice",
      "Grape Juice",
    ]) {
      expect(resolveCanonical(j)).not.toBe("ice");
      // A non-citrus juice must NOT be counted as fake citrus volume.
      expect(group(j)).not.toBe("citrus");
    }
    expect(resolveCanonical("Pineapple Juice")).toBe("pineapple juice");
    expect(getCategoryInfo("pineapple juice")?.category_group).toBe("juice");
  });

  it("ginger is not gin", () => {
    expect(resolveCanonical("Ginger")).not.toBe("gin");
    expect(resolveCanonical("Ginger Syrup")).not.toBe("gin");
    // Ginger syrup is a sweetener, not a base spirit.
    expect(group("Ginger Syrup")).toBe("sweetener");
  });

  it("apple/pineapple are fruit, applejack stays a spirit", () => {
    expect(mapToBalanceGroup(getCategoryInfo("apple"))).not.toBe("base_spirit");
    expect(resolveCanonical("Pineapple")).not.toBe("apple");
    expect(group("Applejack")).toBe("base_spirit");
  });

  it("whisky (British spelling) is a base spirit", () => {
    expect(mapToBalanceGroup(getCategoryInfo("whisky"))).toBe("base_spirit");
  });

  it("plain ice contributes no balance volume", () => {
    // ice was mis-tagged as juice_citrus_lemon → citrus; must be neutral now.
    expect(mapToBalanceGroup(getCategoryInfo("ice"))).toBe("modifier");
  });
});

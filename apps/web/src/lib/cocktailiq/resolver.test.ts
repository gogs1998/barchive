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

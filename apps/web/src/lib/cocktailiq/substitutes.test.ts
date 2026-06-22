// src/lib/cocktailiq/substitutes.test.ts
import { describe, it, expect } from "vitest";
import { getSubstitutesFor } from "./substitutes";

describe("getSubstitutesFor", () => {
  it("returns curated entries when present (override)", () => {
    const subs = getSubstitutesFor("Cointreau");
    expect(subs.length).toBeGreaterThan(0);
    expect(subs.some((s) => s.name === "Triple Sec")).toBe(true);
  });
  it("falls back to the model for a non-curated ingredient", () => {
    const subs = getSubstitutesFor("Gin");
    expect(subs.length).toBeGreaterThan(0);
    // model names are title-cased for display
    expect(subs[0].name[0]).toBe(subs[0].name[0].toUpperCase());
  });
  it("returns empty for an unknown ingredient", () => {
    expect(getSubstitutesFor("Unicorn Tears")).toEqual([]);
  });
});

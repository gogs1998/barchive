import { describe, it, expect } from "vitest";
import { SUBSTITUTIONS, SubstituteEntry } from "./substitutions";

describe("SUBSTITUTIONS", () => {
  it("Cointreau has substitutes", () => {
    const subs = SUBSTITUTIONS["Cointreau"];
    expect(subs).toBeDefined();
    expect(subs.length).toBeGreaterThan(0);
  });

  it("Simple Syrup has substitutes", () => {
    const subs = SUBSTITUTIONS["Simple Syrup"];
    expect(subs).toBeDefined();
    expect(subs.length).toBeGreaterThan(0);
  });

  it("Egg White includes aquafaba", () => {
    const subs = SUBSTITUTIONS["Egg White"];
    expect(subs).toBeDefined();
    const aquafaba = subs.find(
      (s: SubstituteEntry) => s.name === "Aquafaba"
    );
    expect(aquafaba).toBeDefined();
    expect(aquafaba?.parity).toBe("equal");
  });

  it("all entries have required fields with valid parity", () => {
    const validParities = new Set(["equal", "close", "different"]);
    for (const [ingredient, subs] of Object.entries(SUBSTITUTIONS)) {
      for (const sub of subs) {
        expect(typeof sub.name, `${ingredient} sub name`).toBe("string");
        expect(sub.name.length, `${ingredient} sub name empty`).toBeGreaterThan(0);
        expect(typeof sub.note, `${ingredient} sub note`).toBe("string");
        expect(validParities.has(sub.parity), `${ingredient} invalid parity`).toBe(true);
      }
    }
  });

  it("Campari has Aperol as a close substitute", () => {
    const subs = SUBSTITUTIONS["Campari"];
    expect(subs).toBeDefined();
    const aperol = subs.find((s: SubstituteEntry) => s.name === "Aperol");
    expect(aperol).toBeDefined();
    expect(aperol?.parity).toBe("close");
  });

  it("covers all 17 required ingredients", () => {
    const required = [
      "Cointreau",
      "Simple Syrup",
      "Dry Vermouth",
      "Sweet Vermouth",
      "Campari",
      "Angostura Bitters",
      "Fresh Lime Juice",
      "Fresh Lemon Juice",
      "Bourbon",
      "Rye Whiskey",
      "Cognac",
      "Gin",
      "Kahlúa",
      "Orgeat",
      "Grenadine",
      "Champagne",
      "Egg White",
    ];
    for (const ingredient of required) {
      expect(SUBSTITUTIONS[ingredient], `Missing: ${ingredient}`).toBeDefined();
    }
  });
});

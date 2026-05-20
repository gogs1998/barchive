import { describe, it, expect } from "vitest";
import { parseAmount } from "./cocktails";
import { convertQty, formatQty, scaleAmount } from "./scaler";

// ─── parseAmount ──────────────────────────────────────────────────────────────
describe("parseAmount", () => {
  it("parses whole-number oz amounts", () => {
    expect(parseAmount("2 oz")).toEqual({ qty: 2, unit: "oz" });
    expect(parseAmount("1 oz")).toEqual({ qty: 1, unit: "oz" });
  });

  it("parses decimal oz amounts", () => {
    expect(parseAmount("0.75 oz")).toEqual({ qty: 0.75, unit: "oz" });
    expect(parseAmount("0.25 oz")).toEqual({ qty: 0.25, unit: "oz" });
    expect(parseAmount("1.5 oz")).toEqual({ qty: 1.5, unit: "oz" });
  });

  it("parses ml amounts", () => {
    expect(parseAmount("30 ml")).toEqual({ qty: 30, unit: "ml" });
    expect(parseAmount("15 ml")).toEqual({ qty: 15, unit: "ml" });
  });

  it("parses cl amounts", () => {
    expect(parseAmount("6 cl")).toEqual({ qty: 6, unit: "cl" });
  });

  it("parses tsp and tbsp", () => {
    expect(parseAmount("1 tsp")).toEqual({ qty: 1, unit: "tsp" });
    expect(parseAmount("2 tbsp")).toEqual({ qty: 2, unit: "tbsp" });
  });

  it("parses dashes (singular and plural)", () => {
    expect(parseAmount("2 dashes")).toEqual({ qty: 2, unit: "dash" });
    expect(parseAmount("1 dash")).toEqual({ qty: 1, unit: "dash" });
  });

  it("returns null qty/unit for non-numeric amounts", () => {
    expect(parseAmount("rim")).toEqual({ qty: null, unit: null });
    expect(parseAmount("top")).toEqual({ qty: null, unit: null });
    expect(parseAmount("pinch")).toEqual({ qty: null, unit: null });
    expect(parseAmount("8 leaves")).toEqual({ qty: null, unit: null });
    expect(parseAmount("2 slices")).toEqual({ qty: null, unit: null });
    expect(parseAmount("to taste")).toEqual({ qty: null, unit: null });
    expect(parseAmount("garnish")).toEqual({ qty: null, unit: null });
  });
});

// ─── convertQty ──────────────────────────────────────────────────────────────
describe("convertQty", () => {
  it("oz → ml: 1 oz = 29.5735 ml (approx)", () => {
    const result = convertQty(1, "oz", "ml");
    expect(result).toBeCloseTo(29.5735, 2);
  });

  it("oz → cl: 1 oz = 2.95735 cl (approx)", () => {
    const result = convertQty(1, "oz", "cl");
    expect(result).toBeCloseTo(2.95735, 2);
  });

  it("oz → oz is identity", () => {
    expect(convertQty(2, "oz", "oz")).toBe(2);
  });

  it("tsp → ml: 1 tsp = 5 ml", () => {
    expect(convertQty(1, "tsp", "ml")).toBe(5);
  });

  it("tbsp → ml: 1 tbsp = 15 ml", () => {
    expect(convertQty(1, "tbsp", "ml")).toBe(15);
  });

  it("dash → ml: 1 dash = 0.6 ml", () => {
    expect(convertQty(1, "dash", "ml")).toBe(0.6);
  });
});

// ─── formatQty ───────────────────────────────────────────────────────────────
describe("formatQty", () => {
  it("whole numbers show no decimal", () => {
    expect(formatQty(2)).toBe("2");
    expect(formatQty(10)).toBe("10");
  });

  it("trims trailing zeros", () => {
    expect(formatQty(1.5)).toBe("1.5");
    expect(formatQty(0.75)).toBe("0.75");
    expect(formatQty(0.50)).toBe("0.5");
  });

  it("rounds to 2 decimal places", () => {
    // 29.5735 rounded to 2dp = 29.57
    expect(formatQty(29.5735)).toBe("29.57");
  });
});

// ─── scaleAmount ─────────────────────────────────────────────────────────────
describe("scaleAmount", () => {
  it("scales 2 oz × 2 = 4 oz in oz mode", () => {
    expect(scaleAmount("2 oz", 2, "oz", 2, "oz")).toBe("4 oz");
  });

  it("converts 2 oz to ml", () => {
    const result = scaleAmount("2 oz", 2, "oz", 1, "ml");
    // 2 * 29.5735 = 59.147 → "59.15"
    expect(result).toBe("59.15 ml");
  });

  it("scales and converts: 2 oz × 4 in ml", () => {
    const result = scaleAmount("2 oz", 2, "oz", 4, "ml");
    // 8 * 29.5735 = 236.588 → "236.59 ml"
    expect(result).toBe("236.59 ml");
  });

  it("returns original amount for non-numeric ingredients (garnish)", () => {
    expect(scaleAmount("rim", null, null, 4, "oz")).toBe("rim");
    expect(scaleAmount("top", null, null, 2, "ml")).toBe("top");
    expect(scaleAmount("8 leaves", null, null, 8, "cl")).toBe("8 leaves");
  });

  it("handles fractional custom multiplier (0.5x)", () => {
    expect(scaleAmount("2 oz", 2, "oz", 0.5, "oz")).toBe("1 oz");
  });

  it("scales tsp → ml correctly", () => {
    // 1 tsp × 3 = 3 tsp = 15 ml
    const result = scaleAmount("1 tsp", 1, "tsp", 3, "ml");
    expect(result).toBe("15 ml");
  });

  it("scales dash → ml correctly", () => {
    // 2 dashes × 2 = 4 dashes = 2.4 ml
    const result = scaleAmount("2 dashes", 2, "dash", 2, "ml");
    expect(result).toBe("2.4 ml");
  });
});

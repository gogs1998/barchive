import { describe, it, expect } from "vitest";
import { COCKTAILS, getCocktailBySlug } from "./cocktails";
import {
  absoluteUrl,
  getSpiritHubs,
  isIndexable,
  jsonLdString,
  recipeJsonLd,
  toIsoDuration,
} from "./seo";

describe("isIndexable", () => {
  it("excludes Difford's-sourced recipes", () => {
    expect(isIndexable({ id: "diffords-3" })).toBe(false);
    expect(isIndexable({ id: "11007" })).toBe(true);
  });
});

describe("toIsoDuration", () => {
  it("converts minutes", () => {
    expect(toIsoDuration("2 min")).toBe("PT2M");
    expect(toIsoDuration("10 minutes")).toBe("PT10M");
  });
  it("returns undefined when unknown", () => {
    expect(toIsoDuration("")).toBeUndefined();
  });
});

describe("absoluteUrl", () => {
  it("prefixes site paths and leaves absolute URLs alone", () => {
    expect(absoluteUrl("/cocktails")).toBe("https://bariq.co.uk/cocktails");
    expect(absoluteUrl("https://example.com/a.jpg")).toBe("https://example.com/a.jpg");
  });
});

describe("jsonLdString", () => {
  it("cannot close the script tag", () => {
    expect(jsonLdString({ name: "</script><b>" })).not.toContain("</script>");
  });
});

describe("recipeJsonLd", () => {
  it("includes ingredients, steps and ISO times for a curated recipe", () => {
    const margarita = getCocktailBySlug("margarita")!;
    const ld = recipeJsonLd(margarita);
    expect(ld["@type"]).toBe("Recipe");
    expect(ld.recipeIngredient.length).toBe(margarita.ingredients.length);
    expect(ld.recipeInstructions[0]).toMatchObject({ "@type": "HowToStep", position: 1 });
    expect(ld.totalTime).toBe("PT2M");
  });
});

describe("getSpiritHubs", () => {
  it("puts every cocktail in exactly one hub", () => {
    const total = getSpiritHubs().reduce((n, h) => n + h.cocktails.length, 0);
    expect(total).toBe(COCKTAILS.length);
  });
});

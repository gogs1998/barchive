import { describe, it, expect } from "vitest";
import {
  COCKTAILS,
  CATEGORIES,
  GLASSES,
  ALL_INGREDIENTS,
  getCocktailBySlug,
  getCocktailById,
  searchCocktails,
} from "./cocktails";
import {
  getCocktails,
  getCocktail,
  getCocktailById_api,
  getIngredients,
  getCategories,
  getGlasses,
} from "./api";

// ─── cocktails.ts ─────────────────────────────────────────────────────────────
describe("COCKTAILS dataset", () => {
  it("contains at least 10 cocktails", () => {
    expect(COCKTAILS.length).toBeGreaterThanOrEqual(10);
  });

  it("each cocktail has required fields", () => {
    for (const c of COCKTAILS) {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.slug).toBeTruthy();
      expect(c.category).toBeTruthy();
      expect(Array.isArray(c.ingredients)).toBe(true);
      expect(Array.isArray(c.steps)).toBe(true);
    }
  });

  it("slugs are URL-safe lowercase strings", () => {
    for (const c of COCKTAILS) {
      expect(c.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("lowAbv is true when abv < 15%", () => {
    const low = COCKTAILS.filter((c) => parseInt(c.abv) < 15);
    for (const c of low) {
      expect(c.lowAbv).toBe(true);
    }
  });
});

describe("CATEGORIES", () => {
  it("is a non-empty sorted array", () => {
    expect(CATEGORIES.length).toBeGreaterThan(0);
    const sorted = [...CATEGORIES].sort();
    expect(CATEGORIES).toEqual(sorted);
  });
});

describe("GLASSES", () => {
  it("is a non-empty sorted array", () => {
    expect(GLASSES.length).toBeGreaterThan(0);
    const sorted = [...GLASSES].sort();
    expect(GLASSES).toEqual(sorted);
  });
});

describe("ALL_INGREDIENTS", () => {
  it("is a non-empty sorted array of strings", () => {
    expect(ALL_INGREDIENTS.length).toBeGreaterThan(0);
    for (const i of ALL_INGREDIENTS) {
      expect(typeof i).toBe("string");
    }
  });
});

describe("getCocktailBySlug", () => {
  it("finds a cocktail by slug", () => {
    const first = COCKTAILS[0];
    const found = getCocktailBySlug(first.slug);
    expect(found).toBeDefined();
    expect(found!.id).toBe(first.id);
  });

  it("returns undefined for unknown slug", () => {
    expect(getCocktailBySlug("not-a-real-cocktail-xyz")).toBeUndefined();
  });
});

describe("getCocktailById", () => {
  it("finds a cocktail by id", () => {
    const first = COCKTAILS[0];
    const found = getCocktailById(first.id);
    expect(found).toBeDefined();
    expect(found!.slug).toBe(first.slug);
  });

  it("returns undefined for unknown id", () => {
    expect(getCocktailById("999999")).toBeUndefined();
  });
});

describe("searchCocktails", () => {
  it("finds cocktails by name", () => {
    const results = searchCocktails("margarita");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((c) => c.name.toLowerCase().includes("margarita"))).toBe(true);
  });

  it("finds cocktails by category", () => {
    const results = searchCocktails("tequila");
    expect(results.length).toBeGreaterThan(0);
  });

  it("finds cocktails by ingredient", () => {
    const results = searchCocktails("lime juice");
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns empty array for no match", () => {
    expect(searchCocktails("xyznonexistentquery123")).toHaveLength(0);
  });
});

// ─── api.ts ───────────────────────────────────────────────────────────────────
describe("getCocktails", () => {
  it("returns all cocktails with default params", async () => {
    const result = await getCocktails();
    expect(result.cocktails.length).toBeGreaterThan(0);
    expect(result.total).toBe(COCKTAILS.length);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(24);
  });

  it("filters by query", async () => {
    const result = await getCocktails({ query: "margarita" });
    expect(result.cocktails.length).toBeGreaterThan(0);
    expect(result.total).toBeLessThan(COCKTAILS.length);
  });

  it("filters by category", async () => {
    const cat = COCKTAILS[0].category;
    const result = await getCocktails({ category: cat });
    expect(result.cocktails.every((c) => c.category === cat)).toBe(true);
  });

  it("filters by glass", async () => {
    const glass = COCKTAILS[0].glass;
    const result = await getCocktails({ glass });
    expect(result.cocktails.every((c) => c.glass === glass)).toBe(true);
  });

  it("paginates results", async () => {
    const result = await getCocktails({ pageSize: 2, page: 1 });
    expect(result.cocktails).toHaveLength(2);
    expect(result.pageSize).toBe(2);
  });
});

describe("getCocktail", () => {
  it("returns cocktail for valid slug", async () => {
    const slug = COCKTAILS[0].slug;
    const cocktail = await getCocktail(slug);
    expect(cocktail).not.toBeNull();
    expect(cocktail!.slug).toBe(slug);
  });

  it("returns null for unknown slug", async () => {
    expect(await getCocktail("no-such-cocktail-xyz")).toBeNull();
  });
});

describe("getCocktailById_api", () => {
  it("returns cocktail for valid id", async () => {
    const id = COCKTAILS[0].id;
    const cocktail = await getCocktailById_api(id);
    expect(cocktail).not.toBeNull();
    expect(cocktail!.id).toBe(id);
  });

  it("returns null for unknown id", async () => {
    expect(await getCocktailById_api("999999")).toBeNull();
  });
});

describe("getIngredients", () => {
  it("returns ingredient summaries", async () => {
    const ingredients = await getIngredients();
    expect(ingredients.length).toBeGreaterThan(0);
    for (const i of ingredients) {
      expect(i.name).toBeTruthy();
      expect(i.cocktailCount).toBeGreaterThan(0);
      expect(Array.isArray(i.cocktails)).toBe(true);
    }
  });
});

describe("getCategories", () => {
  it("returns non-empty array of strings", async () => {
    const cats = await getCategories();
    expect(cats.length).toBeGreaterThan(0);
    expect(cats).toEqual(CATEGORIES);
  });
});

describe("getGlasses", () => {
  it("returns non-empty array of strings", async () => {
    const glasses = await getGlasses();
    expect(glasses.length).toBeGreaterThan(0);
    expect(glasses).toEqual(GLASSES);
  });
});

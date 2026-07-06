import { describe, it, expect } from "vitest";
import app from "../src/index";
import { createFakeD1, type FakeDb } from "./fake-d1";

function testEnv(fake: FakeDb) {
  return {
    DB: fake.db,
    JWT_SECRET: "test-secret",
    ENVIRONMENT: "development",
    FRONTEND_ORIGIN: "http://localhost:3000",
  };
}

function seedCatalog(fake: FakeDb) {
  const { raw } = fake;
  raw
    .prepare(
      "INSERT INTO ingredients (id, name, category, description, slug) VALUES (?, ?, ?, ?, ?)",
    )
    .run("ing-gin", "Gin", "Spirits", "Juniper spirit", "gin");
  raw
    .prepare(
      "INSERT INTO ingredients (id, name, category, description, slug) VALUES (?, ?, ?, ?, ?)",
    )
    .run("ing-tonic", "Tonic water", "Mixers", null, "tonic-water");
  raw
    .prepare(
      "INSERT INTO cocktails (id, name, slug, description, method, garnish, glassware) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run("ck-gt", "Gin & Tonic", "gin-and-tonic", "A classic", "Build", "Lime", "Highball");
  raw
    .prepare(
      "INSERT INTO cocktail_ingredients (cocktail_id, ingredient_id, quantity, unit, notes, quantity_num, unit_norm) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run("ck-gt", "ing-gin", "50", "ml", null, 50, "ml");
  raw.prepare("INSERT INTO tags (id, name) VALUES (?, ?)").run("tag-easy", "Easy");
  raw
    .prepare("INSERT INTO cocktail_tags (cocktail_id, tag_id) VALUES (?, ?)")
    .run("ck-gt", "tag-easy");
}

describe("catalog routes", () => {
  it("GET /api/v1/cocktails returns a paginated list", async () => {
    const fake = createFakeD1();
    seedCatalog(fake);
    const res = await app.request("/api/v1/cocktails", {}, testEnv(fake));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      total: number;
      page: number;
      per_page: number;
      items: { slug: string }[];
    };
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.per_page).toBe(20);
    expect(body.items[0].slug).toBe("gin-and-tonic");
  });

  it("GET /api/v1/cocktails?q= filters by name", async () => {
    const fake = createFakeD1();
    seedCatalog(fake);
    const hit = await app.request("/api/v1/cocktails?q=gin", {}, testEnv(fake));
    expect((await hit.json() as { total: number }).total).toBe(1);
    const miss = await app.request("/api/v1/cocktails?q=zzz", {}, testEnv(fake));
    expect((await miss.json() as { total: number }).total).toBe(0);
  });

  it("GET /api/v1/cocktails/{slug} joins ingredients + tags", async () => {
    const fake = createFakeD1();
    seedCatalog(fake);
    const res = await app.request("/api/v1/cocktails/gin-and-tonic", {}, testEnv(fake));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      name: string;
      ingredients: { ingredient_id: string; name: string; unit_norm: string }[];
      tags: { name: string }[];
    };
    expect(body.name).toBe("Gin & Tonic");
    expect(body.ingredients).toHaveLength(1);
    expect(body.ingredients[0].ingredient_id).toBe("ing-gin");
    expect(body.ingredients[0].unit_norm).toBe("ml");
    expect(body.tags[0].name).toBe("Easy");
  });

  it("GET /api/v1/cocktails/{slug} 404s for unknown slug", async () => {
    const fake = createFakeD1();
    seedCatalog(fake);
    const res = await app.request("/api/v1/cocktails/nope", {}, testEnv(fake));
    expect(res.status).toBe(404);
    expect((await res.json() as { error: string }).error).toBeTruthy();
  });
});

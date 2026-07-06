import { describe, it, expect, beforeEach } from "vitest";
import app from "../src/index";
import { createFakeD1, type FakeDb } from "./fake-d1";
import { testEnv, cookieHeader, jsonPost } from "./helpers";

function seed(fake: FakeDb) {
  const { raw } = fake;
  raw
    .prepare("INSERT INTO ingredients (id, name, category, description, slug) VALUES (?, ?, ?, ?, ?)")
    .run("ing-gin", "Gin", "Spirits", "Juniper spirit", "gin");
  raw
    .prepare("INSERT INTO ingredients (id, name, category, description, slug) VALUES (?, ?, ?, ?, ?)")
    .run("ing-lime", "Lime juice", "Mixers", null, "lime-juice");
  raw
    .prepare("INSERT INTO cocktails (id, name, slug, description, method, garnish, glassware) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run("ck-daiquiri", "Daiquiri", "daiquiri", "Rum sour", "Shake", "Lime", "Coupe");
  raw
    .prepare("INSERT INTO cocktail_ingredients (cocktail_id, ingredient_id, quantity, unit, notes, quantity_num, unit_norm) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run("ck-daiquiri", "ing-lime", "25", "ml", "fresh", 25, "ml");
  raw.prepare("INSERT INTO tags (id, name) VALUES (?, ?)").run("tag-sour", "Sour");
  raw.prepare("INSERT INTO cocktail_tags (cocktail_id, tag_id) VALUES (?, ?)").run("ck-daiquiri", "tag-sour");
}

async function authedCookie(fake: FakeDb): Promise<string> {
  const env = testEnv(fake);
  await app.request(
    "/api/v1/auth/register",
    jsonPost({ email: "bar@b.com", password: "password1" }),
    env,
  );
  const login = await app.request(
    "/api/v1/auth/login",
    jsonPost({ email: "bar@b.com", password: "password1" }),
    env,
  );
  return cookieHeader(login);
}

describe("My Bar (slug-keyed)", () => {
  let fake: FakeDb;
  let cookie: string;

  beforeEach(async () => {
    fake = createFakeD1();
    seed(fake);
    cookie = await authedCookie(fake);
  });

  const get = (path: string) =>
    app.request(path, { headers: { Cookie: cookie } }, testEnv(fake));
  const post = (path: string) =>
    app.request(path, { method: "POST", headers: { Cookie: cookie } }, testEnv(fake));
  const del = (path: string) =>
    app.request(path, { method: "DELETE", headers: { Cookie: cookie } }, testEnv(fake));

  it("requires auth", async () => {
    const res = await app.request("/api/user/bar", {}, testEnv(fake));
    expect(res.status).toBe(401);
  });

  it("GET is empty initially", async () => {
    const res = await get("/api/user/bar");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [], total: 0 });
  });

  it("POST adds by slug (idempotent) and GET returns slug ids", async () => {
    expect((await post("/api/user/bar/gin")).status).toBe(204);
    expect((await post("/api/user/bar/gin")).status).toBe(204); // idempotent

    const res = await get("/api/user/bar");
    const body = (await res.json()) as { items: { id: string; name: string }[]; total: number };
    expect(body.total).toBe(1);
    expect(body.items[0]).toMatchObject({ id: "gin", name: "Gin", category: "Spirits" });
  });

  it("POST unknown slug is 404", async () => {
    expect((await post("/api/user/bar/does-not-exist")).status).toBe(404);
  });

  it("DELETE removes (204) then 404 when absent", async () => {
    await post("/api/user/bar/gin");
    expect((await del("/api/user/bar/gin")).status).toBe(204);
    expect((await del("/api/user/bar/gin")).status).toBe(404);
    expect((await get("/api/user/bar")).status).toBe(200);
    expect(((await (await get("/api/user/bar")).json()) as { total: number }).total).toBe(0);
  });
});

describe("Favourites (slug-keyed)", () => {
  let fake: FakeDb;
  let cookie: string;

  beforeEach(async () => {
    fake = createFakeD1();
    seed(fake);
    cookie = await authedCookie(fake);
  });

  const get = (path: string) =>
    app.request(path, { headers: { Cookie: cookie } }, testEnv(fake));
  const post = (path: string) =>
    app.request(path, { method: "POST", headers: { Cookie: cookie } }, testEnv(fake));
  const del = (path: string) =>
    app.request(path, { method: "DELETE", headers: { Cookie: cookie } }, testEnv(fake));

  it("GET is empty initially", async () => {
    const res = await get("/api/user/favourites");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("POST saves by slug (idempotent) and GET returns full cards", async () => {
    expect((await post("/api/user/favourites/daiquiri")).status).toBe(204);
    expect((await post("/api/user/favourites/daiquiri")).status).toBe(204);

    const res = await get("/api/user/favourites");
    const cards = (await res.json()) as {
      slug: string;
      isFavourited: boolean;
      ingredients: { ingredient_id: string; name: string }[];
      tags: { name: string }[];
    }[];
    expect(cards).toHaveLength(1);
    expect(cards[0].slug).toBe("daiquiri");
    expect(cards[0].isFavourited).toBe(true);
    expect(cards[0].ingredients[0].ingredient_id).toBe("ing-lime");
    expect(cards[0].tags[0].name).toBe("Sour");
  });

  it("POST unknown slug is 404", async () => {
    expect((await post("/api/user/favourites/nope")).status).toBe(404);
  });

  it("DELETE is idempotent 204", async () => {
    await post("/api/user/favourites/daiquiri");
    expect((await del("/api/user/favourites/daiquiri")).status).toBe(204);
    expect((await del("/api/user/favourites/daiquiri")).status).toBe(204); // still 204
    expect(((await (await get("/api/user/favourites")).json()) as unknown[]).length).toBe(0);
  });
});

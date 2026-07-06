import { describe, it, expect } from "vitest";
import { createFakeD1 } from "./fake-d1";
import { first, all, run } from "../src/db";

describe("fake D1", () => {
  it("round-trips an insert + select", async () => {
    const { db } = createFakeD1();

    await run(
      db,
      "INSERT INTO ingredients (id, name, category, description, slug) VALUES (?, ?, ?, ?, ?)",
      "i1",
      "Gin",
      "Spirits",
      "A juniper spirit",
      "gin",
    );

    const row = await first<{ id: string; name: string; slug: string }>(
      db,
      "SELECT id, name, slug FROM ingredients WHERE slug = ?",
      "gin",
    );
    expect(row).toEqual({ id: "i1", name: "Gin", slug: "gin" });

    const rows = await all<{ name: string }>(
      db,
      "SELECT name FROM ingredients ORDER BY name",
    );
    expect(rows).toEqual([{ name: "Gin" }]);

    const missing = await first(db, "SELECT * FROM ingredients WHERE slug = ?", "nope");
    expect(missing).toBeNull();
  });

  it("reports changes for idempotent insert and delete", async () => {
    const { db } = createFakeD1();
    await run(db, "INSERT INTO users (id, email) VALUES (?, ?)", "u1", "a@b.com");

    const dup = await run(
      db,
      "INSERT OR IGNORE INTO users (id, email) VALUES (?, ?)",
      "u2",
      "a@b.com",
    );
    expect(dup.meta.changes).toBe(0);

    const del = await run(db, "DELETE FROM users WHERE id = ?", "missing");
    expect(del.meta.changes).toBe(0);

    const del2 = await run(db, "DELETE FROM users WHERE id = ?", "u1");
    expect(del2.meta.changes).toBe(1);
  });
});

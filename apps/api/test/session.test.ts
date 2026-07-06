import { describe, it, expect } from "vitest";
import { createFakeD1 } from "./fake-d1";
import { createSession, rotateSession, revokeSession } from "../src/auth/session";
import { first } from "../src/db";

function seedUser(raw: ReturnType<typeof createFakeD1>["raw"], id = "u1") {
  raw.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(id, `${id}@ex.com`);
}

describe("sessions / refresh tokens", () => {
  it("createSession inserts a row and returns an opaque token", async () => {
    const { db, raw } = createFakeD1();
    seedUser(raw);
    const token = await createSession(db, "u1");
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(10);

    const row = await first<{ user_id: string; expires_at: string }>(
      db,
      "SELECT user_id, expires_at FROM sessions WHERE token = ?",
      token,
    );
    expect(row?.user_id).toBe("u1");
    expect(new Date(row!.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it("rotateSession invalidates the old token and returns a new one", async () => {
    const { db, raw } = createFakeD1();
    seedUser(raw);
    const oldToken = await createSession(db, "u1");
    const newToken = await rotateSession(db, oldToken);

    expect(newToken).toBeTruthy();
    expect(newToken).not.toBe(oldToken);
    // Old token is gone
    expect(await first(db, "SELECT token FROM sessions WHERE token = ?", oldToken)).toBeNull();
    // New token exists and maps to same user
    const row = await first<{ user_id: string }>(
      db,
      "SELECT user_id FROM sessions WHERE token = ?",
      newToken!,
    );
    expect(row?.user_id).toBe("u1");
  });

  it("rotateSession returns null for a missing token", async () => {
    const { db } = createFakeD1();
    expect(await rotateSession(db, "does-not-exist")).toBeNull();
  });

  it("rotateSession returns null (and revokes) for an expired token", async () => {
    const { db, raw } = createFakeD1();
    seedUser(raw);
    raw
      .prepare("INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)")
      .run("s-exp", "u1", "expired-token", "2000-01-01T00:00:00Z");

    expect(await rotateSession(db, "expired-token")).toBeNull();
    // Expired row is cleaned up
    expect(await first(db, "SELECT token FROM sessions WHERE token = ?", "expired-token")).toBeNull();
  });

  it("revokeSession deletes the row", async () => {
    const { db, raw } = createFakeD1();
    seedUser(raw);
    const token = await createSession(db, "u1");
    await revokeSession(db, token);
    expect(await first(db, "SELECT token FROM sessions WHERE token = ?", token)).toBeNull();
  });
});

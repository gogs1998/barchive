import { describe, it, expect } from "vitest";
import app from "../src/index";
import { createFakeD1 } from "./fake-d1";
import { testEnv, cookieHeader, jsonPost } from "./helpers";

describe("auth routes", () => {
  it("register creates a hashed user and returns 201 user json", async () => {
    const fake = createFakeD1();
    const res = await app.request(
      "/api/v1/auth/register",
      jsonPost({ email: "a@b.com", password: "password1", displayName: "Ava" }),
      testEnv(fake),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: string;
      email: string;
      email_verified: boolean;
      display_name: string;
    };
    expect(body.email).toBe("a@b.com");
    expect(body.email_verified).toBe(false);
    expect(body.display_name).toBe("Ava");

    const row = fake.raw
      .prepare("SELECT password_hash, display_name FROM users WHERE email = ?")
      .get("a@b.com") as { password_hash: string; display_name: string };
    expect(row.password_hash.startsWith("pbkdf2$")).toBe(true);
    expect(row.password_hash).not.toContain("password1");
    expect(row.display_name).toBe("Ava");
  });

  it("register rejects duplicate email (409) and short password (400)", async () => {
    const fake = createFakeD1();
    await app.request(
      "/api/v1/auth/register",
      jsonPost({ email: "dup@b.com", password: "password1" }),
      testEnv(fake),
    );
    const dup = await app.request(
      "/api/v1/auth/register",
      jsonPost({ email: "dup@b.com", password: "password1" }),
      testEnv(fake),
    );
    expect(dup.status).toBe(409);
    expect((await dup.json() as { error: string }).error).toBeTruthy();

    const short = await app.request(
      "/api/v1/auth/register",
      jsonPost({ email: "x@b.com", password: "short" }),
      testEnv(fake),
    );
    expect(short.status).toBe(400);
  });

  it("login returns the user object + sets cookies; wrong pw is 401", async () => {
    const fake = createFakeD1();
    const env = testEnv(fake);
    await app.request(
      "/api/v1/auth/register",
      jsonPost({ email: "c@b.com", password: "password1", displayName: "Cee" }),
      env,
    );

    const ok = await app.request(
      "/api/v1/auth/login",
      jsonPost({ email: "c@b.com", password: "password1" }),
      env,
    );
    expect(ok.status).toBe(200);
    const user = (await ok.json()) as { email: string; display_name: string };
    expect(user.email).toBe("c@b.com");
    expect(user.display_name).toBe("Cee");
    const cookies = cookieHeader(ok);
    expect(cookies).toContain("access_token=");
    expect(cookies).toContain("refresh_token=");

    const bad = await app.request(
      "/api/v1/auth/login",
      jsonPost({ email: "c@b.com", password: "wrongpass" }),
      env,
    );
    expect(bad.status).toBe(401);
  });

  it("me requires a valid access cookie", async () => {
    const fake = createFakeD1();
    const env = testEnv(fake);
    await app.request(
      "/api/v1/auth/register",
      jsonPost({ email: "d@b.com", password: "password1" }),
      env,
    );
    const login = await app.request(
      "/api/v1/auth/login",
      jsonPost({ email: "d@b.com", password: "password1" }),
      env,
    );
    const cookies = cookieHeader(login);

    const noCookie = await app.request("/api/user/me", {}, env);
    expect(noCookie.status).toBe(401);

    const withCookie = await app.request(
      "/api/user/me",
      { headers: { Cookie: cookies } },
      env,
    );
    expect(withCookie.status).toBe(200);
    expect((await withCookie.json() as { email: string }).email).toBe("d@b.com");

    // Alias endpoint
    const alias = await app.request(
      "/api/v1/auth/me",
      { headers: { Cookie: cookies } },
      env,
    );
    expect(alias.status).toBe(200);
  });

  it("refresh rotates the session and re-issues cookies", async () => {
    const fake = createFakeD1();
    const env = testEnv(fake);
    await app.request(
      "/api/v1/auth/register",
      jsonPost({ email: "e@b.com", password: "password1" }),
      env,
    );
    const login = await app.request(
      "/api/v1/auth/login",
      jsonPost({ email: "e@b.com", password: "password1" }),
      env,
    );
    const cookies = cookieHeader(login);
    const oldRefresh = /refresh_token=([^;]+)/.exec(cookies)?.[1];

    const refreshed = await app.request(
      "/api/v1/auth/refresh",
      { method: "POST", headers: { Cookie: cookies } },
      env,
    );
    expect(refreshed.status).toBe(200);
    const newCookies = cookieHeader(refreshed);
    const newRefresh = /refresh_token=([^;]+)/.exec(newCookies)?.[1];
    expect(newRefresh).toBeTruthy();
    expect(newRefresh).not.toBe(oldRefresh);

    // Old refresh token no longer works
    const reuse = await app.request(
      "/api/v1/auth/refresh",
      { method: "POST", headers: { Cookie: `refresh_token=${oldRefresh}` } },
      env,
    );
    expect(reuse.status).toBe(401);
  });

  it("logout deletes the session and clears cookies", async () => {
    const fake = createFakeD1();
    const env = testEnv(fake);
    await app.request(
      "/api/v1/auth/register",
      jsonPost({ email: "f@b.com", password: "password1" }),
      env,
    );
    const login = await app.request(
      "/api/v1/auth/login",
      jsonPost({ email: "f@b.com", password: "password1" }),
      env,
    );
    const cookies = cookieHeader(login);

    const before = fake.raw.prepare("SELECT COUNT(*) AS c FROM sessions").get() as { c: number };
    expect(before.c).toBe(1);

    const out = await app.request(
      "/api/v1/auth/logout",
      { method: "POST", headers: { Cookie: cookies } },
      env,
    );
    expect(out.status).toBe(200);

    const after = fake.raw.prepare("SELECT COUNT(*) AS c FROM sessions").get() as { c: number };
    expect(after.c).toBe(0);
  });

  it("returns 500 when JWT_SECRET is unset", async () => {
    const fake = createFakeD1();
    const env = testEnv(fake, { JWT_SECRET: "" });
    await app.request(
      "/api/v1/auth/register",
      jsonPost({ email: "g@b.com", password: "password1" }),
      testEnv(fake),
    );
    const res = await app.request(
      "/api/v1/auth/login",
      jsonPost({ email: "g@b.com", password: "password1" }),
      env,
    );
    expect(res.status).toBe(500);
  });
});

import { describe, it, expect } from "vitest";
import app from "../src/index";
import { createFakeD1 } from "./fake-d1";
import { testEnv, jsonPost } from "./helpers";

describe("auth hardening", () => {
  it("register rejects a malformed email", async () => {
    const res = await app.request(
      "/api/v1/auth/register",
      jsonPost({ email: "not-an-email", password: "password1" }),
      testEnv(createFakeD1()),
    );
    expect(res.status).toBe(400);
  });

  it("register rejects passwords over 128 characters", async () => {
    const res = await app.request(
      "/api/v1/auth/register",
      jsonPost({ email: "a@b.com", password: "x".repeat(129) }),
      testEnv(createFakeD1()),
    );
    expect(res.status).toBe(400);
  });

  it("login rejects an over-long password without hashing it", async () => {
    const res = await app.request(
      "/api/v1/auth/login",
      jsonPost({ email: "a@b.com", password: "x".repeat(10_000) }),
      testEnv(createFakeD1()),
    );
    expect(res.status).toBe(401);
  });

  it("blocks writes from a foreign Origin, allows listed origins", async () => {
    const env = testEnv(createFakeD1(), {
      FRONTEND_ORIGIN: "https://bariq.co.uk,https://www.bariq.co.uk",
    });
    const req = (origin: string): RequestInit => {
      const init = jsonPost({ email: "a@b.com", password: "password1" });
      return { ...init, headers: { ...(init.headers as Record<string, string>), Origin: origin } };
    };
    const evil = await app.request("/api/v1/auth/register", req("https://evil.example"), env);
    expect(evil.status).toBe(403);
    const www = await app.request("/api/v1/auth/register", req("https://www.bariq.co.uk"), env);
    expect(www.status).toBe(201);
  });

  it("returns 429 when the auth rate limiter says no", async () => {
    const env = {
      ...testEnv(createFakeD1()),
      AUTH_LIMITER: { limit: async () => ({ success: false }) },
    };
    const res = await app.request(
      "/api/v1/auth/login",
      jsonPost({ email: "a@b.com", password: "password1" }),
      env,
    );
    expect(res.status).toBe(429);
  });

  it("health does not leak database error text", async () => {
    const env = {
      ...testEnv(createFakeD1()),
      DB: { prepare: () => ({ first: async () => { throw new Error("secret detail"); } }) },
    };
    const res = await app.request("/health", {}, env);
    const body = await res.text();
    expect(body).not.toContain("secret detail");
  });
});

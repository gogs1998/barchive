import { describe, it, expect } from "vitest";
import app from "../src/index";
import { createFakeD1 } from "./fake-d1";
import { testEnv, jsonPost } from "./helpers";
import { signReset } from "../src/auth/jwt";
import { verifyPassword } from "../src/auth/password";

describe("password reset", () => {
  it("request always returns 200 (anti-enumeration)", async () => {
    const fake = createFakeD1();
    const known = await app.request(
      "/api/v1/auth/register",
      jsonPost({ email: "known@b.com", password: "password1" }),
      testEnv(fake),
    );
    expect(known.status).toBe(201);

    const forKnown = await app.request(
      "/api/v1/auth/password-reset/request",
      jsonPost({ email: "known@b.com" }),
      testEnv(fake),
    );
    const forUnknown = await app.request(
      "/api/v1/auth/password-reset/request",
      jsonPost({ email: "nobody@b.com" }),
      testEnv(fake),
    );
    expect(forKnown.status).toBe(200);
    expect(forUnknown.status).toBe(200);
  });

  it("confirm with a valid reset token updates the password hash", async () => {
    const fake = createFakeD1();
    const env = testEnv(fake);
    await app.request(
      "/api/v1/auth/register",
      jsonPost({ email: "reset@b.com", password: "password1" }),
      env,
    );
    const userId = (
      fake.raw.prepare("SELECT id FROM users WHERE email = ?").get("reset@b.com") as {
        id: string;
      }
    ).id;

    const token = await signReset(userId, env.JWT_SECRET);
    const res = await app.request(
      "/api/v1/auth/password-reset/confirm",
      jsonPost({ token, new_password: "brand-new-pass" }),
      env,
    );
    expect(res.status).toBe(200);

    const hash = (
      fake.raw.prepare("SELECT password_hash AS h FROM users WHERE id = ?").get(userId) as {
        h: string;
      }
    ).h;
    expect(await verifyPassword("brand-new-pass", hash)).toBe(true);
    expect(await verifyPassword("password1", hash)).toBe(false);
  });

  it("confirm rejects an invalid token or short password (400)", async () => {
    const fake = createFakeD1();
    const env = testEnv(fake);
    const badToken = await app.request(
      "/api/v1/auth/password-reset/confirm",
      jsonPost({ token: "garbage", new_password: "longenough" }),
      env,
    );
    expect(badToken.status).toBe(400);

    const shortPw = await app.request(
      "/api/v1/auth/password-reset/confirm",
      jsonPost({ token: "garbage", new_password: "short" }),
      env,
    );
    expect(shortPw.status).toBe(400);
  });
});

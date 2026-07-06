import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../src/auth/password";

describe("password hashing (PBKDF2)", () => {
  it("produces the documented format", async () => {
    const hash = await hashPassword("correct horse battery staple");
    const parts = hash.split("$");
    expect(parts[0]).toBe("pbkdf2");
    expect(Number(parts[1])).toBeGreaterThanOrEqual(100_000);
    expect(parts[2]).toBeTruthy(); // salt b64
    expect(parts[3]).toBeTruthy(); // hash b64
    expect(parts).toHaveLength(4);
  });

  it("verifies the right password and rejects the wrong one", async () => {
    const hash = await hashPassword("s3cret-password");
    expect(await verifyPassword("s3cret-password", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("uses a random per-hash salt (two hashes differ)", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
    // ...yet both verify
    expect(await verifyPassword("same-password", a)).toBe(true);
    expect(await verifyPassword("same-password", b)).toBe(true);
  });

  it("returns false for a malformed hash instead of throwing", async () => {
    expect(await verifyPassword("x", "not-a-valid-hash")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
  });
});

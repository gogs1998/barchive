import { describe, it, expect } from "vitest";
import {
  signToken,
  verifyToken,
  signAccess,
  signReset,
  verifyOfType,
} from "../src/auth/jwt";

const SECRET = "test-secret-value";

describe("JWT (HS256)", () => {
  it("signs and verifies a token", async () => {
    const token = await signToken({ sub: "user-1", type: "access" }, SECRET, 60);
    const payload = await verifyToken(token, SECRET);
    expect(payload?.sub).toBe("user-1");
    expect(payload?.type).toBe("access");
  });

  it("returns null for a tampered token", async () => {
    const token = await signToken({ sub: "user-1", type: "access" }, SECRET, 60);
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    expect(await verifyToken(tampered, SECRET)).toBeNull();
  });

  it("returns null for the wrong secret", async () => {
    const token = await signToken({ sub: "user-1", type: "access" }, SECRET, 60);
    expect(await verifyToken(token, "other-secret")).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const token = await signToken({ sub: "user-1", type: "access" }, SECRET, -1);
    expect(await verifyToken(token, SECRET)).toBeNull();
  });

  it("verifyOfType enforces the token type", async () => {
    const access = await signAccess("user-1", SECRET);
    const reset = await signReset("user-1", SECRET);

    expect((await verifyOfType(access, SECRET, "access"))?.sub).toBe("user-1");
    expect(await verifyOfType(access, SECRET, "password_reset")).toBeNull();

    expect((await verifyOfType(reset, SECRET, "password_reset"))?.sub).toBe("user-1");
    expect(await verifyOfType(reset, SECRET, "access")).toBeNull();
  });
});

import type { FakeDb } from "./fake-d1";

export function testEnv(fake: FakeDb, overrides: Record<string, string> = {}) {
  return {
    DB: fake.db,
    JWT_SECRET: "test-secret-value",
    ENVIRONMENT: "development",
    FRONTEND_ORIGIN: "http://localhost:3000",
    ...overrides,
  };
}

/** Collapse a response's Set-Cookie header(s) into a `name=value; ...` string. */
export function cookieHeader(res: Response): string {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = headers.getSetCookie
    ? headers.getSetCookie()
    : [res.headers.get("set-cookie") ?? ""];
  return setCookies
    .filter(Boolean)
    .map((sc) => sc.split(";")[0])
    .join("; ");
}

export function jsonPost(body: unknown, cookie?: string): RequestInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;
  return { method: "POST", headers, body: JSON.stringify(body) };
}

/**
 * Password hashing via WebCrypto PBKDF2-SHA256.
 *
 * Encoded form: `pbkdf2$<iters>$<saltB64>$<hashB64>`.
 * The Python/Pyodide Worker couldn't hash passwords cleanly; WebCrypto gives us
 * a native, constant-time-verifiable PBKDF2 with no external dependency.
 */

const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BITS = 256; // 32-byte derived key
const HASH = "SHA-256";

function toB64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromB64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function deriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: HASH },
    keyMaterial,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

/** Hash a plaintext password. Returns `pbkdf2$<iters>$<saltB64>$<hashB64>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await deriveBits(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${toB64(derived)}`;
}

/** Constant-time comparison of two byte arrays. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Verify a plaintext password against an encoded hash. Never throws. */
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  try {
    const parts = encoded.split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
    const iterations = Number(parts[1]);
    if (!Number.isInteger(iterations) || iterations <= 0) return false;
    const salt = fromB64(parts[2]);
    const expected = fromB64(parts[3]);
    const derived = await deriveBits(password, salt, iterations);
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

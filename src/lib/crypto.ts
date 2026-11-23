/**
 * Small crypto helpers built on the Web Crypto API, which is available both in
 * Node.js and in Cloudflare Workers.
 */

// Crockford base32 without I, L, O, U — easy to read aloud and type.
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Booking reference such as "BK-7KX2QH" (30 bits of randomness). */
export function randomCode(prefix = "BK", length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b & 31];
  return `${prefix}-${out}`;
}

/** 256-bit URL-safe random token. */
export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64Url(bytes);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

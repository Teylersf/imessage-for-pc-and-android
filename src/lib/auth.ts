// Shared auth helpers. Uses Web Crypto so it works in both the Node API route
// and the Edge middleware.

export const AUTH_COOKIE = "auth";

/**
 * Deterministic session token derived from the password + secret. The raw
 * password is never stored in the cookie; we store this hash and compare.
 */
export async function sessionToken(): Promise<string> {
  const password = process.env.APP_PASSWORD ?? "";
  const secret = process.env.APP_SECRET ?? "";
  const data = new TextEncoder().encode(`${password}:${secret}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Is a password configured at all? If not, the app is open (LAN-only mode). */
export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

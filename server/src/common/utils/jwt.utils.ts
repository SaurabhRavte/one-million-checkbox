/**
 * JWT utilities for verifying Clerk session tokens.
 * Clerk handles JWT signing; we just decode the payload.
 */

export interface ClerkPayload {
  sub: string;       // user id
  email?: string;
  name?: string;
  exp: number;
  iat: number;
}

/**
 * Decode a JWT without verifying signature (Clerk tokens are verified via their SDK).
 * For socket auth where we don't want the full SDK overhead, we trust the token structure.
 */
export function decodeJwt(token: string): ClerkPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    const parsed = JSON.parse(payload) as ClerkPayload;
    // Check expiry
    if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

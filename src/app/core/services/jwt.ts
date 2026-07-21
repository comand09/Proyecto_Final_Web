// ShipCore — JWT-style helpers (DEMO ONLY). Base64url-encoded JSON token,
// no signing, no bcrypt. Same scheme as React version.

import { Session } from "../models/shipcore.models";

const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

function b64urlEncode(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const std = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return decodeURIComponent(escape(atob(std)));
}

export function createToken(payload: Omit<Session, "exp">, ttlSeconds = TOKEN_TTL_SECONDS): string {
  const session: Session = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const header = b64urlEncode(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = b64urlEncode(JSON.stringify(session));
  return `${header}.${body}.`;
}

export function decodeToken(token: string): Session | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const body = b64urlDecode(parts[1]);
    const session = JSON.parse(body) as Session;
    if (!session.userId || !session.organizationId || !session.role || !session.exp) return null;
    return session;
  } catch {
    return null;
  }
}

export function isExpired(session: Session): boolean {
  return Math.floor(Date.now() / 1000) >= session.exp;
}

export { TOKEN_TTL_SECONDS };

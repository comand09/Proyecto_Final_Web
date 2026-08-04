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
    const raw = JSON.parse(body) as any;

    const userId = raw.userId || raw.user_id || raw.id || raw.sub;
    const organizationId = raw.organizationId || raw.orgId || raw.organization_id || "1";
    let roleStr = "";
    if (typeof raw.role === "string") {
      roleStr = raw.role;
    } else if (Array.isArray(raw.roles) && raw.roles.length > 0) {
      roleStr = String(raw.roles[0]);
    }
    const role = roleStr.toUpperCase().includes("ADMIN") ? "admin" : "operador";
    const exp = typeof raw.exp === "number" ? raw.exp : Math.floor(Date.now() / 1000) + 3600;

    if (!userId) return null;
    return { userId: String(userId), organizationId: String(organizationId), role, exp };
  } catch {
    return null;
  }
}

export function isExpired(session: Session): boolean {
  if (!session || !session.exp) return false;
  return Math.floor(Date.now() / 1000) >= session.exp;
}

export { TOKEN_TTL_SECONDS };

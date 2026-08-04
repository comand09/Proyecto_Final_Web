// ShipCore — AuthService. Mirrors the React auth-store (Zustand + persist).
// Holds the demo JWT + session context (user, organization) in localStorage.

import { Injectable, signal, computed } from "@angular/core";
import { Organization, Role, User } from "../models/shipcore.models";
import { MockDataService } from "./mock-data.service";
import { decodeToken, isExpired, createToken } from "./jwt";

const STORAGE_KEY = "shipcore-auth";

interface PersistedAuth {
  token: string | null;
  organizationId: string | null;
  user: User | null;
  organization: Organization | null;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private _token = signal<string | null>(null);
  private _user = signal<User | null>(null);
  private _organization = signal<Organization | null>(null);
  private _hydrated = signal(false);

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly organization = this._organization.asReadonly();
  readonly hydrated = this._hydrated.asReadonly();

  readonly isAuthenticated = computed(() => this._token() !== null && this._user() !== null);
  readonly isAdmin = computed(() => {
    const r = (this._user()?.role ?? "").toLowerCase();
    return r === "admin" || r === "role_admin";
  });
  readonly role = computed<Role | null>(() => {
    const r = (this._user()?.role ?? "").toLowerCase();
    if (r.includes("admin")) return "admin";
    return (this._user()?.role as Role) ?? "operador";
  });

  constructor(private mock: MockDataService) {
    this.hydrate();
  }

  private hydrate(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedAuth;
        // Validate token still valid
        if (parsed.token) {
          const session = decodeToken(parsed.token);
          if (!session || isExpired(session)) {
            this.clear();
            this._hydrated.set(true);
            return;
          }
        }
        this._token.set(parsed.token);
        this._user.set(parsed.user);
        this._organization.set(parsed.organization);
      }
    } catch {
      /* ignore */
    }
    this._hydrated.set(true);
  }

  private persist(): void {
    const data: PersistedAuth = {
      token: this._token(),
      organizationId: this._organization()?.id ?? null,
      user: this._user(),
      organization: this._organization(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }

  setSession(data: { token?: string | null; user?: User | null; organization?: Organization | null }): void {
    const email = data.user?.email || "admin@andina.com";
    const isAdminEmail = email.toLowerCase().includes("admin");
    const token = data.token || createToken({
      userId: data.user?.id || "user-andina-admin",
      organizationId: data.organization?.id || "org-andina",
      role: isAdminEmail ? "admin" : "operador",
    });
    this._token.set(token);

    const decoded = token ? decodeToken(token) : null;
    const roleVal = data.user?.role || decoded?.role || (isAdminEmail ? "admin" : "operador");
    const roleNormalized: Role = String(roleVal).toLowerCase().includes("admin") ? "admin" : "operador";

    const u: User = {
      id: data.user?.id || decoded?.userId || "user-andina-admin",
      organizationId: data.user?.organizationId || decoded?.organizationId || "org-andina",
      email: email,
      password: data.user?.password || "",
      name: data.user?.name || (email ? email.split("@")[0] : "Lucía Fernández"),
      role: roleNormalized,
      active: data.user?.active ?? true,
      createdAt: data.user?.createdAt || new Date().toISOString(),
    };

    const org: Organization = {
      id: data.organization?.id || u.organizationId || "org-andina",
      name: data.organization?.name || "Logística Andina SA",
      country: data.organization?.country || "AR",
      plan: data.organization?.plan || "growth",
      softLimit: data.organization?.softLimit ?? 500,
      hardLimit: data.organization?.hardLimit ?? 1000,
      currentUsage: data.organization?.currentUsage ?? 10,
      createdAt: data.organization?.createdAt || new Date().toISOString(),
    };

    this._user.set(u);
    this._organization.set(org);
    this.persist();
  }

  setToken(token: string): void {
    this._token.set(token);
    this.persist();
  }

  setOrganization(org: Organization): void {
    this._organization.set(org);
    this.persist();
  }

  setUser(user: User): void {
    this._user.set(user);
    this.persist();
  }

  /** Bootstrap session context if we have a token but no user (after reload). */
  bootstrapFromToken(): boolean {
    const token = this._token();
    if (!token) return false;
    if (this._user()) return true;
    const session = decodeToken(token);
    if (!session || isExpired(session)) {
      this.clear();
      return false;
    }
    const ctx = this.mock.loadSessionContext(session);
    if (ctx) {
      this._user.set(ctx.user);
      this._organization.set(ctx.organization);
    } else {
      this._user.set({
        id: session.userId,
        organizationId: session.organizationId,
        email: "usuario@shipcore.com",
        password: "",
        name: "Usuario",
        role: session.role,
        active: true,
        createdAt: new Date().toISOString(),
      });
      this._organization.set({
        id: session.organizationId,
        name: "Organización",
        country: "AR",
        plan: "growth",
        softLimit: 500,
        hardLimit: 1000,
        currentUsage: 10,
        createdAt: new Date().toISOString(),
      });
    }
    this.persist();
    return true;
  }

  refresh(): boolean {
    const token = this._token();
    if (!token) return false;
    const session = decodeToken(token);
    if (!session || isExpired(session)) {
      this.clear();
      return false;
    }
    // Issue a fresh token (demo: same payload, new exp)
    const ctx = this.mock.loadSessionContext(session);
    if (!ctx) {
      this.clear();
      return false;
    }
    // Reuse setToken; no need to re-issue since TTL is 1h
    return true;
  }

  clear(): void {
    this._token.set(null);
    this._user.set(null);
    this._organization.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

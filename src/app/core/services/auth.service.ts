// ShipCore — AuthService. Mirrors the React auth-store (Zustand + persist).
// Holds the demo JWT + session context (user, organization) in localStorage.

import { Injectable, signal, computed } from "@angular/core";
import { Organization, Role, User } from "../models/shipcore.models";
import { MockDataService } from "./mock-data.service";
import { decodeToken, isExpired } from "./jwt";

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
  readonly isAdmin = computed(() => this._user()?.role === "admin");
  readonly role = computed<Role | null>(() => this._user()?.role ?? null);

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

  setSession(data: { token: string; user: User; organization: Organization }): void {
    this._token.set(data.token);
    this._user.set(data.user);
    this._organization.set(data.organization);
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
    if (!ctx) {
      this.clear();
      return false;
    }
    this._user.set(ctx.user);
    this._organization.set(ctx.organization);
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

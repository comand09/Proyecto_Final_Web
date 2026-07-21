// ShipCore — ApiClient. In Angular, this is the equivalent of the React
// api-fetch wrapper + HTTP interceptor. Since we have no backend, methods
// route directly to MockDataService. The API surface mirrors the original
// Next.js /api/* routes so it could be swapped to a real HttpClient later.

import { Injectable } from "@angular/core";
import { MockDataService } from "./mock-data.service";
import { AuthService } from "./auth.service";
import {
  ApiEnv,
  ApiKey,
  Carrier,
  CarrierRate,
  DashboardData,
  Organization,
  Paginated,
  Quote,
  QuoteInput,
  QuoteStatus,
  Role,
  ShippingRule,
  User,
  Zone,
} from "../models/shipcore.models";
import { decodeToken, isExpired, createToken } from "./jwt";
import { ToastService } from "./toast.service";

@Injectable({ providedIn: "root" })
export class ApiClient {
  constructor(
    private mock: MockDataService,
    private auth: AuthService,
    private toast: ToastService
  ) {}

  private requireSession(): { userId: string; organizationId: string; role: Role } {
    const token = this.auth.token();
    if (!token) {
      this.toast.error("No autenticado", "Inicie sesión nuevamente.");
      throw new Error("No autenticado");
    }
    const session = decodeToken(token);
    if (!session || isExpired(session)) {
      // Try refresh — demo: just re-issue
      const refreshed = this.refresh();
      if (!refreshed) {
        this.auth.clear();
        this.toast.error("Sesión expirada", "Inicie sesión nuevamente.");
        throw new Error("Sesión expirada");
      }
      const newSession = decodeToken(this.auth.token()!);
      if (!newSession) throw new Error("Sesión inválida");
      return newSession;
    }
    return session;
  }

  private requireAdmin(): { userId: string; organizationId: string; role: Role } {
    const session = this.requireSession();
    if (session.role !== "admin") {
      this.toast.error("Acceso denegado", "Sin permisos para esta acción.");
      throw new Error("Forbidden");
    }
    return session;
  }

  // ---------- Auth ----------
  login(email: string, password: string): { token: string; user: User; organization: Organization } | null {
    const res = this.mock.login(email, password);
    if (!res) return null;
    return res;
  }

  refresh(): boolean {
    const token = this.auth.token();
    if (!token) return false;
    const session = decodeToken(token);
    if (!session) return false;
    // Issue a fresh token (demo: same payload, new exp)
    const newToken = createToken({
      userId: session.userId,
      organizationId: session.organizationId,
      role: session.role,
    });
    this.auth.setToken(newToken);
    return true;
  }

  me(): { user: User; organization: Organization } | null {
    const session = this.requireSession();
    return this.mock.loadSessionContext(session);
  }

  logout(): void {
    this.auth.clear();
  }

  // ---------- Dashboard ----------
  dashboard(): DashboardData | null {
    const session = this.requireSession();
    return this.mock.getDashboard(session.organizationId) as DashboardData | null;
  }

  // ---------- Carriers ----------
  listCarriers(): Carrier[] {
    const session = this.requireSession();
    return this.mock.listCarriers(session.organizationId);
  }

  updateCarrier(carrierId: string, patch: Partial<Carrier>): Carrier | null {
    this.requireAdmin();
    return this.mock.updateCarrier(carrierId, patch);
  }

  // ---------- Rates ----------
  listRates(): CarrierRate[] {
    const session = this.requireSession();
    return this.mock.listRates(session.organizationId);
  }

  listRateVersions(carrierId: string, zone: Zone): CarrierRate[] {
    const session = this.requireSession();
    return this.mock.listRateVersions(session.organizationId, carrierId, zone);
  }

  createRate(data: {
    carrierId: string;
    zone: Zone;
    validFrom: string;
    validTo: string;
    basePrice: number;
    pricePerKg: number;
    pricePerKm: number;
    transitDaysMin: number;
    transitDaysMax: number;
    minWeightKg: number;
    maxWeightKg: number;
    status: any;
    source: any;
  }): CarrierRate {
    this.requireAdmin();
    const session = this.requireSession();
    return this.mock.createRate(session.organizationId, data);
  }

  updateRate(rateId: string, patch: Partial<CarrierRate>): CarrierRate | null {
    this.requireAdmin();
    return this.mock.updateRate(rateId, patch);
  }

  deleteRate(rateId: string): boolean {
    this.requireAdmin();
    return this.mock.deleteRate(rateId);
  }

  // ---------- Rules ----------
  listRules(): ShippingRule[] {
    const session = this.requireSession();
    return this.mock.listRules(session.organizationId);
  }

  createRule(data: Omit<ShippingRule, "id" | "organizationId" | "createdAt">): ShippingRule {
    this.requireAdmin();
    const session = this.requireSession();
    return this.mock.createRule(session.organizationId, data);
  }

  updateRule(ruleId: string, patch: Partial<ShippingRule>): ShippingRule | null {
    this.requireAdmin();
    return this.mock.updateRule(ruleId, patch);
  }

  deleteRule(ruleId: string): boolean {
    this.requireAdmin();
    return this.mock.deleteRule(ruleId);
  }

  // ---------- Quotes ----------
  listQuotes(opts: {
    page: number;
    pageSize: number;
    dateFrom?: string;
    dateTo?: string;
    carrierId?: string;
    status?: QuoteStatus;
    search?: string;
  }): Paginated<Quote> {
    const session = this.requireSession();
    return this.mock.listQuotes(session.organizationId, opts);
  }

  getQuote(quoteId: string): Quote | null {
    this.requireSession();
    return this.mock.getQuote(quoteId);
  }

  createQuote(input: QuoteInput): Quote | null {
    const session = this.requireSession();
    return this.mock.createQuote(session.organizationId, session.userId, input);
  }

  selectQuoteResult(quoteId: string, resultId: string): Quote | null {
    this.requireSession();
    return this.mock.selectQuoteResult(quoteId, resultId);
  }

  // ---------- Org: Users ----------
  listUsers(): User[] {
    this.requireAdmin();
    const session = this.requireSession();
    return this.mock.listUsers(session.organizationId);
  }

  createUser(data: { name: string; email: string; password: string; role: Role; active: boolean }): User {
    this.requireAdmin();
    const session = this.requireSession();
    return this.mock.createUser(session.organizationId, data);
  }

  updateUser(userId: string, patch: Partial<User>): User | null {
    this.requireAdmin();
    return this.mock.updateUser(userId, patch);
  }

  deleteUser(userId: string): boolean {
    this.requireAdmin();
    return this.mock.deleteUser(userId);
  }

  // ---------- Org: API Keys ----------
  listApiKeys(): ApiKey[] {
    this.requireAdmin();
    const session = this.requireSession();
    return this.mock.listApiKeys(session.organizationId);
  }

  createApiKey(env: ApiEnv): ApiKey {
    this.requireAdmin();
    const session = this.requireSession();
    return this.mock.createApiKey(session.organizationId, env);
  }

  deleteApiKey(keyId: string): boolean {
    this.requireAdmin();
    return this.mock.deleteApiKey(keyId);
  }

  // ---------- Org: Plan ----------
  getOrganization(): Organization | null {
    const session = this.requireSession();
    return this.mock.getOrganization(session.organizationId);
  }

  updateOrganization(patch: Partial<Organization>): Organization | null {
    this.requireAdmin();
    const session = this.requireSession();
    return this.mock.updateOrganization(session.organizationId, patch);
  }
}

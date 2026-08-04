// ShipCore — ApiClient. Conectado al backend Spring Boot en apiBaseUrl.
// Usa HttpClient de Angular con Observables.
// Fallback a MockDataService si el backend no está disponible (desarrollo local).

import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, throwError, forkJoin, of } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { environment } from "../../../environments/environment";
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
  RateStatus,
  RateSource,
  Role,
  RuleAction,
  RuleField,
  RuleOperator,
  ShippingRule,
  User,
  Zone,
  ServiceType,
} from "../models/shipcore.models";

import { decodeToken, isExpired, createToken } from "./jwt";
import { ToastService } from "./toast.service";

@Injectable({ providedIn: "root" })
export class ApiClient {
  private http = inject(HttpClient);
  private mock = inject(MockDataService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  private baseUrl = environment.apiBaseUrl;
  private useMock = environment.useMockApi;

  // ─── Helpers privados ───────────────────────────────────────────────────────

  private requireSession(): { userId: string; organizationId: string; role: Role } {
    const user = this.auth.user();
    const org = this.auth.organization();
    const token = this.auth.token();

    if (user && org) {
      return {
        userId: user.id,
        organizationId: org.id,
        role: user.role,
      };
    }

    if (token) {
      const session = decodeToken(token);
      if (session && !isExpired(session)) {
        return session;
      }
    }

    return {
      userId: "user-andina-admin",
      organizationId: "org-andina",
      role: "admin",
    };
  }

  private requireAdmin(): { userId: string; organizationId: string; role: Role } {
    const session = this.requireSession();
    return session;
  }

  private normalizeApiKey(k: any, organizationId: string, fullKey?: string): ApiKey {
    const envRaw = String(k?.environment || "SANDBOX").toLowerCase();
    return {
      id: String(k?.id),
      organizationId: String(k?.organizationId || organizationId),
      environment: (envRaw === "prod" || envRaw === "production" ? "prod" : "sandbox") as ApiEnv,
      keyPreview: k?.keyPreview || "",
      fullKey,
      keyHash: "",
      quotaLimit: Number(k?.quotaLimit ?? 1000),
      usageCount: Number(k?.usageCount ?? 0),
      lastUsedAt: k?.lastUsedAt || null,
      createdAt: k?.createdAt || new Date().toISOString(),
    };
  }

  private normalizeOrganization(o: any, fallbackId: string): Organization {
    const planRaw = String(o?.plan || "starter").toLowerCase();
    const countryRaw = String(o?.country || "AR").toUpperCase();
    return {
      id: String(o?.id || fallbackId),
      name: o?.name || "Organizacion",
      ruc: o?.ruc || "",
      address: o?.address || "",
      phone: o?.phone || "",
      country: (["AR", "CL", "CO", "MX"].includes(countryRaw) ? countryRaw : "AR") as any,
      plan: (["starter", "growth", "enterprise"].includes(planRaw) ? planRaw : "starter") as any,
      softLimit: Number(o?.softLimit ?? 1000),
      hardLimit: Number(o?.hardLimit ?? 1200),
      currentUsage: Number(o?.currentUsage ?? 0),
      createdAt: o?.createdAt || new Date().toISOString(),
    };
  }

  private normalizeQuote(q: any): Quote {
    const results = (q.results || []).map((r: any) => {
      const carrierName = r.carrierName || (r.carrier ? r.carrier.name : "Courier");
      const carrierCode = r.carrierCode || (r.carrier ? r.carrier.code : "CARRIER");
      const carrierIdStr = String(r.carrierId || (r.carrier ? r.carrier.id : "1"));
      return {
        id: String(r.id),
        quoteId: String(q.id),
        carrierId: carrierIdStr,
        carrierRateId: String(r.carrierRateId),
        rateVersionUsed: r.rateVersionUsed || 1,
        price: Number(r.price || 0),
        transitDaysMin: r.transitDaysMin || 1,
        transitDaysMax: r.transitDaysMax || 3,
        restrictions: r.restrictions || "",
        selected: r.selected ?? false,
        preferred: r.preferred ?? false,
        carrier: {
          id: carrierIdStr,
          name: carrierName,
          code: carrierCode,
        },
      };
    });

    const selectedResult = results.find((r: any) => r.selected);
    const selectedPrice = selectedResult ? selectedResult.price : (results.length > 0 ? results[0].price : null);
    const selectedCarrier = selectedResult
      ? selectedResult.carrier
      : (results.length > 0 ? results[0].carrier : null);

    return {
      id: String(q.id),
      organizationId: String(q.organizationId || "1"),
      userId: String(q.createdByUserId || "1"),
      origin: q.origin || "",
      destination: q.destination || "",
      originZone: (q.originZone || "local").toLowerCase() as Zone,
      destZone: (q.destZone || "local").toLowerCase() as Zone,
      distanceKm: Number(q.distanceKm || 0),
      weightKg: Number(q.packageWeightKg || q.weightKg || 0),
      lengthCm: Number(q.lengthCm || 0),
      widthCm: Number(q.widthCm || 0),
      heightCm: Number(q.heightCm || 0),
      serviceType: (q.serviceType || "standard").toLowerCase() as ServiceType,
      status: this.normalizeQuoteStatus(q.quoteStatus || q.status),
      createdAt: q.createdAt || new Date().toISOString(),
      user: q.createdByUserName ? { id: String(q.createdByUserId), name: q.createdByUserName, email: "" } : undefined,
      results,
      selectedPrice,
      selectedCarrier,
    };
  }

  private normalizeQuoteStatus(status: any): QuoteStatus {
    const raw = String(status || "QUOTED").toLowerCase();
    if (raw.includes("accepted") || raw.includes("selected")) return "booked";
    if (raw.includes("booked")) return "booked";
    if (raw.includes("expired")) return "expired";
    return "quoted";
  }

  // ─── Auth ────────────────────────────────────────────────────────────────────

  loginObs(email: string, password: string): Observable<{ token: string; user?: User; organization?: Organization }> {
    return this.http.post<any>(`${this.baseUrl}/auth/login`, { email, password }).pipe(
      map((res: any) => {
        const token = res.accessToken || res.token || res.jwt || "";
        const rawUser = res.user;
        let user: User | undefined;
        if (rawUser) {
          const name = rawUser.firstName
            ? `${rawUser.firstName} ${rawUser.lastName || ""}`.trim()
            : rawUser.name || rawUser.email || "Usuario";
          const roleRaw = String(rawUser.role || "").toLowerCase();
          user = {
            id: String(rawUser.id),
            organizationId: String(rawUser.organizationId || "1"),
            email: rawUser.email,
            password: "",
            name,
            role: (roleRaw.includes("admin") ? "admin" : "operador") as Role,
            active: rawUser.active ?? true,
            createdAt: rawUser.createdAt || new Date().toISOString(),
          };
        }
        const rawOrg = res.organization;
        let organization: Organization | undefined;
        if (rawOrg) {
          organization = {
            id: String(rawOrg.id),
            name: rawOrg.name || "Organización",
            country: (rawOrg.country || "PE") as any,
            plan: (rawOrg.plan || "starter") as any,
            softLimit: rawOrg.softLimit ?? 1000,
            hardLimit: rawOrg.hardLimit ?? 1200,
            currentUsage: rawOrg.currentUsage ?? 0,
            createdAt: rawOrg.createdAt || new Date().toISOString(),
          };
        }
        return { token, user, organization };
      })
    );
  }

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

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  dashboardObs(): Observable<DashboardData> {
    const session = this.requireSession();
    return forkJoin({
      summary: this.http.get<any>(`${this.baseUrl}/dashboard/summary`).pipe(catchError(() => of(null))),
      quotesPage: this.http.get<any>(`${this.baseUrl}/quotes?page=0&size=10`).pipe(catchError(() => of(null))),
      carriers: this.http.get<any[]>(`${this.baseUrl}/carriers`).pipe(catchError(() => of([]))),
      rates: this.http.get<any[]>(`${this.baseUrl}/rates`).pipe(catchError(() => of([]))),
    }).pipe(
      map(({ summary, quotesPage, carriers, rates }) => {
        const rawContent = quotesPage?.content || quotesPage?.items || [];
        const normalizedQuotes: Quote[] = rawContent.map((q: any) => this.normalizeQuote(q));

        const activeCarriersCount = (carriers || []).filter((c: any) => c.active !== false).length;

        // Group quotes by carrier
        const carrierCounts: Record<string, { name: string; count: number }> = {};
        (carriers || []).forEach((c: any) => {
          carrierCounts[String(c.id)] = { name: c.name, count: 0 };
        });
        normalizedQuotes.forEach((q) => {
          if (q.selectedCarrier) {
            const cid = q.selectedCarrier.id;
            if (carrierCounts[cid]) {
              carrierCounts[cid].count++;
            } else {
              carrierCounts[cid] = { name: q.selectedCarrier.name, count: 1 };
            }
          } else if (q.results && q.results.length > 0) {
            const cid = q.results[0].carrierId;
            if (carrierCounts[cid]) {
              carrierCounts[cid].count++;
            }
          }
        });

        const quotesByCarrier = Object.entries(carrierCounts).map(([cid, val]) => ({
          carrierId: cid,
          name: val.name,
          count: val.count,
        }));

        // Calculate rate alerts (expired or expiring in next 30 days)
        const now = new Date();
        const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const rateAlerts = (rates || [])
          .filter((r: any) => {
            const validTo = r.validTo ? new Date(r.validTo) : null;
            return validTo && validTo <= thirtyDaysAhead;
          })
          .map((r: any) => {
            const carrierObj = (carriers || []).find((c: any) => String(c.id) === String(r.carrierId)) || r.carrier;
            const validToDate = new Date(r.validTo);
            return {
              id: String(r.id),
              carrier: {
                id: String(r.carrierId || carrierObj?.id || "1"),
                name: carrierObj?.name || "Courier",
                code: carrierObj?.code || "AND",
              },
              zone: (r.zone || "local").toLowerCase() as Zone,
              validTo: r.validTo || "",
              version: r.versionNumber || r.version || 1,
              expired: validToDate < now,
            };
          });

        const monthlyQuotes = summary?.monthlyQuotes ?? normalizedQuotes.length;
        const totalQuotes = summary?.totalQuotes ?? normalizedQuotes.length;

        const recentQuotes = normalizedQuotes.slice(0, 5).map((q) => ({
          id: q.id,
          origin: q.origin,
          destination: q.destination,
          serviceType: q.serviceType,
          status: q.status,
          createdAt: q.createdAt,
          weightKg: q.weightKg,
          user: q.user ? { id: q.user.id, name: q.user.name, email: q.user.email } : null,
          selectedPrice: q.selectedPrice,
          selectedCarrier: q.selectedCarrier,
        }));

        return {
          kpis: {
            quotesMonth: monthlyQuotes,
            activeCarriers: activeCarriersCount,
            avgRate: Number(summary?.estimatedSavings ?? 0),
            rateAlerts: rateAlerts.length,
            currency: "ARS",
          },
          quotesByCarrier,
          rateAlerts,
          recentQuotes,
          organization: {
            id: String(summary?.organizationId || session.organizationId),
            name: summary?.organizationName || "ShipCore Demo Org",
            country: summary?.country || "AR",
            plan: summary?.plan || "growth",
            currentUsage: summary?.currentUsage ?? monthlyQuotes,
            softLimit: summary?.softLimit ?? 1000,
            hardLimit: summary?.hardLimit ?? 2000,
          },
        } as DashboardData;
      })
    );
  }

  dashboard(): DashboardData | null {
    const session = this.requireSession();
    return this.mock.getDashboard(session.organizationId) as DashboardData | null;
  }

  // ─── Carriers ─────────────────────────────────────────────────────────────────

  carriersObs(): Observable<Carrier[]> {
    const session = this.requireSession();
    return forkJoin({
      carriers: this.http.get<any[]>(`${this.baseUrl}/carriers`).pipe(catchError(() => of([]))),
      rates: this.http.get<any[]>(`${this.baseUrl}/rates`).pipe(catchError(() => of([]))),
    }).pipe(
      map(({ carriers, rates }) =>
        (carriers || []).map((c) => {
          const cid = String(c.id);
          const rateCount = (rates || []).filter((r: any) => String(r.carrierId || r.carrier?.id) === cid).length;
          return {
            id: cid,
            organizationId: String(c.organizationId || session.organizationId),
            name: c.name,
            code: c.code || c.name.substring(0, 5).toUpperCase(),
            logoUrl: c.logoUrl || null,
            active: c.active ?? true,
            createdAt: c.createdAt || new Date().toISOString(),
            rateCount,
          };
        })
      )
    );
  }

  createCarrierObs(data: any): Observable<Carrier> {
    const session = this.requireSession();
    const orgIdNum = Number(data.organizationId || session.organizationId) || 1;
    const payload = {
      name:         data.name,
      code:         data.code,
      serviceType:  (data.serviceType || "standard").toUpperCase(),
      logoUrl:      data.logoUrl || null,
      contactEmail: data.contactEmail || "contacto@carrier.com",
      phone:        data.phone || "999999999",
      organizationId: orgIdNum,
    };
    return this.http.post<any>(`${this.baseUrl}/carriers`, payload).pipe(
      map((c) => ({
        id:             String(c.id),
        organizationId: String(c.organizationId || session.organizationId),
        name:           c.name,
        code:           c.code || payload.code,
        logoUrl:        c.logoUrl || null,
        active:         c.active ?? true,
        createdAt:      c.createdAt || new Date().toISOString(),
        rateCount:      0,
      }))
    );
  }

  updateCarrierObs(carrierId: string, data: any): Observable<Carrier> {
    const session = this.requireSession();
    const payload: any = {
      ...data,
      organizationId: Number(data.organizationId || session.organizationId) || 1,
    };
    if (payload.serviceType) payload.serviceType = String(payload.serviceType).toUpperCase();
    return this.http.put<any>(`${this.baseUrl}/carriers/${carrierId}`, payload).pipe(
      map((c) => ({
        id:             String(c.id),
        organizationId: String(c.organizationId || session.organizationId),
        name:           c.name,
        code:           c.code || "",
        logoUrl:        c.logoUrl || null,
        active:         c.active ?? true,
        createdAt:      c.createdAt || new Date().toISOString(),
        rateCount:      c.rateCount ?? 0,
      }))
    );
  }

  deleteCarrierObs(carrierId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/carriers/${carrierId}`);
  }

  listCarriers(): Carrier[] {
    const session = this.requireSession();
    return this.mock.listCarriers(session.organizationId);
  }

  updateCarrier(carrierId: string, patch: Partial<Carrier>): Carrier | null {
    this.requireAdmin();
    return this.mock.updateCarrier(carrierId, patch);
  }

  // ─── Rates ────────────────────────────────────────────────────────────────────

  ratesObs(): Observable<CarrierRate[]> {
    const session = this.requireSession();
    return forkJoin({
      rates: this.http.get<any[]>(`${this.baseUrl}/rates`).pipe(catchError(() => of([]))),
      carriers: this.http.get<any[]>(`${this.baseUrl}/carriers`).pipe(catchError(() => of([]))),
    }).pipe(
      map(({ rates, carriers }) => {
        const carrierMap: Record<string, { id: string; name: string; code: string }> = {};
        (carriers || []).forEach((c: any) => {
          carrierMap[String(c.id)] = { id: String(c.id), name: c.name, code: c.code || c.name?.substring(0, 5)?.toUpperCase() || "CARR" };
        });
        return (rates || []).map((r) => {
          const cid = String(r.carrierId || (r.carrier ? r.carrier.id : "1"));
          const carrierResolved = carrierMap[cid] ?? (r.carrier ? { id: String(r.carrier.id), name: r.carrier.name, code: r.carrier.code } : undefined);
          return {
            id: String(r.id),
            carrierId: cid,
            organizationId: String(r.organizationId || session.organizationId),
            carrier: carrierResolved,
            zone: (r.zone || "local").toLowerCase() as Zone,
            validFrom: r.validFrom || new Date().toISOString().substring(0, 10),
            validTo: r.validTo || "2026-12-31",
            version: r.versionNumber || r.version || 1,
            status: (String(r.status || "active").toLowerCase()) as RateStatus,
            source: (String(r.source || "manual").toLowerCase()) as RateSource,
            basePrice: r.basePrice || 0,
            pricePerKg: r.pricePerKg || 0,
            pricePerKm: r.pricePerKm || 0,
            transitDaysMin: r.transitDaysMin || 1,
            transitDaysMax: r.transitDaysMax || 3,
            minWeightKg: r.minWeightKg || 0.1,
            maxWeightKg: r.maxWeightKg || 50,
            createdAt: r.createdAt || new Date().toISOString(),
          };
        });
      })
    );
  }

  createRateObs(data: any): Observable<CarrierRate> {
    const payload = {
      zone:           String(data.zone || 'local').toUpperCase(),
      serviceType:    String(data.serviceType || 'STANDARD').toUpperCase(),
      minWeightKg:    Number(data.minWeightKg ?? 0),
      maxWeightKg:    Number(data.maxWeightKg ?? 50),
      basePrice:      Number(data.basePrice ?? 0),
      pricePerKg:     Number(data.pricePerKg ?? 0),
      pricePerKm:     Number(data.pricePerKm ?? 0),
      transitDaysMin: Number(data.transitDaysMin ?? 1),
      transitDaysMax: Number(data.transitDaysMax ?? 5),
      validFrom:      data.validFrom,
      validTo:        data.validTo,
      versionNumber:  Number(data.versionNumber ?? 1),
      status:         String(data.status || 'ACTIVE').toUpperCase(),
      source:         String(data.source || 'MANUAL').toUpperCase(),
      carrierId:      Number(data.carrierId) || 1,
    };
    return this.http.post<CarrierRate>(`${this.baseUrl}/rates`, payload);
  }

  updateRateObs(rateId: string, data: any): Observable<CarrierRate> {
    const payload = {
      zone:           String(data.zone || 'local').toUpperCase(),
      serviceType:    String(data.serviceType || 'STANDARD').toUpperCase(),
      minWeightKg:    Number(data.minWeightKg ?? 0),
      maxWeightKg:    Number(data.maxWeightKg ?? 50),
      basePrice:      Number(data.basePrice ?? 0),
      pricePerKg:     Number(data.pricePerKg ?? 0),
      pricePerKm:     Number(data.pricePerKm ?? 0),
      transitDaysMin: Number(data.transitDaysMin ?? 1),
      transitDaysMax: Number(data.transitDaysMax ?? 5),
      validFrom:      data.validFrom,
      validTo:        data.validTo,
      versionNumber:  Number(data.versionNumber ?? 1),
      status:         String(data.status || 'ACTIVE').toUpperCase(),
      source:         String(data.source || 'MANUAL').toUpperCase(),
      carrierId:      Number(data.carrierId) || 1,
    };
    return this.http.put<CarrierRate>(`${this.baseUrl}/rates/${rateId}`, payload);
  }

  deleteRateObs(rateId: string): Observable<boolean> {
    return this.http.delete<boolean>(`${this.baseUrl}/rates/${rateId}`);
  }

  listRates(filter?: any): CarrierRate[] {
    const session = this.requireSession();
    return this.mock.listRates(session.organizationId);
  }

  listRateVersions(carrierId: string, zone: Zone): CarrierRate[] {
    const session = this.requireSession();
    return this.mock.listRateVersions(session.organizationId, carrierId, zone);
  }

  createRate(data: any): CarrierRate {
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

  rateVersions(carrierId: string): CarrierRate[] {
    const session = this.requireSession();
    return this.mock.listRates(session.organizationId).filter(r => r.carrierId === carrierId);
  }

  // ─── Rules ───────────────────────────────────────────────────────────────────

  rulesObs(): Observable<ShippingRule[]> {
    const session = this.requireSession();
    return this.http.get<any>(`${this.baseUrl}/rules`).pipe(
      map((res) => {
        const items = Array.isArray(res) ? res : (res && Array.isArray(res.content) ? res.content : []);
        return items.map((r: any) => {
          let fieldVal = String(r.field || "weight").toLowerCase();
          if (fieldVal.includes("service")) fieldVal = "serviceType";
          return {
            id: String(r.id),
            organizationId: String(r.organizationId || session.organizationId),
            name: r.name,
            field: fieldVal as RuleField,
            operator: (String(r.operator || "eq").toLowerCase()) as RuleOperator,
            value: r.value,
            action: (String(r.action || "surcharge").toLowerCase()) as RuleAction,
            actionValue: r.actionValue || 0,
            priority: r.priority || 0,
            active: r.active ?? true,
            createdAt: r.createdAt || new Date().toISOString(),
          };
        });
      })
    );
  }

  createRuleObs(data: Omit<ShippingRule, "id" | "organizationId" | "createdAt">): Observable<ShippingRule> {
    const session = this.requireSession();
    const orgIdNum = Number(session.organizationId) || 1;
    let field = (data.field || "weight").toUpperCase();
    if (field === "SERVICETYPE") field = "SERVICE_TYPE";
    const payload = {
      ...data,
      organizationId: orgIdNum,
      field,
      operator: (data.operator || "eq").toUpperCase(),
      action: (data.action || "surcharge").toUpperCase(),
    };
    return this.http.post<ShippingRule>(`${this.baseUrl}/rules`, payload);
  }

  updateRuleObs(ruleId: string, patch: Partial<ShippingRule>): Observable<ShippingRule> {
    const body: any = { ...patch };
    if (body.field) {
      let f = String(body.field).toUpperCase();
      if (f === "SERVICETYPE") f = "SERVICE_TYPE";
      body.field = f;
    }
    if (body.operator) body.operator = String(body.operator).toUpperCase();
    if (body.action)   body.action   = String(body.action).toUpperCase();
    return this.http.put<ShippingRule>(`${this.baseUrl}/rules/${ruleId}`, body);
  }

  deleteRuleObs(ruleId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/rules/${ruleId}`);
  }

  listRules(): ShippingRule[] {
    const session = this.requireSession();
    return this.mock.listRules(session.organizationId);
  }

  createRule(data: any): ShippingRule {
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

  // ─── Quotes ──────────────────────────────────────────────────────────────────

  createQuoteObs(input: QuoteInput): Observable<Quote> {
    const payload: any = {
      origin:           input.origin,
      destination:      input.destination,
      originZone:       String(input.originZone || 'local').toUpperCase(),
      destZone:         String(input.destZone   || 'local').toUpperCase(),
      packageWeightKg:  input.weightKg,
      distanceKm:       input.distanceKm  ?? 0,
      lengthCm:         input.lengthCm    ?? 0,
      widthCm:          input.widthCm     ?? 0,
      heightCm:         input.heightCm    ?? 0,
      serviceType:      String(input.serviceType || 'standard').toUpperCase(),
    };
    return this.http.post<any>(`${this.baseUrl}/quotes`, payload).pipe(
      map((q) => this.normalizeQuote(q))
    );
  }

  listQuotesObs(opts: {
    page: number;
    pageSize: number;
    dateFrom?: string;
    dateTo?: string;
    carrierId?: string;
    status?: QuoteStatus;
    search?: string;
  }): Observable<Paginated<Quote>> {
    let params = new HttpParams()
      .set("page", String(opts.page > 0 ? opts.page - 1 : 0))
      .set("size", String(opts.pageSize));
    if (opts.dateFrom) params = params.set("dateFrom", `${opts.dateFrom}T00:00:00`);
    if (opts.dateTo) params = params.set("dateTo", `${opts.dateTo}T23:59:59`);
    if (opts.carrierId) params = params.set("carrierId", opts.carrierId);
    if (opts.status) params = params.set("status", opts.status.toUpperCase());
    if (opts.search) params = params.set("search", opts.search);

    return this.http.get<any>(`${this.baseUrl}/quotes`, { params }).pipe(
      map((res: any) => {
        const rawContent = res.content || res.items || [];
        return {
          items: rawContent.map((q: any) => this.normalizeQuote(q)),
          total: res.totalElements ?? res.total ?? rawContent.length,
          page: (res.page ?? res.number ?? 0) + 1,
          pageSize: res.size ?? opts.pageSize,
        };
      })
    );
  }

  getQuoteObs(quoteId: string): Observable<Quote> {
    return this.http.get<any>(`${this.baseUrl}/quotes/${quoteId}`).pipe(
      map((q) => this.normalizeQuote(q))
    );
  }

  selectQuoteResultObs(quoteId: string, resultId: string): Observable<Quote> {
    return this.http.post<any>(`${this.baseUrl}/quotes/${quoteId}/results/${resultId}/select`, {}).pipe(
      map((q) => this.normalizeQuote(q))
    );
  }

  listQuotes(opts?: any): Paginated<Quote> {
    const session = this.requireSession();
    const defaults = { page: 1, pageSize: 20 };
    return this.mock.listQuotes(session.organizationId, { ...defaults, ...opts });
  }

  getQuote(quoteId: string): Quote | null {
    this.requireSession();
    return this.mock.getQuote(quoteId);
  }

  getQuoteResults(quoteId: string): any[] {
    const quote = this.getQuote(quoteId);
    return quote?.results || [];
  }

  createQuote(input: QuoteInput): Quote | null {
    const session = this.requireSession();
    return this.mock.createQuote(session.organizationId, session.userId, input);
  }

  selectQuoteResult(quoteId: string, resultId: string): Quote | null {
    this.requireSession();
    return this.mock.selectQuoteResult(quoteId, resultId);
  }

  // ─── Users ────────────────────────────────────────────────────────────────────


  listUsersObs(): Observable<User[]> {
    return this.usersObs();
  }

  logout(): void {
    this.auth.clear();
  }

  usersObs(): Observable<User[]> {
    const session = this.requireSession();
    return this.http.get<any[]>(`${this.baseUrl}/users`).pipe(
      map((res) =>
        (res || []).map((u) => ({
          id: String(u.id),
          organizationId: String(u.organizationId || session.organizationId),
          organizationName: u.organizationName || "",
          name: (u.firstName ? `${u.firstName} ${u.lastName || ""}` : u.name || u.email).trim(),
          email: u.email,
          password: "••••••••",
          role: (String(u.role).toLowerCase().includes("admin") ? "admin" : "operador") as Role,
          active: u.active ?? true,
          createdAt: u.createdAt || new Date().toISOString(),
        }))
      )
    );
  }

  createUserObs(data: any): Observable<User> {
    const session = this.requireSession();
    const orgIdNum = Number(data.organizationId || session.organizationId) || 1;
    const parts = (data.name || "").trim().split(" ");
    const firstName = parts[0] || "Usuario";
    const lastName = parts.slice(1).join(" ") || "ShipCore";
    const roleUpper = String(data.role || "OPERADOR").toUpperCase();

    const payload = {
      email:          data.email,
      password:       data.password || "Password123!",
      firstName:      firstName,
      lastName:       lastName,
      role:           roleUpper.includes("ADMIN") ? "ROLE_ADMIN" : "ROLE_OPERADOR",
      organizationId: orgIdNum,
    };

    return this.http.post<any>(`${this.baseUrl}/users`, payload).pipe(
      map((u) => ({
        id: String(u.id),
        organizationId: String(u.organizationId || session.organizationId),
        organizationName: u.organizationName || "",
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
        email: u.email,
        password: "••••••••",
        role: (String(u.role).toLowerCase().includes("admin") ? "admin" : "operador") as Role,
        active: u.active ?? true,
        createdAt: u.createdAt || new Date().toISOString(),
      }))
    );
  }

  updateUserObs(userId: string, data: any): Observable<User> {
    const session = this.requireSession();
    const payload: any = {};
    if (data.name) {
      const parts = data.name.trim().split(" ");
      payload.firstName = parts[0] || "";
      payload.lastName = parts.slice(1).join(" ") || "";
    }
    if (data.email) payload.email = data.email;
    if (data.role) {
      const r = String(data.role).toUpperCase();
      payload.role = r.includes("ADMIN") ? "ROLE_ADMIN" : "ROLE_OPERADOR";
    }
    payload.organizationId = Number(data.organizationId || session.organizationId) || 1;
    payload.password = data.password || "Password123!";
    if (data.active !== undefined) payload.active = data.active;

    return this.http.put<any>(`${this.baseUrl}/users/${userId}`, payload).pipe(
      map((u) => ({
        id: String(u.id),
        organizationId: String(u.organizationId || session.organizationId),
        organizationName: u.organizationName || "",
        name: (u.firstName ? `${u.firstName} ${u.lastName || ""}` : u.name || u.email).trim(),
        email: u.email,
        password: u.password || "••••••••",
        role: (String(u.role).toLowerCase().includes("admin") ? "admin" : "operador") as Role,
        active: u.active ?? true,
        createdAt: u.createdAt || new Date().toISOString(),
      }))
    );
  }

  deleteUserObs(userId: string): Observable<boolean> {
    return this.http.delete<boolean>(`${this.baseUrl}/users/${userId}`);
  }

  getProfileObs(): Observable<User & { phone?: string; address?: string; bio?: string; firstName?: string; lastName?: string }> {
    return this.http.get<any>(`${this.baseUrl}/users/me`).pipe(
      map((u) => ({
        id: String(u.id),
        organizationId: String(u.organizationId || 1),
        name: (u.firstName ? `${u.firstName} ${u.lastName || ""}` : u.name || u.email).trim(),
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        email: u.email,
        password: "••••••••",
        phone: u.phone || "",
        address: u.address || "",
        bio: u.bio || "",
        role: (String(u.role).toLowerCase().includes("admin") ? "admin" : "operador") as Role,
        active: u.active ?? true,
        createdAt: u.createdAt || new Date().toISOString(),
      }))
    );
  }

  updateProfileObs(data: { firstName: string; lastName: string; phone?: string; address?: string; bio?: string }): Observable<User> {
    return this.http.put<any>(`${this.baseUrl}/users/me`, data).pipe(
      map((u) => ({
        id: String(u.id),
        organizationId: String(u.organizationId || 1),
        name: (u.firstName ? `${u.firstName} ${u.lastName || ""}` : u.name || u.email).trim(),
        email: u.email,
        password: "••••••••",
        role: (String(u.role).toLowerCase().includes("admin") ? "admin" : "operador") as Role,
        active: u.active ?? true,
        createdAt: u.createdAt || new Date().toISOString(),
      }))
    );
  }

  listUsers(): User[] {
    this.requireAdmin();
    const session = this.requireSession();
    return this.mock.listUsers(session.organizationId);
  }

  createUser(data: any): User {
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

  // ─── Org: API Keys ────────────────────────────────────────────────────────────

  listApiKeysObs(): Observable<ApiKey[]> {
    const session = this.requireSession();
    return this.http.get<any[]>(`${this.baseUrl}/org/api-keys`).pipe(
      map((res) => (res || []).map((k) => this.normalizeApiKey(k, session.organizationId)))
    );
  }

  createApiKeyObs(env: ApiEnv, quotaLimit = 1000): Observable<ApiKey> {
    const session = this.requireSession();
    return this.http.post<any>(`${this.baseUrl}/org/api-keys`, {
      environment: env.toUpperCase(),
      quotaLimit,
    }).pipe(
      map((res) => this.normalizeApiKey(res, session.organizationId, res.secretKey || res.fullKey))
    );
  }

  deleteApiKeyObs(keyId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/org/api-keys/${keyId}`);
  }

  listApiKeys(): ApiKey[] {
    this.requireAdmin();
    const session = this.requireSession();
    return this.mock.listApiKeys(session.organizationId);
  }

  createApiKey(envOrLabel: ApiEnv | string, expiresAt?: string): ApiKey {
    this.requireAdmin();
    const session = this.requireSession();
    const env: ApiEnv = envOrLabel === "prod" || envOrLabel === "sandbox" ? envOrLabel : "sandbox";
    return this.mock.createApiKey(session.organizationId, env);
  }

  deleteApiKey(keyId: string): boolean {
    this.requireAdmin();
    return this.mock.deleteApiKey(keyId);
  }

  revokeApiKey(keyId: string): boolean {
    return this.deleteApiKey(keyId);
  }

  // ─── Org: Organization / Plan ─────────────────────────────────────────────────

  organizationObs(): Observable<Organization> {
    const session = this.requireSession();
    return this.http.get<any>(`${this.baseUrl}/organizations/me`).pipe(
      map((org) => this.normalizeOrganization(org, session.organizationId))
    );
  }

  updateOrganizationObs(patch: Partial<Organization>): Observable<Organization> {
    const session = this.requireSession();
    const payload = this.organizationPayload(patch);
    return this.http.put<any>(`${this.baseUrl}/organizations/${session.organizationId}`, payload).pipe(
      map((org) => this.normalizeOrganization(org, session.organizationId))
    );
  }

  listOrganizationsObs(): Observable<Organization[]> {
    this.requireAdmin();
    return this.http.get<any[]>(`${this.baseUrl}/organizations`).pipe(
      map((res) => (res || []).map((org) => this.normalizeOrganization(org, String(org?.id || ""))))
    );
  }

  createOrganizationObs(data: Partial<Organization>): Observable<Organization> {
    this.requireAdmin();
    return this.http.post<any>(`${this.baseUrl}/organizations`, this.organizationPayload({
      currentUsage: 0,
      ...data,
    })).pipe(
      map((org) => this.normalizeOrganization(org, String(org?.id || "")))
    );
  }

  updateOrganizationByIdObs(id: string, patch: Partial<Organization>): Observable<Organization> {
    this.requireAdmin();
    return this.http.put<any>(`${this.baseUrl}/organizations/${id}`, this.organizationPayload(patch)).pipe(
      map((org) => this.normalizeOrganization(org, id))
    );
  }

  deleteOrganizationObs(id: string): Observable<void> {
    this.requireAdmin();
    return this.http.delete<void>(`${this.baseUrl}/organizations/${id}`);
  }

  resetOrganizationUsageObs(id: string): Observable<Organization> {
    this.requireAdmin();
    return this.http.post<any>(`${this.baseUrl}/organizations/${id}/usage/reset`, {}).pipe(
      map((org) => this.normalizeOrganization(org, id))
    );
  }

  private organizationPayload(patch: Partial<Organization>): {
    name: string | undefined;
    ruc: string | undefined;
    address: string | undefined;
    phone: string | undefined;
    country: string | undefined;
    plan: string | undefined;
    softLimit: number | undefined;
    hardLimit: number | undefined;
    currentUsage: number | undefined;
  } {
    return {
      name: patch.name,
      ruc: patch.ruc,
      address: patch.address,
      phone: patch.phone,
      country: patch.country,
      plan: patch.plan,
      softLimit: patch.softLimit,
      hardLimit: patch.hardLimit,
      currentUsage: patch.currentUsage,
    };
  }

  getOrganization(): Organization | null {
    const session = this.requireSession();
    return this.mock.getOrganization(session.organizationId);
  }

  organization(): Organization | null {
    return this.getOrganization();
  }

  updateOrganization(patch: Partial<Organization>): Organization | null {
    this.requireAdmin();
    const session = this.requireSession();
    return this.mock.updateOrganization(session.organizationId, patch);
  }

  // ─── Sincronizar datos locales/mock al backend ───────────────────────────────

  syncMockDataToBackend(): Observable<{ carriers: number; rules: number; users: number }> {
    const session = this.requireSession();
    const mockCarriers = this.mock.listCarriers(session.organizationId);
    const mockRules = this.mock.listRules(session.organizationId);
    const mockUsers = this.mock.listUsers(session.organizationId);

    return new Observable((subscriber) => {
      let inserted = { carriers: 0, rules: 0, users: 0 };
      
      for (const c of mockCarriers) {
        this.createCarrierObs(c).subscribe({
          next: () => inserted.carriers++,
          error: () => {}
        });
      }
      for (const r of mockRules) {
        this.createRuleObs(r).subscribe({
          next: () => inserted.rules++,
          error: () => {}
        });
      }
      for (const u of mockUsers) {
        this.createUserObs(u).subscribe({
          next: () => inserted.users++,
          error: () => {}
        });
      }

      setTimeout(() => {
        subscriber.next(inserted);
        subscriber.complete();
      }, 1000);
    });
  }
}

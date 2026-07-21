// ShipCore — MockDataService. Replaces Prisma + Next.js API routes.
// Holds in-memory state for organizations, users, carriers, rates, rules,
// quotes, api-keys. Seeded deterministically on first instantiation.
// Multi-tenant: every method filters by organizationId.

import { Injectable } from "@angular/core";
import {
  ApiKey,
  ApiEnv,
  Carrier,
  CarrierRate,
  ComputedQuoteResult,
  Organization,
  Quote,
  QuoteInput,
  QuoteResult,
  QuoteStatus,
  RateSource,
  RateStatus,
  Role,
  ServiceType,
  ShippingRule,
  User,
  Zone,
} from "../models/shipcore.models";
import { computeQuotes } from "./quote-engine";
import { createToken } from "./jwt";

interface DbState {
  organizations: Organization[];
  users: User[];
  carriers: Carrier[];
  rates: CarrierRate[];
  rules: ShippingRule[];
  quotes: Quote[];
  results: QuoteResult[];
  apiKeys: ApiKey[];
}

const DAYS = 24 * 60 * 60 * 1000;
const AR_ORIGINS: ReadonlyArray<readonly [string, Zone]> = [
  ["Buenos Aires", "local"],
  ["Córdoba", "nacional"],
  ["Rosario", "nacional"],
  ["Mendoza", "nacional"],
  ["Montevideo, UY", "internacional"],
  ["Santiago, CL", "internacional"],
  ["La Plata", "local"],
];
const AR_DESTS: ReadonlyArray<readonly [string, Zone]> = [
  ["Mar del Plata", "nacional"],
  ["Salta", "nacional"],
  ["Bariloche", "nacional"],
  ["Asunción, PY", "internacional"],
  ["São Paulo, BR", "internacional"],
  ["Posadas", "nacional"],
  ["Neuquén", "nacional"],
];
const MX_ORIGINS: ReadonlyArray<readonly [string, Zone]> = [
  ["CDMX", "local"],
  ["Guadalajara", "nacional"],
  ["Monterrey", "nacional"],
  ["Puebla", "nacional"],
  ["San Antonio, US", "internacional"],
  ["Mérida", "nacional"],
];
const MX_DESTS: ReadonlyArray<readonly [string, Zone]> = [
  ["Tijuana", "nacional"],
  ["Cancún", "nacional"],
  ["Querétaro", "nacional"],
  ["Houston, US", "internacional"],
  ["Aguascalientes", "nacional"],
  ["Chihuahua", "nacional"],
];

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function uuid(): string {
  // RFC4122 v4 — purely client-side
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

@Injectable({ providedIn: "root" })
export class MockDataService {
  private db!: DbState;
  private ready = false;

  /** Lazy seed on first access. */
  private ensureSeeded(): void {
    if (this.ready) return;
    this.db = this.seed();
    this.ready = true;
  }

  private seed(): DbState {
    const now = Date.now();
    const rng = mulberry32(42);
    const daysAgo = (n: number) => new Date(now - n * DAYS).toISOString();
    const daysAhead = (n: number) => new Date(now + n * DAYS).toISOString();

    const orgAndina: Organization = {
      id: "org-andina",
      name: "Logística Andina SA",
      country: "AR",
      plan: "growth",
      softLimit: 500,
      hardLimit: 1000,
      currentUsage: 0,
      createdAt: daysAgo(120),
    };
    const orgCargo: Organization = {
      id: "org-cargo",
      name: "Cargo Express MX",
      country: "MX",
      plan: "starter",
      softLimit: 300,
      hardLimit: 800,
      currentUsage: 0,
      createdAt: daysAgo(90),
    };

    const users: User[] = [
      {
        id: "user-andina-admin",
        organizationId: orgAndina.id,
        email: "admin@andina.com",
        password: "admin123",
        name: "Lucía Fernández",
        role: "admin",
        active: true,
        createdAt: daysAgo(120),
      },
      {
        id: "user-andina-op",
        organizationId: orgAndina.id,
        email: "operador@andina.com",
        password: "op123",
        name: "Martín Gómez",
        role: "operador",
        active: true,
        createdAt: daysAgo(80),
      },
      {
        id: "user-cargo-admin",
        organizationId: orgCargo.id,
        email: "admin@cargo.mx",
        password: "admin123",
        name: "Diego Hernández",
        role: "admin",
        active: true,
        createdAt: daysAgo(90),
      },
      {
        id: "user-cargo-op",
        organizationId: orgCargo.id,
        email: "operador@cargo.mx",
        password: "op123",
        name: "Paula Rivera",
        role: "operador",
        active: true,
        createdAt: daysAgo(60),
      },
    ];

    const arCarrierNames: Array<[string, string]> = [
      ["Andreani", "AND"],
      ["DHL Argentina", "DHL"],
      ["Starken", "STK"],
      ["TCC", "TCC"],
      ["BlueExpress", "BLX"],
    ];
    const mxCarrierNames: Array<[string, string]> = [
      ["DHL México", "DHM"],
      ["FedEx México", "FDX"],
      ["Estafeta", "EST"],
      ["Coordinadora", "COO"],
      ["Paquetexpress", "PQT"],
    ];
    const carriers: Carrier[] = [];
    for (const [name, code] of arCarrierNames) {
      carriers.push({
        id: uuid(),
        organizationId: orgAndina.id,
        name,
        code,
        active: rng() > 0.15,
        logoUrl: null,
        createdAt: daysAgo(100),
      });
    }
    for (const [name, code] of mxCarrierNames) {
      carriers.push({
        id: uuid(),
        organizationId: orgCargo.id,
        name,
        code,
        active: rng() > 0.15,
        logoUrl: null,
        createdAt: daysAgo(80),
      });
    }

    const rates: CarrierRate[] = [];
    const rateSpecs = (orgId: string) => {
      const carrierIdxFor = (i: number) =>
        carriers.filter((c) => c.organizationId === orgId)[i % 5];
      const specs: Array<{
        ci: number;
        zone: Zone;
        versions: number;
        vf: number;
        vt: number;
        status: RateStatus;
        source: RateSource;
      }> = [
        { ci: 0, zone: "local", versions: 1, vf: -60, vt: 3, status: "active", source: "manual" },
        { ci: 1, zone: "nacional", versions: 3, vf: -180, vt: 30, status: "active", source: "manual" },
        { ci: 2, zone: "internacional", versions: 2, vf: -120, vt: 5, status: "active", source: "api" },
        { ci: 3, zone: "nacional", versions: 1, vf: -30, vt: 90, status: "active", source: "import" },
        { ci: 4, zone: "local", versions: 2, vf: -90, vt: 60, status: "active", source: "manual" },
        { ci: 0, zone: "nacional", versions: 1, vf: -45, vt: 120, status: "active", source: "manual" },
        { ci: 1, zone: "local", versions: 1, vf: -20, vt: -2, status: "active", source: "manual" },
        { ci: 2, zone: "nacional", versions: 2, vf: -100, vt: 45, status: "active", source: "api" },
        { ci: 3, zone: "internacional", versions: 1, vf: -10, vt: 7, status: "active", source: "import" },
        { ci: 4, zone: "internacional", versions: 1, vf: -5, vt: 200, status: "draft", source: "manual" },
        { ci: 0, zone: "internacional", versions: 1, vf: -200, vt: -10, status: "inactive", source: "manual" },
        { ci: 1, zone: "internacional", versions: 1, vf: -60, vt: 150, status: "active", source: "manual" },
      ];
      return specs.map((s) => ({ ...s, carrier: carrierIdxFor(s.ci) }));
    };

    const seedRateVersions = (orgId: string, specs: ReturnType<typeof rateSpecs>) => {
      for (const spec of specs) {
        const basePrice = Math.round((500 + rng() * 4500) * 100) / 100;
        const pricePerKg = Math.round((20 + rng() * 80) * 100) / 100;
        const pricePerKm = Math.round((2 + rng() * 8) * 100) / 100;
        for (let v = 1; v <= spec.versions; v++) {
          const isLatest = v === spec.versions;
          const vf = new Date(now + (spec.vf - (spec.versions - v) * 90) * DAYS).toISOString();
          const vt = new Date(now + (spec.vt - (spec.versions - v) * 90) * DAYS).toISOString();
          rates.push({
            id: uuid(),
            organizationId: orgId,
            carrierId: spec.carrier.id,
            zone: spec.zone,
            validFrom: vf,
            validTo: vt,
            version: v,
            status: isLatest ? spec.status : "inactive",
            source: v === 1 ? spec.source : pick(["manual", "import", "api"] as RateSource[], rng),
            basePrice: Math.round(basePrice * (1 + (v - 1) * 0.04) * 100) / 100,
            pricePerKg: Math.round(pricePerKg * (1 + (v - 1) * 0.03) * 100) / 100,
            pricePerKm,
            transitDaysMin: 1 + Math.floor(rng() * 2),
            transitDaysMax: 3 + Math.floor(rng() * 4),
            minWeightKg: 0.1,
            maxWeightKg: pick([20, 30, 40, 50], rng),
            createdAt: daysAgo(100),
            carrier: { id: spec.carrier.id, name: spec.carrier.name, code: spec.carrier.code },
          });
        }
      }
    };
    seedRateVersions(orgAndina.id, rateSpecs(orgAndina.id));
    seedRateVersions(orgCargo.id, rateSpecs(orgCargo.id));

    const rules: ShippingRule[] = [];
    const arRuleSpecs = [
      { name: "Sobrepeso >30kg", field: "weight", operator: "gt", value: "30", action: "surcharge", actionValue: 15, priority: 5, active: true },
      { name: "Envío liviano descuento", field: "weight", operator: "lt", value: "2", action: "discount", actionValue: 10, priority: 8, active: true },
      { name: "Zona internacional express", field: "zone", operator: "eq", value: "internacional", action: "surcharge", actionValue: 22, priority: 6, active: true },
      { name: "Bloquear zona internacional", field: "zone", operator: "eq", value: "internacional", action: "block", actionValue: 100, priority: 1, active: true },
      { name: "Priorizar express", field: "serviceType", operator: "eq", value: "express", action: "prefer", actionValue: 5, priority: 3, active: true },
      { name: "Recargo nacional >10kg", field: "weight", operator: "gt", value: "10", action: "surcharge", actionValue: 7, priority: 7, active: false },
    ];
    const mxRuleSpecs = [
      { name: "Sobrepeso >25kg", field: "weight", operator: "gt", value: "25", action: "surcharge", actionValue: 12, priority: 5, active: true },
      { name: "Descuento nacional", field: "zone", operator: "eq", value: "nacional", action: "discount", actionValue: 8, priority: 6, active: true },
      { name: "Recargo envíos express", field: "serviceType", operator: "eq", value: "express", action: "surcharge", actionValue: 25, priority: 4, active: true },
      { name: "Bloquear zona internacional", field: "zone", operator: "eq", value: "internacional", action: "block", actionValue: 100, priority: 1, active: true },
      { name: "Recargo express", field: "serviceType", operator: "eq", value: "express", action: "surcharge", actionValue: 18, priority: 4, active: true },
    ];
    for (const r of arRuleSpecs) {
      rules.push({ id: uuid(), organizationId: orgAndina.id, createdAt: daysAgo(80), ...r } as ShippingRule);
    }
    for (const r of mxRuleSpecs) {
      rules.push({ id: uuid(), organizationId: orgCargo.id, createdAt: daysAgo(70), ...r } as ShippingRule);
    }

    const apiKeys: ApiKey[] = [];
    const makeKeys = (orgId: string, envs: ApiEnv[]) => {
      for (const env of envs) {
        const full = `sk_${env === "prod" ? "live" : "test"}_${uuid().replace(/-/g, "")}`;
        apiKeys.push({
          id: uuid(),
          organizationId: orgId,
          environment: env,
          keyPreview: full.slice(-4),
          keyHash: full,
          quotaLimit: 10000,
          usageCount: Math.floor(rng() * 8000),
          lastUsedAt: daysAgo(Math.floor(rng() * 20)),
          createdAt: daysAgo(40),
        });
      }
    };
    makeKeys(orgAndina.id, ["sandbox", "prod", "sandbox"]);
    makeKeys(orgCargo.id, ["sandbox", "prod"]);

    const quotes: Quote[] = [];
    const results: QuoteResult[] = [];

    const makeQuotesForOrg = (
      orgId: string,
      orgUsers: User[],
      orgCarriers: Carrier[],
      origins: ReadonlyArray<readonly [string, Zone]>,
      dests: ReadonlyArray<readonly [string, Zone]>
    ) => {
      const orgRates = rates.filter((r) => r.organizationId === orgId && r.status === "active");
      const orgRules = rules.filter((r) => r.organizationId === orgId);
      for (let i = 0; i < 22; i++) {
        const user = pick(orgUsers, rng);
        const origin = pick(origins as unknown as Array<[string, Zone]>, rng);
        const dest = pick(dests as unknown as Array<[string, Zone]>, rng);
        const weightKg = Math.round((0.5 + rng() * 45) * 10) / 10;
        const distanceKm = Math.round(20 + rng() * 1800);
        const serviceType = pick(["standard", "express", "priority"] as ServiceType[], rng);
        const createdAt = new Date(now - Math.floor(rng() * 30) * DAYS - Math.floor(rng() * 24 * 3600 * 1000));
        const createdAtIso = createdAt.toISOString();

        const input: QuoteInput = {
          origin: origin[0],
          destination: dest[0],
          originZone: origin[1],
          destZone: dest[1],
          distanceKm,
          weightKg,
          lengthCm: Math.round(10 + rng() * 60),
          widthCm: Math.round(10 + rng() * 40),
          heightCm: Math.round(5 + rng() * 30),
          serviceType,
        };

        // Filter rates by createdAt validity (so historical quotes look right)
        const ts = createdAt.getTime();
        const matchingRates = orgRates.filter((r) => {
          const vf = new Date(r.validFrom).getTime();
          const vt = new Date(r.validTo).getTime();
          if (ts < vf || ts > vt) return false;
          if (weightKg < r.minWeightKg || weightKg > r.maxWeightKg) return false;
          if (r.zone !== dest[1] && r.zone !== origin[1] && r.zone !== "nacional" && r.zone !== "local") return false;
          return true;
        });
        if (matchingRates.length === 0) continue;

        const computed: ComputedQuoteResult[] = computeQuotes(input, matchingRates, orgRules);
        if (computed.length === 0) continue;

        const status = pick(["quoted", "booked", "expired"] as QuoteStatus[], rng);
        const quoteId = uuid();
        const quote: Quote = {
          id: quoteId,
          organizationId: orgId,
          userId: user.id,
          origin: origin[0],
          destination: dest[0],
          originZone: origin[1],
          destZone: dest[1],
          distanceKm,
          weightKg,
          lengthCm: input.lengthCm,
          widthCm: input.widthCm,
          heightCm: input.heightCm,
          serviceType,
          status,
          createdAt: createdAtIso,
          user: { id: user.id, name: user.name, email: user.email },
        };
        const quoteResults: QuoteResult[] = computed.map((c) => {
          const carrier = orgCarriers.find((c2) => c2.id === c.carrierId);
          return {
            id: uuid(),
            quoteId,
            carrierId: c.carrierId,
            carrierRateId: c.carrierRateId,
            rateVersionUsed: c.rateVersionUsed,
            price: c.price,
            transitDaysMin: c.transitDaysMin,
            transitDaysMax: c.transitDaysMax,
            restrictions: c.restrictions,
            selected: false,
            preferred: c.preferred,
            carrier: carrier ? { id: carrier.id, name: carrier.name, code: carrier.code } : undefined,
          };
        });
        // Mark one as selected for booked quotes
        if (status === "booked" && quoteResults.length > 0) {
          const selected = pick(quoteResults, rng);
          selected.selected = true;
          quote.selectedPrice = selected.price;
          quote.selectedCarrier = selected.carrier ?? null;
        }
        quotes.push(quote);
        results.push(...quoteResults);
      }
    };

    makeQuotesForOrg(
      orgAndina.id,
      users.filter((u) => u.organizationId === orgAndina.id),
      carriers.filter((c) => c.organizationId === orgAndina.id),
      AR_ORIGINS,
      AR_DESTS
    );
    makeQuotesForOrg(
      orgCargo.id,
      users.filter((u) => u.organizationId === orgCargo.id),
      carriers.filter((c) => c.organizationId === orgCargo.id),
      MX_ORIGINS,
      MX_DESTS
    );

    // Sort quotes by createdAt desc
    quotes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    // Set current usage = quotes this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const monthStart = thisMonth.getTime();
    orgAndina.currentUsage = quotes.filter(
      (q) => q.organizationId === orgAndina.id && new Date(q.createdAt).getTime() >= monthStart
    ).length;
    orgCargo.currentUsage = quotes.filter(
      (q) => q.organizationId === orgCargo.id && new Date(q.createdAt).getTime() >= monthStart
    ).length;

    return { organizations: [orgAndina, orgCargo], users, carriers, rates, rules, quotes, results, apiKeys };
  }

  // ---------- Auth ----------
  login(email: string, password: string): { token: string; user: User; organization: Organization } | null {
    this.ensureSeeded();
    const user = this.db.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.active
    );
    if (!user) return null;
    const org = this.db.organizations.find((o) => o.id === user.organizationId);
    if (!org) return null;
    const token = createToken({ userId: user.id, organizationId: org.id, role: user.role });
    return { token, user, organization: org };
  }

  loadSessionContext(session: { userId: string; organizationId: string }): { user: User; organization: Organization } | null {
    this.ensureSeeded();
    const user = this.db.users.find((u) => u.id === session.userId && u.organizationId === session.organizationId && u.active);
    if (!user) return null;
    const org = this.db.organizations.find((o) => o.id === session.organizationId);
    if (!org) return null;
    return { user, organization: org };
  }

  // ---------- Organization ----------
  getOrganization(orgId: string): Organization | null {
    this.ensureSeeded();
    return this.db.organizations.find((o) => o.id === orgId) ?? null;
  }

  updateOrganization(orgId: string, patch: Partial<Organization>): Organization | null {
    this.ensureSeeded();
    const org = this.db.organizations.find((o) => o.id === orgId);
    if (!org) return null;
    Object.assign(org, patch);
    return org;
  }

  // ---------- Users ----------
  listUsers(orgId: string): User[] {
    this.ensureSeeded();
    return this.db.users.filter((u) => u.organizationId === orgId);
  }

  createUser(orgId: string, data: { name: string; email: string; password: string; role: Role; active: boolean }): User {
    this.ensureSeeded();
    const user: User = {
      id: uuid(),
      organizationId: orgId,
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role,
      active: data.active,
      createdAt: new Date().toISOString(),
    };
    this.db.users.push(user);
    return user;
  }

  updateUser(userId: string, patch: Partial<User>): User | null {
    this.ensureSeeded();
    const u = this.db.users.find((x) => x.id === userId);
    if (!u) return null;
    Object.assign(u, patch);
    return u;
  }

  deleteUser(userId: string): boolean {
    this.ensureSeeded();
    const idx = this.db.users.findIndex((x) => x.id === userId);
    if (idx === -1) return false;
    this.db.users.splice(idx, 1);
    return true;
  }

  // ---------- Carriers ----------
  listCarriers(orgId: string): Carrier[] {
    this.ensureSeeded();
    return this.db.carriers
      .filter((c) => c.organizationId === orgId)
      .map((c) => ({
        ...c,
        rateCount: this.db.rates.filter((r) => r.carrierId === c.id && r.status === "active").length,
      }));
  }

  updateCarrier(carrierId: string, patch: Partial<Carrier>): Carrier | null {
    this.ensureSeeded();
    const c = this.db.carriers.find((x) => x.id === carrierId);
    if (!c) return null;
    Object.assign(c, patch);
    return c;
  }

  // ---------- Rates ----------
  listRates(orgId: string): CarrierRate[] {
    this.ensureSeeded();
    return this.db.rates
      .filter((r) => r.organizationId === orgId)
      .map((r) => {
        const carrier = this.db.carriers.find((c) => c.id === r.carrierId);
        return {
          ...r,
          carrier: carrier ? { id: carrier.id, name: carrier.name, code: carrier.code } : undefined,
        };
      });
  }

  listRateVersions(orgId: string, carrierId: string, zone: Zone): CarrierRate[] {
    this.ensureSeeded();
    return this.db.rates
      .filter((r) => r.organizationId === orgId && r.carrierId === carrierId && r.zone === zone)
      .sort((a, b) => b.version - a.version);
  }

  createRate(orgId: string, data: {
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
    status: RateStatus;
    source: RateSource;
  }): CarrierRate {
    this.ensureSeeded();
    // Find the next version for this carrier+zone
    const existing = this.db.rates.filter(
      (r) => r.organizationId === orgId && r.carrierId === data.carrierId && r.zone === data.zone
    );
    const nextVersion = existing.length === 0 ? 1 : Math.max(...existing.map((r) => r.version)) + 1;
    // Mark previous "active" as "inactive"
    for (const r of existing) {
      if (r.status === "active") r.status = "inactive";
    }
    const rate: CarrierRate = {
      id: uuid(),
      organizationId: orgId,
      ...data,
      version: nextVersion,
      createdAt: new Date().toISOString(),
    };
    this.db.rates.push(rate);
    return rate;
  }

  updateRate(rateId: string, patch: Partial<CarrierRate>): CarrierRate | null {
    this.ensureSeeded();
    const r = this.db.rates.find((x) => x.id === rateId);
    if (!r) return null;
    Object.assign(r, patch);
    return r;
  }

  deleteRate(rateId: string): boolean {
    this.ensureSeeded();
    const idx = this.db.rates.findIndex((r) => r.id === rateId);
    if (idx === -1) return false;
    this.db.rates.splice(idx, 1);
    return true;
  }

  // ---------- Rules ----------
  listRules(orgId: string): ShippingRule[] {
    this.ensureSeeded();
    return this.db.rules.filter((r) => r.organizationId === orgId).sort((a, b) => a.priority - b.priority);
  }

  createRule(orgId: string, data: Omit<ShippingRule, "id" | "organizationId" | "createdAt">): ShippingRule {
    this.ensureSeeded();
    const rule: ShippingRule = {
      id: uuid(),
      organizationId: orgId,
      createdAt: new Date().toISOString(),
      ...data,
    };
    this.db.rules.push(rule);
    return rule;
  }

  updateRule(ruleId: string, patch: Partial<ShippingRule>): ShippingRule | null {
    this.ensureSeeded();
    const r = this.db.rules.find((x) => x.id === ruleId);
    if (!r) return null;
    Object.assign(r, patch);
    return r;
  }

  deleteRule(ruleId: string): boolean {
    this.ensureSeeded();
    const idx = this.db.rules.findIndex((r) => r.id === ruleId);
    if (idx === -1) return false;
    this.db.rules.splice(idx, 1);
    return true;
  }

  // ---------- Quotes ----------
  listQuotes(
    orgId: string,
    opts: {
      page: number;
      pageSize: number;
      dateFrom?: string;
      dateTo?: string;
      carrierId?: string;
      status?: QuoteStatus;
      search?: string;
    }
  ): { items: Quote[]; total: number; page: number; pageSize: number } {
    this.ensureSeeded();
    let items = this.db.quotes.filter((q) => q.organizationId === orgId);
    if (opts.dateFrom) {
      const from = new Date(opts.dateFrom).getTime();
      items = items.filter((q) => new Date(q.createdAt).getTime() >= from);
    }
    if (opts.dateTo) {
      const to = new Date(opts.dateTo).getTime() + 24 * 3600 * 1000;
      items = items.filter((q) => new Date(q.createdAt).getTime() <= to);
    }
    if (opts.status) items = items.filter((q) => q.status === opts.status);
    if (opts.carrierId) {
      items = items.filter((q) => {
        const results = this.db.results.filter((r) => r.quoteId === q.id);
        return results.some((r) => r.carrierId === opts.carrierId);
      });
    }
    if (opts.search) {
      const s = opts.search.toLowerCase();
      items = items.filter(
        (q) =>
          q.origin.toLowerCase().includes(s) ||
          q.destination.toLowerCase().includes(s) ||
          q.user?.name.toLowerCase().includes(s)
      );
    }
    // Hydrate selected price + carrier
    items = items.map((q) => {
      const results = this.db.results.filter((r) => r.quoteId === q.id);
      const selected = results.find((r) => r.selected);
      return {
        ...q,
        results,
        selectedPrice: selected?.price ?? null,
        selectedCarrier: selected?.carrier ?? null,
      };
    });
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = items.length;
    const start = (opts.page - 1) * opts.pageSize;
    const paged = items.slice(start, start + opts.pageSize);
    return { items: paged, total, page: opts.page, pageSize: opts.pageSize };
  }

  getQuote(quoteId: string): Quote | null {
    this.ensureSeeded();
    const quote = this.db.quotes.find((q) => q.id === quoteId);
    if (!quote) return null;
    const results = this.db.results.filter((r) => r.quoteId === quoteId);
    const selected = results.find((r) => r.selected);
    return {
      ...quote,
      results,
      selectedPrice: selected?.price ?? null,
      selectedCarrier: selected?.carrier ?? null,
    };
  }

  createQuote(
    orgId: string,
    userId: string,
    input: QuoteInput
  ): Quote | null {
    this.ensureSeeded();
    const rates = this.listRates(orgId);
    const rules = this.listRules(orgId);
    const computed = computeQuotes(input, rates, rules);
    if (computed.length === 0) return null;
    const quoteId = uuid();
    const user = this.db.users.find((u) => u.id === userId);
    const quote: Quote = {
      id: quoteId,
      organizationId: orgId,
      userId,
      origin: input.origin,
      destination: input.destination,
      originZone: input.originZone,
      destZone: input.destZone,
      distanceKm: input.distanceKm,
      weightKg: input.weightKg,
      lengthCm: input.lengthCm,
      widthCm: input.widthCm,
      heightCm: input.heightCm,
      serviceType: input.serviceType,
      status: "quoted",
      createdAt: new Date().toISOString(),
      user: user ? { id: user.id, name: user.name, email: user.email } : undefined,
    };
    const quoteResults: QuoteResult[] = computed.map((c) => {
      const carrier = this.db.carriers.find((c2) => c2.id === c.carrierId);
      return {
        id: uuid(),
        quoteId,
        carrierId: c.carrierId,
        carrierRateId: c.carrierRateId,
        rateVersionUsed: c.rateVersionUsed,
        price: c.price,
        transitDaysMin: c.transitDaysMin,
        transitDaysMax: c.transitDaysMax,
        restrictions: c.restrictions,
        selected: false,
        preferred: c.preferred,
        carrier: carrier ? { id: carrier.id, name: carrier.name, code: carrier.code } : undefined,
      };
    });
    this.db.quotes.unshift(quote);
    this.db.results.push(...quoteResults);
    // bump currentUsage
    const org = this.db.organizations.find((o) => o.id === orgId);
    if (org) org.currentUsage += 1;
    return {
      ...quote,
      results: quoteResults,
      selectedPrice: null,
      selectedCarrier: null,
    };
  }

  selectQuoteResult(quoteId: string, resultId: string): Quote | null {
    this.ensureSeeded();
    const quote = this.db.quotes.find((q) => q.id === quoteId);
    if (!quote) return null;
    const results = this.db.results.filter((r) => r.quoteId === quoteId);
    for (const r of results) r.selected = r.id === resultId;
    const selected = results.find((r) => r.id === resultId);
    if (selected) {
      quote.status = "booked";
      quote.selectedPrice = selected.price;
      quote.selectedCarrier = selected.carrier ?? null;
    }
    return this.getQuote(quoteId);
  }

  // ---------- API Keys ----------
  listApiKeys(orgId: string): ApiKey[] {
    this.ensureSeeded();
    return this.db.apiKeys.filter((k) => k.organizationId === orgId);
  }

  createApiKey(orgId: string, env: ApiEnv): ApiKey {
    this.ensureSeeded();
    const full = `sk_${env === "prod" ? "live" : "test"}_${uuid().replace(/-/g, "")}`;
    const key: ApiKey = {
      id: uuid(),
      organizationId: orgId,
      environment: env,
      keyPreview: full.slice(-4),
      keyHash: full,
      fullKey: full,
      quotaLimit: 10000,
      usageCount: 0,
      lastUsedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.db.apiKeys.push(key);
    return key;
  }

  deleteApiKey(keyId: string): boolean {
    this.ensureSeeded();
    const idx = this.db.apiKeys.findIndex((k) => k.id === keyId);
    if (idx === -1) return false;
    this.db.apiKeys.splice(idx, 1);
    return true;
  }

  // ---------- Dashboard ----------
  getDashboard(orgId: string): {
    kpis: { quotesMonth: number; activeCarriers: number; avgRate: number; rateAlerts: number; currency: string };
    quotesByCarrier: Array<{ carrierId: string; name: string; count: number }>;
    rateAlerts: Array<{ id: string; carrier: { id: string; name: string; code: string }; zone: Zone; validTo: string; version: number; expired: boolean }>;
    recentQuotes: Quote[];
    organization: Organization;
  } | null {
    this.ensureSeeded();
    const org = this.db.organizations.find((o) => o.id === orgId);
    if (!org) return null;
    const orgQuotes = this.db.quotes.filter((q) => q.organizationId === orgId);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const quotesMonth = orgQuotes.filter((q) => new Date(q.createdAt).getTime() >= monthStart.getTime()).length;

    const carriers = this.listCarriers(orgId);
    const activeCarriers = carriers.filter((c) => c.active).length;

    const rates = this.listRates(orgId);
    const currency = org.country === "AR" ? "ARS" : org.country === "CL" ? "CLP" : org.country === "CO" ? "COP" : "MXN";
    const allPrices = this.db.results
      .filter((r) => orgQuotes.some((q) => q.id === r.quoteId))
      .map((r) => r.price);
    const avgRate = allPrices.length === 0 ? 0 : allPrices.reduce((a, b) => a + b, 0) / allPrices.length;

    // Rate alerts: active rates expiring in <=7 days OR already expired
    const now = Date.now();
    const rateAlerts = rates
      .filter((r) => r.status === "active")
      .map((r) => {
        const vt = new Date(r.validTo).getTime();
        const days = Math.ceil((vt - now) / DAYS);
        return { r, days, expired: days < 0 };
      })
      .filter((x) => x.days <= 7)
      .map((x) => ({
        id: x.r.id,
        carrier: x.r.carrier ?? { id: "", name: "—", code: "—" },
        zone: x.r.zone,
        validTo: x.r.validTo,
        version: x.r.version,
        expired: x.expired,
      }))
      .sort((a, b) => new Date(a.validTo).getTime() - new Date(b.validTo).getTime());

    // Quotes by carrier (top 5)
    const counts = new Map<string, number>();
    for (const q of orgQuotes) {
      const results = this.db.results.filter((r) => r.quoteId === q.id);
      for (const r of results) {
        counts.set(r.carrierId, (counts.get(r.carrierId) ?? 0) + 1);
      }
    }
    const quotesByCarrier = Array.from(counts.entries())
      .map(([carrierId, count]) => {
        const c = this.db.carriers.find((c) => c.id === carrierId);
        return { carrierId, name: c?.name ?? "—", count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const recentQuotes = orgQuotes
      .slice(0, 5)
      .map((q) => {
        const results = this.db.results.filter((r) => r.quoteId === q.id);
        const selected = results.find((r) => r.selected);
        return {
          ...q,
          results,
          selectedPrice: selected?.price ?? null,
          selectedCarrier: selected?.carrier ?? null,
        };
      });

    return {
      kpis: { quotesMonth, activeCarriers, avgRate, rateAlerts: rateAlerts.length, currency },
      quotesByCarrier,
      rateAlerts,
      recentQuotes,
      organization: org,
    };
  }
}

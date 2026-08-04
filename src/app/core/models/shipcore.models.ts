// ShipCore — Core type definitions (no DB; mirrors the original Prisma models)

export type Role = "admin" | "operador";
export type Plan = "starter" | "growth" | "enterprise";
export type Country = "AR" | "CL" | "CO" | "MX";
export type Zone = "local" | "nacional" | "internacional";
export type ServiceType = "standard" | "express" | "priority";
export type QuoteStatus = "quoted" | "booked" | "expired";
export type RateStatus = "active" | "inactive" | "draft";
export type RateSource = "manual" | "api" | "import";
export type ApiEnv = "sandbox" | "prod";
export type RuleField = "weight" | "zone" | "serviceType" | "carrier";
export type RuleOperator = "gt" | "lt" | "eq" | "gte" | "lte" | "contains";
export type RuleAction = "surcharge" | "discount" | "block" | "prefer";

export interface Organization {
  id: string;
  name: string;
  ruc?: string;
  address?: string;
  phone?: string;
  country: Country;
  plan: Plan;
  softLimit: number;
  hardLimit: number;
  currentUsage: number;
  createdAt: string;
}

export interface User {
  id: string;
  organizationId: string;
  organizationName?: string;
  email: string;
  password: string; // demo only
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface Carrier {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  active: boolean;
  logoUrl: string | null;
  createdAt: string;
  rateCount?: number;
}

export interface CarrierRate {
  id: string;
  carrierId: string;
  organizationId: string;
  zone: Zone;
  validFrom: string;
  validTo: string;
  version: number;
  status: RateStatus;
  source: RateSource;
  basePrice: number;
  pricePerKg: number;
  pricePerKm: number;
  transitDaysMin: number;
  transitDaysMax: number;
  minWeightKg: number;
  maxWeightKg: number;
  createdAt: string;
  carrier?: Pick<Carrier, "id" | "name" | "code">;
}

export interface ShippingRule {
  id: string;
  organizationId: string;
  name: string;
  field: RuleField;
  operator: RuleOperator;
  value: string;
  action: RuleAction;
  actionValue: number;
  active: boolean;
  priority: number;
  createdAt: string;
}

export interface QuoteResult {
  id: string;
  quoteId: string;
  carrierId: string;
  carrierRateId: string;
  rateVersionUsed: number;
  price: number;
  transitDaysMin: number;
  transitDaysMax: number;
  restrictions: string;
  selected: boolean;
  preferred?: boolean;
  carrier?: Pick<Carrier, "id" | "name" | "code">;
}

export interface Quote {
  id: string;
  organizationId: string;
  userId: string;
  origin: string;
  destination: string;
  originZone: Zone;
  destZone: Zone;
  distanceKm: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  serviceType: ServiceType;
  status: QuoteStatus;
  createdAt: string;
  user?: Pick<User, "id" | "name" | "email">;
  results?: QuoteResult[];
  selectedPrice?: number | null;
  selectedCarrier?: { id: string; name: string; code: string } | null;
}

export interface ApiKey {
  id: string;
  organizationId: string;
  environment: ApiEnv;
  keyPreview: string;
  fullKey?: string; // only on creation
  keyHash: string; // demo only
  quotaLimit: number;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface Session {
  userId: string;
  organizationId: string;
  role: Role;
  exp: number;
}

export interface AuthResponse {
  token: string;
  user: User;
  organization: Organization;
}

export interface QuoteInput {
  origin: string;
  destination: string;
  originZone: Zone;
  destZone: Zone;
  distanceKm: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  serviceType: ServiceType;
}

export interface ComputedQuoteResult {
  carrierId: string;
  carrierRateId: string;
  rateVersionUsed: number;
  price: number;
  transitDaysMin: number;
  transitDaysMax: number;
  restrictions: string;
  preferred: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardData {
  kpis: {
    quotesMonth: number;
    activeCarriers: number;
    avgRate: number;
    rateAlerts: number;
    currency: string;
  };
  quotesByCarrier: Array<{ carrierId: string; name: string; count: number }>;
  rateAlerts: Array<{
    id: string;
    carrier: { id: string; name: string; code: string };
    zone: Zone;
    validTo: string;
    version: number;
    expired: boolean;
  }>;
  recentQuotes: Array<{
    id: string;
    origin: string;
    destination: string;
    serviceType: ServiceType;
    status: QuoteStatus;
    createdAt: string;
    weightKg: number;
    user?: { id: string; name: string; email: string } | null;
    selectedPrice: number | null;
    selectedCarrier?: { id: string; name: string; code: string } | null;
  }>;
  organization: {
    id: string;
    name: string;
    country: Country;
    plan: Plan;
    currentUsage: number;
    softLimit: number;
    hardLimit: number;
  };
}

export type ViewName =
  | "dashboard"
  | "quote-form"
  | "quote-results"
  | "quote-detail"
  | "history"
  | "carriers"
  | "rules"
  | "plan"
  | "org";

export type AuthSession = Session;
export type PlanTier = Plan;
export type DashboardKpi = DashboardData["kpis"];
export type QuoteByCarrier = DashboardData["quotesByCarrier"][number];
export type RateAlert = DashboardData["rateAlerts"][number];
export type RecentQuote = DashboardData["recentQuotes"][number];


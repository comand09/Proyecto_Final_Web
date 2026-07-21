// Application-wide constants.
export const APP_NAME = "ShipCore";
export const APP_VERSION = "1.0.0";

// Demo credentials shown on the login screen.
export const DEMO_CREDENTIALS = [
  { email: "admin@andina.com", password: "admin123", label: "Admin · Andina" },
  { email: "operador@andina.com", password: "operador123", label: "Operador · Andina" },
  { email: "admin@costera.com", password: "admin123", label: "Admin · Costera" },
  { email: "operador@costera.com", password: "operador123", label: "Operador · Costera" },
] as const;

// localStorage keys
export const STORAGE_KEYS = {
  AUTH: "shipcore.auth",
  UI: "shipcore.ui",
} as const;

// Plan soft/hard limits per organization plan tier.
export const PLAN_LIMITS = {
  starter: { soft: 100, hard: 150 },
  pro: { soft: 1000, hard: 1500 },
  enterprise: { soft: 10000, hard: 15000 },
} as const;

// Currency by country code (ISO 3166-1 alpha-2).
export const COUNTRY_CURRENCY: Record<string, string> = {
  AR: "ARS",
  CL: "CLP",
  CO: "COP",
  MX: "MXN",
};

// LatAm locale code by country.
export const COUNTRY_LOCALE: Record<string, string> = {
  AR: "es-AR",
  CL: "es-CL",
  CO: "es-CO",
  MX: "es-MX",
};

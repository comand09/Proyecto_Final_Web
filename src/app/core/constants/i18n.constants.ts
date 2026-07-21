// i18n-related constants.
export const LOCALES = ["es-AR", "es-CL", "es-CO", "es-MX"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  "es-AR": "Español (AR)",
  "es-CL": "Español (CL)",
  "es-CO": "Español (CO)",
  "es-MX": "Español (MX)",
};

// Minimal dictionary for the few UI strings that need to change per locale.
export const I18N_DICTIONARY: Record<Locale, Record<string, string>> = {
  "es-AR": {
    "app.title": "ShipCore",
    "nav.dashboard": "Dashboard",
    "nav.quotes": "Cotizaciones",
    "nav.history": "Historial",
    "nav.carriers": "Couriers y Tarifas",
    "nav.rules": "Reglas de negocio",
    "nav.config": "Configuración",
    "action.login": "Iniciar sesión",
    "action.logout": "Cerrar sesión",
  },
  "es-CL": {
    "app.title": "ShipCore",
    "nav.dashboard": "Panel",
    "nav.quotes": "Cotizaciones",
    "nav.history": "Historial",
    "nav.carriers": "Couriers y Tarifas",
    "nav.rules": "Reglas de negocio",
    "nav.config": "Configuración",
    "action.login": "Iniciar sesión",
    "action.logout": "Cerrar sesión",
  },
  "es-CO": {
    "app.title": "ShipCore",
    "nav.dashboard": "Panel",
    "nav.quotes": "Cotizaciones",
    "nav.history": "Historial",
    "nav.carriers": "Couriers y Tarifas",
    "nav.rules": "Reglas de negocio",
    "nav.config": "Configuración",
    "action.login": "Iniciar sesión",
    "action.logout": "Cerrar sesión",
  },
  "es-MX": {
    "app.title": "ShipCore",
    "nav.dashboard": "Panel",
    "nav.quotes": "Cotizaciones",
    "nav.history": "Historial",
    "nav.carriers": "Paqueterías y Tarifas",
    "nav.rules": "Reglas de negocio",
    "nav.config": "Configuración",
    "action.login": "Iniciar sesión",
    "action.logout": "Cerrar sesión",
  },
};

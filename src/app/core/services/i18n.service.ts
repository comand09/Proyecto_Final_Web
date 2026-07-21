// ShipCore — i18n service. Mirrors the original React version's i18n module.
// Locale state lives in UiService (BehaviorSubject), here we provide formatters
// + a dictionary of ~30 keys.

import { Injectable } from "@angular/core";
import { Country } from "../models/shipcore.models";

export type Locale = "es-AR" | "es-CL" | "es-CO" | "es-MX";

export const LOCALES: Locale[] = ["es-AR", "es-CL", "es-CO", "es-MX"];

export const LOCALE_LABELS: Record<Locale, string> = {
  "es-AR": "Español (AR)",
  "es-CL": "Español (CL)",
  "es-CO": "Español (CO)",
  "es-MX": "Español (MX)",
};

const COUNTRY_CURRENCY: Record<Country, string> = {
  AR: "ARS",
  CL: "CLP",
  CO: "COP",
  MX: "MXN",
};

const DICT: Record<Locale, Record<string, string>> = {
  "es-AR": baseDict(),
  "es-CL": baseDict(),
  "es-CO": baseDict(),
  "es-MX": baseDict(),
};

function baseDict(): Record<string, string> {
  return {
    "app.name": "ShipCore",
    "app.tagline": "Cotización de envíos multi-tenant para LatAm",
    "nav.dashboard": "Dashboard",
    "nav.quotes": "Cotizaciones",
    "nav.history": "Historial",
    "nav.carriers": "Couriers y Tarifas",
    "nav.rules": "Reglas de negocio",
    "nav.config": "Configuración",
    "nav.logout": "Cerrar sesión",
    "action.login": "Iniciar sesión",
    "action.save": "Guardar",
    "action.cancel": "Cancelar",
    "action.create": "Crear",
    "action.edit": "Editar",
    "action.delete": "Eliminar",
    "action.new": "Nuevo",
    "action.search": "Buscar",
    "action.confirm": "Confirmar",
    "action.close": "Cerrar",
    "action.copy": "Copiar",
    "state.loading": "Cargando…",
    "state.empty": "Sin resultados",
    "state.error": "Ocurrió un error al cargar los datos",
    "auth.email": "Email",
    "auth.password": "Contraseña",
    "auth.demo": "Demo: admin@andina.com / admin123",
    "kpi.quotesMonth": "Cotizaciones del mes",
    "kpi.activeCarriers": "Couriers activos",
    "kpi.avgRate": "Tarifa promedio",
    "kpi.rateAlerts": "Alertas de tarifas",
    "label.zone": "Zona",
    "label.carrier": "Courier",
    "label.status": "Estado",
    "label.version": "Versión",
    "label.weight": "Peso (kg)",
    "label.price": "Precio",
    "label.transit": "Tiempo de tránsito",
  };
}

@Injectable({ providedIn: "root" })
export class I18nService {
  formatCurrency(amount: number, locale: Locale, country: Country): string {
    const currency = COUNTRY_CURRENCY[country] || "USD";
    const fractionDigits = currency === "CLP" || currency === "COP" ? 0 : 2;
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(fractionDigits)}`;
    }
  }

  formatDate(date: string | Date | null, locale: Locale): string {
    if (!date) return "—";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(d);
  }

  formatDateTime(date: string | Date | null, locale: Locale): string {
    if (!date) return "—";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }

  translate(locale: Locale, key: string): string {
    return DICT[locale]?.[key] ?? key;
  }
}

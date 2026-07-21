// ShipCore — pure quote engine (mirrors the React version).
// Given a QuoteInput + matching rates + rules → list of ComputedQuoteResult.

import {
  CarrierRate,
  ComputedQuoteResult,
  QuoteInput,
  RuleAction,
  RuleField,
  RuleOperator,
  ShippingRule,
} from "../models/shipcore.models";

interface RateWithCarrier extends CarrierRate {
  carrier?: { id: string; name: string; code: string };
}

function ruleMatches(
  rule: { field: RuleField; operator: RuleOperator; value: string },
  ctx: { weightKg: number; zone: string; serviceType: string; carrierName: string }
): boolean {
  const v = rule.value;
  switch (rule.field) {
    case "weight": {
      const n = parseFloat(v);
      if (isNaN(n)) return false;
      switch (rule.operator) {
        case "gt": return ctx.weightKg > n;
        case "lt": return ctx.weightKg < n;
        case "gte": return ctx.weightKg >= n;
        case "lte": return ctx.weightKg <= n;
        case "eq": return ctx.weightKg === n;
        case "contains": return String(ctx.weightKg).includes(v);
      }
      return false;
    }
    case "zone": {
      switch (rule.operator) {
        case "eq": return ctx.zone === v;
        case "contains": return ctx.zone.includes(v);
        default: return false;
      }
    }
    case "serviceType": {
      switch (rule.operator) {
        case "eq": return ctx.serviceType === v;
        case "contains": return ctx.serviceType.includes(v);
        default: return false;
      }
    }
    case "carrier": {
      switch (rule.operator) {
        case "eq": return ctx.carrierName === v;
        case "contains": return ctx.carrierName.includes(v);
        default: return false;
      }
    }
  }
  return false;
}

function applyRule(
  price: number,
  action: RuleAction,
  actionValue: number
): { price: number; blocked: boolean; preferred: boolean } {
  let blocked = false;
  let preferred = false;
  let p = price;
  switch (action) {
    case "surcharge": p = p * (1 + actionValue / 100); break;
    case "discount": p = p * (1 - actionValue / 100); break;
    case "block": blocked = true; break;
    case "prefer": preferred = true; break;
  }
  return { price: p, blocked, preferred };
}

export function filterApplicableRates(
  input: QuoteInput,
  rates: RateWithCarrier[],
  now: Date = new Date()
): RateWithCarrier[] {
  const ts = now.getTime();
  return rates.filter((r) => {
    if (r.status !== "active") return false;
    const vf = typeof r.validFrom === "string" ? new Date(r.validFrom) : r.validFrom;
    const vt = typeof r.validTo === "string" ? new Date(r.validTo) : r.validTo;
    if (ts < vf.getTime() || ts > vt.getTime()) return false;
    if (input.weightKg < r.minWeightKg || input.weightKg > r.maxWeightKg) return false;
    if (r.zone !== input.destZone && r.zone !== input.originZone) {
      if (!(r.zone === "nacional" && (input.destZone === "nacional" || input.originZone === "nacional"))) {
        return false;
      }
    }
    return true;
  });
}

export function computeQuotes(
  input: QuoteInput,
  rates: RateWithCarrier[],
  rules: ShippingRule[]
): ComputedQuoteResult[] {
  const applicable = filterApplicableRates(input, rates);
  const sortedRules = [...rules].filter((r) => r.active).sort((a, b) => a.priority - b.priority);

  const results: ComputedQuoteResult[] = [];
  for (const rate of applicable) {
    const basePrice =
      rate.basePrice +
      rate.pricePerKg * input.weightKg +
      rate.pricePerKm * Math.max(0, input.distanceKm - 50);

    const ctx = {
      weightKg: input.weightKg,
      zone: rate.zone,
      serviceType: input.serviceType,
      carrierName: rate.carrier?.name ?? "",
    };

    let price = basePrice;
    let blocked = false;
    let preferred = false;
    for (const rule of sortedRules) {
      if (!ruleMatches(rule, ctx)) continue;
      const out = applyRule(price, rule.action, rule.actionValue);
      price = out.price;
      if (out.blocked) {
        blocked = true;
        break;
      }
      if (out.preferred) preferred = true;
    }
    if (blocked) continue;

    const restrictions: string[] = [];
    if (input.weightKg > rate.maxWeightKg - 5) {
      restrictions.push(`Peso cercano al máximo (${rate.maxWeightKg} kg)`);
    }
    if (rate.zone === "internacional") {
      restrictions.push("Requiere documentación aduanera");
    }
    if (input.serviceType === "priority" && rate.transitDaysMin > 1) {
      restrictions.push("Prioridad no garantizada por este courier");
    }

    results.push({
      carrierId: rate.carrierId,
      carrierRateId: rate.id,
      rateVersionUsed: rate.version,
      price: Math.round(price * 100) / 100,
      transitDaysMin: rate.transitDaysMin,
      transitDaysMax: rate.transitDaysMax,
      restrictions: restrictions.join(" · "),
      preferred,
    });
  }

  results.sort((a, b) => {
    if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
    if (a.price !== b.price) return a.price - b.price;
    return a.transitDaysMin - b.transitDaysMin;
  });

  return results;
}

export function describeRule(rule: {
  field: RuleField;
  operator: RuleOperator;
  value: string;
  action: RuleAction;
  actionValue: number;
}): string {
  const fieldLabel: Record<RuleField, string> = {
    weight: "peso",
    zone: "zona",
    serviceType: "tipo de servicio",
    carrier: "courier",
  };
  const opLabel: Record<RuleOperator, string> = {
    gt: ">",
    lt: "<",
    eq: "=",
    gte: "≥",
    lte: "≤",
    contains: "contiene",
  };
  const actionLabel: Record<RuleAction, string> = {
    surcharge: "recargo",
    discount: "descuento",
    block: "bloquear",
    prefer: "priorizar",
  };
  const valuePart = rule.field === "weight" ? `${rule.value} kg` : rule.value;
  if (rule.action === "block") {
    return `Si ${fieldLabel[rule.field]} ${opLabel[rule.operator]} ${valuePart} entonces bloquear`;
  }
  if (rule.action === "prefer") {
    return `Si ${fieldLabel[rule.field]} ${opLabel[rule.operator]} ${valuePart} entonces priorizar`;
  }
  const sign = rule.action === "surcharge" ? "+" : "-";
  return `Si ${fieldLabel[rule.field]} ${opLabel[rule.operator]} ${valuePart} entonces aplicar ${sign}${rule.actionValue}% ${actionLabel[rule.action]}`;
}

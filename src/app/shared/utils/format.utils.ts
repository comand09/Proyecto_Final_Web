// Format helpers used across the app (pure functions, no Angular deps).
export function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function shortName(name: string, max = 10): string {
  return name.length > max ? name.slice(0, max - 1) + "…" : name;
}

export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function pct(value: number, total: number): number {
  if (!total) return 0;
  return clamp((value / total) * 100, 0, 100);
}

export function safeId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

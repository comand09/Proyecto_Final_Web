// Feature-local interfaces for the org feature.
export interface UserFormValue {
  name: string;
  email: string;
  role: "admin" | "operador";
}

export interface ApiKeyCreateResult {
  id: string;
  key: string;       // full key — shown only once at creation time
  label: string;
  createdAt: string;
  expiresAt: string;
}

export interface PlanUsage {
  current: number;
  softLimit: number;
  hardLimit: number;
  pctSoft: number;
  pctHard: number;
}

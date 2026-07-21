// Feature-local interfaces for the dashboard feature.
export interface DashboardKpiCard {
  label: string;
  value: string | number;
  hint?: string;
  variant: "primary" | "sky" | "emerald" | "rose";
  icon: string;
}

export interface DashboardBarChartSeries {
  label: string;
  value: number;
  sublabel?: string;
}

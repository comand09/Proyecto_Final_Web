// Feature-local interfaces for the rules feature.
export interface RuleFormValue {
  name: string;
  description: string;
  field: string;
  operator: string;
  value: string;
  action: string;
  adjustmentType: "percentage" | "fixed" | null;
  adjustmentValue: number | null;
  priority: number;
  active: boolean;
}

export interface RuleDescription {
  text: string;
  variant: "block" | "surcharge" | "discount" | "priority";
}

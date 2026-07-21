// Feature-local interfaces for the quotes feature.
export interface QuoteFormValue {
  origin: string;
  destination: string;
  weightKg: number;
  zone: string;
  serviceType: string;
  validFrom: string;
  validTo: string;
}

export interface QuoteResultRow {
  resultId: string;
  carrierName: string;
  serviceType: string;
  price: number;
  etaDays: number;
  appliedRules: string[];
}

export interface QuoteComparison {
  results: QuoteResultRow[];
  cheapest?: QuoteResultRow;
  fastest?: QuoteResultRow;
}

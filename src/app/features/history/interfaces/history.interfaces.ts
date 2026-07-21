// Feature-local interfaces for the history feature.
export interface HistoryFilters {
  search: string;
  carrierId: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

export interface HistoryTableRow {
  id: string;
  createdAt: string;
  origin: string;
  destination: string;
  weightKg: number;
  carrierName?: string;
  price?: number;
  status: string;
}

// Feature-local interfaces for the carriers feature.
export interface CarrierRateFormValue {
  carrierId: string;
  zone: string;
  serviceType: string;
  basePrice: number;
  pricePerKg: number;
  pricePerKm: number;
  minWeight: number;
  maxWeight: number;
  validFrom: string;
  validTo: string;
}

export interface RateVersionEntry {
  version: number;
  validFrom: string;
  validTo: string;
  basePrice: number;
  pricePerKg: number;
  pricePerKm: number;
}

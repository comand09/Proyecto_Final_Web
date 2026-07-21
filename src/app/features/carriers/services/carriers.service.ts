// Carriers feature service. Wraps the shared ApiClient for carrier + rate operations.
import { Injectable, inject } from "@angular/core";
import { ApiClient } from "../../../core/services/api-client";
import { Carrier, CarrierRate } from "../../../core/models/shipcore.models";

@Injectable({ providedIn: "root" })
export class CarriersService {
  private api = inject(ApiClient);

  listCarriers(): Carrier[] {
    return this.api.listCarriers();
  }

  listRates(filter?: { carrierId?: string; zone?: string }): CarrierRate[] {
    return this.api.listRates(filter);
  }

  createRate(input: Partial<CarrierRate>): CarrierRate {
    return this.api.createRate(input);
  }

  updateRate(id: string, patch: Partial<CarrierRate>): CarrierRate {
    return this.api.updateRate(id, patch);
  }

  deleteRate(id: string): void {
    this.api.deleteRate(id);
  }

  rateVersions(id: string): CarrierRate[] {
    return this.api.rateVersions(id);
  }
}

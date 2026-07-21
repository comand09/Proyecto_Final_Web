// Dashboard feature service stub. Delegates to the shared ApiClient.
import { Injectable, inject } from "@angular/core";
import { ApiClient } from "../../../core/services/api-client";
import { DashboardData } from "../../../core/models/shipcore.models";

@Injectable({ providedIn: "root" })
export class DashboardService {
  private api = inject(ApiClient);

  /** Returns the dashboard aggregate for the current organization. */
  load(): DashboardData {
    return this.api.dashboard();
  }
}

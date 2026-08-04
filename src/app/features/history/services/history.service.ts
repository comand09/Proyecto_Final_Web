// History feature service. Wraps the shared ApiClient.
import { Injectable, inject } from "@angular/core";
import { ApiClient } from "../../../core/services/api-client";
import { Quote } from "../../../core/models/shipcore.models";

@Injectable({ providedIn: "root" })
export class HistoryService {
  private api = inject(ApiClient);

  list(): Quote[] {
    return this.api.listQuotes().items;
  }
}

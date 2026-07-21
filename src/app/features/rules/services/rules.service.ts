// Rules feature service. Wraps the shared ApiClient.
import { Injectable, inject } from "@angular/core";
import { ApiClient } from "../../../core/services/api-client";
import { ShippingRule } from "../../../core/models/shipcore.models";

@Injectable({ providedIn: "root" })
export class RulesService {
  private api = inject(ApiClient);

  list(): ShippingRule[] {
    return this.api.listRules();
  }

  create(rule: Partial<ShippingRule>): ShippingRule {
    return this.api.createRule(rule);
  }

  update(id: string, patch: Partial<ShippingRule>): ShippingRule {
    return this.api.updateRule(id, patch);
  }

  delete(id: string): void {
    this.api.deleteRule(id);
  }
}

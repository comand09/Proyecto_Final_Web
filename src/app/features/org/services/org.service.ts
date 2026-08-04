// Org feature service. Wraps the shared ApiClient for org/user/api-key operations.
import { Injectable, inject } from "@angular/core";
import { ApiClient } from "../../../core/services/api-client";
import { Organization, User, ApiKey } from "../../../core/models/shipcore.models";

@Injectable({ providedIn: "root" })
export class OrgService {
  private api = inject(ApiClient);

  organization(): Organization | null {
    return this.api.organization();
  }

  listUsers(): User[] {
    return this.api.listUsers();
  }

  createUser(input: any): User {
    return this.api.createUser(input);
  }

  updateUser(id: string, patch: Partial<User>): User | null {
    return this.api.updateUser(id, patch);
  }

  deleteUser(id: string): void {
    this.api.deleteUser(id);
  }

  listApiKeys(): ApiKey[] {
    return this.api.listApiKeys();
  }

  createApiKey(label: string, expiresAt?: string): ApiKey {
    return this.api.createApiKey(label, expiresAt);
  }

  revokeApiKey(id: string): void {
    this.api.revokeApiKey(id);
  }
}

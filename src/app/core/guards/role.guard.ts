// ShipCore — RoleGuard. Restricts access to admin-only sections (Rules, Org Config).
// Mirrors the React RoleGuard component.

import { Injectable, inject } from "@angular/core";
import { CanActivateFn } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { Role } from "../models/shipcore.models";

@Injectable({ providedIn: "root" })
export class RoleGuardService {
  constructor(private auth: AuthService) {}

  canActivate(roles: Role[]): boolean {
    const role = this.auth.role();
    if (!role) return false;
    return roles.includes(role);
  }
}

export const roleGuard = (roles: Role[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const role = auth.role();
  if (!role) return false;
  return roles.includes(role);
};

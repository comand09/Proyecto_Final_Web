// ShipCore — RoleGuard. Restricts access to admin-only sections (Rules, Org Config).
// Mirrors the React RoleGuard component.

import { Injectable, inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { Role } from "../models/shipcore.models";

@Injectable({ providedIn: "root" })
export class RoleGuardService {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(roles: Role[]): boolean {
    const role = this.auth.role();
    if (role && roles.includes(role)) return true;
    this.router.navigate(["/dashboard"]);
    return false;
  }
}

export const roleGuard = (roles: Role[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.role();
  if (role && roles.includes(role)) {
    return true;
  }
  return router.createUrlTree(["/dashboard"]);
};


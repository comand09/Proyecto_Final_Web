// ShipCore — AuthGuard. Prevents access to protected routes when not authed.
// In this SPA, the guard is consulted by the AppShell before rendering the
// dashboard layout. Mirrors the React `useIsAuthenticated` check.

import { Injectable, inject } from "@angular/core";
import { CanActivateFn } from "@angular/router";
import { AuthService } from "../services/auth.service";

@Injectable({ providedIn: "root" })
export class AuthGuardService {
  constructor(private auth: AuthService) {}

  canActivate(): boolean {
    return this.auth.isAuthenticated();
  }
}

export const authGuard: CanActivateFn = () => {
  return inject(AuthService).isAuthenticated();
};

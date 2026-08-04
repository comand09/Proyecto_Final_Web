// ShipCore — AuthGuard. Prevents access to protected routes when not authed.
// In this SPA, the guard is consulted by the AppShell before rendering the
// dashboard layout. Mirrors the React `useIsAuthenticated` check.

import { Injectable, inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";

@Injectable({ providedIn: "root" })
export class AuthGuardService {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.auth.isAuthenticated()) return true;
    this.router.navigate(["/"]);
    return false;
  }
}

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(["/"]);
};


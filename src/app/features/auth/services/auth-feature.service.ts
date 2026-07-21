// Auth feature service stub. The actual login logic lives in
// core/services/auth.service.ts (shared across features). This stub exists
// to honor the per-feature service/ structure and can host auth-feature
// specific helpers in the future.
import { Injectable } from "@angular/core";
import { AuthService } from "../../../core/services/auth.service";

@Injectable({ providedIn: "root" })
export class AuthFeatureService {
  constructor(private auth: AuthService) {}

  /** Returns true if the user is currently authenticated. */
  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }
}

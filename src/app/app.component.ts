import { Component, computed, inject, OnInit, signal , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { AuthService } from "./core/services/auth.service";
import { UiService } from "./core/services/ui.service";
import { LoginPageComponent } from "./features/auth/pages/login.page";
import { DashboardLayoutComponent } from "./layout/dashboard-layout.component";
import { ToasterComponent } from "./shared/components/toaster/toaster.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, LoginPageComponent, DashboardLayoutComponent, ToasterComponent],
  template: `
    @if (!hydrated()) {
      <div class="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <div class="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 10.189V14" />
            <path d="M12 2v3" />
            <path d="M20 16.5C20 19.538 16.418 22 12 22s-8-2.462-8-5.5C4 14 8 11 12 11s8 3 8 5.5z" />
            <path d="m17.5 5.5-1 1" />
            <path d="m7.5 5.5 1 1" />
          </svg>
        </div>
        <div class="h-4 w-40 animate-pulse rounded bg-muted"></div>
      </div>
    } @else if (!isAuthenticated()) {
      <app-login-page></app-login-page>
    } @else {
      <app-dashboard-layout></app-dashboard-layout>
    }
    <app-toaster></app-toaster>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush, // OnPush
})
export class AppComponent implements OnInit {
  private auth = inject(AuthService);
  private ui = inject(UiService);

  hydrated = signal(false);
  bootstrapping = signal(false);
  isAuthenticated = computed(() => this.auth.isAuthenticated());

  ngOnInit(): void {
    // Wait for the auth store to hydrate from localStorage
    // Use a microtask to ensure all constructors have run
    Promise.resolve().then(() => {
      if (this.auth.hydrated()) {
        this.finishHydration();
      } else {
        // Poll for hydration (cheap, only on init)
        const interval = setInterval(() => {
          if (this.auth.hydrated()) {
            clearInterval(interval);
            this.finishHydration();
          }
        }, 30);
        setTimeout(() => clearInterval(interval), 3000);
      }
    });
  }

  private finishHydration(): void {
    const token = this.auth.token();
    const user = this.auth.user();
    if (token && !user) {
      this.bootstrapping.set(true);
      // Try to load /me context
      try {
        const ok = this.auth.bootstrapFromToken();
        if (!ok) {
          this.auth.clear();
        }
      } catch {
        this.auth.clear();
      } finally {
        this.bootstrapping.set(false);
      }
    }
    this.hydrated.set(true);
  }
}

import { Component, computed, inject, signal, effect , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { AuthService } from "../core/services/auth.service";
import { UiService } from "../core/services/ui.service";
import { RouterService } from "../core/services/router.service";
import { ApiClient } from "../core/services/api-client";
import { LOCALES, LOCALE_LABELS, Locale } from "../core/services/i18n.service";
import { ViewName } from "../core/models/shipcore.models";

const VIEW_TITLES: Record<ViewName, string> = {
  dashboard: "Dashboard",
  "quote-form": "Nueva cotización",
  "quote-results": "Resultados de cotización",
  "quote-detail": "Detalle de cotización",
  history: "Historial",
  carriers: "Couriers y Tarifas",
  rules: "Reglas de negocio",
  org: "Configuración",
};

@Component({
  selector: "app-navbar",
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <button class="btn btn-ghost btn-icon lg:hidden" aria-label="Abrir menú" (click)="ui.setSidebarOpen(true)">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
      </button>

      <div class="flex min-w-0 flex-1 items-center gap-2">
        <h2 class="truncate text-base font-semibold sm:text-lg">{{ title() }}</h2>
      </div>

      <div class="flex items-center gap-2">
        <!-- Locale switcher -->
        <div class="hidden items-center gap-1 text-muted-foreground sm:flex">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
          <div class="relative inline-flex">
            <select class="h-8 w-[120px] appearance-none border-0 bg-transparent px-1 text-xs shadow-none focus:ring-0" [value]="ui.locale()" (change)="onLocaleChange($event)" aria-label="Cambiar idioma">
              @for (l of locales; track l) {
                <option [value]="l">{{ labels[l] }}</option>
              }
            </select>
            <svg class="pointer-events-none absolute right-0 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </div>
        </div>

        <!-- Theme toggle -->
        <button class="btn btn-ghost btn-icon" (click)="ui.toggleTheme()" [attr.aria-label]="ui.theme() === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'">
          @if (ui.theme() === 'dark') {
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
          } @else {
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
          }
        </button>

        <!-- Org badge -->
        @if (org(); as o) {
          <span class="hidden items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold md:inline-flex" [class]="planBadgeClass(o.plan)">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /><path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" /></svg>
            {{ o.name }}
          </span>
        }

        <!-- User menu -->
        @if (user(); as u) {
          <div class="relative">
            <button class="btn btn-ghost flex h-10 items-center gap-2 px-1.5 sm:pr-3" aria-label="Menú de usuario" (click)="userMenuOpen.set(!userMenuOpen())">
              <span class="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">{{ initials(u.name) }}</span>
              <span class="hidden text-left sm:block">
                <span class="block text-sm font-medium leading-tight">{{ u.name }}</span>
                <span class="block text-xs capitalize text-muted-foreground">{{ u.role }}</span>
              </span>
            </button>

            @if (userMenuOpen()) {
              <div class="fixed inset-0 z-40" (click)="userMenuOpen.set(false)"></div>
              <div class="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                <div class="px-2 py-1.5">
                  <div class="text-sm font-medium">{{ u.name }}</div>
                  <div class="text-xs font-normal text-muted-foreground">{{ u.email }}</div>
                </div>
                <div class="my-1 h-px bg-border"></div>
                @if (org(); as o) {
                  <div class="px-2 py-1.5 text-xs text-muted-foreground">
                    <div class="flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /></svg>
                      <span class="truncate">{{ o.name }}</span>
                    </div>
                    <div class="mt-0.5 flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      <span class="capitalize">Rol: {{ u.role }}</span>
                    </div>
                  </div>
                }
                <div class="my-1 h-px bg-border"></div>
                <button class="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent" (click)="handleLogout()">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                  Cerrar sesión
                </button>
              </div>
            }
          </div>
        }
      </div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  protected auth = inject(AuthService);
  protected ui = inject(UiService);
  protected router = inject(RouterService);
  private api = inject(ApiClient);

  protected locales = LOCALES;
  protected labels = LOCALE_LABELS;
  protected userMenuOpen = signal(false);

  protected user = computed(() => this.auth.user());
  protected org = computed(() => this.auth.organization());
  protected title = computed(() => VIEW_TITLES[this.router.view()] ?? "ShipCore");

  initials(name: string): string {
    return name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  planBadgeClass(plan: string): string {
    switch (plan) {
      case "enterprise":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "growth":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  }

  protected onLocaleChange(e: Event): void {
    const v = (e.target as HTMLSelectElement).value as Locale;
    this.ui.setLocale(v);
  }

  protected handleLogout(): void {
    this.userMenuOpen.set(false);
    this.api.logout();
  }
}

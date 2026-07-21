import { Component, computed, inject , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { AuthService } from "../core/services/auth.service";
import { RouterService } from "../core/services/router.service";
import { UiService } from "../core/services/ui.service";
import { ToastService } from "../core/services/toast.service";
import { ApiClient } from "../core/services/api-client";
import { ViewName } from "../core/models/shipcore.models";

interface NavItem {
  view: ViewName;
  label: string;
  icon: string;
  roles: Array<"admin" | "operador">;
}

const NAV: NavItem[] = [
  { view: "dashboard", label: "Dashboard", icon: "dashboard", roles: ["admin", "operador"] },
  { view: "quote-form", label: "Cotizaciones", icon: "calc", roles: ["admin", "operador"] },
  { view: "history", label: "Historial", icon: "history", roles: ["admin", "operador"] },
  { view: "carriers", label: "Couriers y Tarifas", icon: "truck", roles: ["admin", "operador"] },
  { view: "rules", label: "Reglas de negocio", icon: "gavel", roles: ["admin"] },
  { view: "org", label: "Configuración", icon: "settings", roles: ["admin"] },
];

@Component({
  selector: "app-sidebar",
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="flex h-full w-60 flex-col bg-sidebar text-sidebar-foreground">
      <div class="flex h-16 items-center gap-2 px-5">
        <div class="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10.189V14" /><path d="M12 2v3" /><path d="M20 16.5C20 19.538 16.418 22 12 22s-8-2.462-8-5.5C4 14 8 11 12 11s8 3 8 5.5z" /></svg>
        </div>
        <div class="flex flex-col">
          <span class="text-base font-semibold leading-tight">ShipCore</span>
          <span class="text-[11px] text-sidebar-foreground/60">Freight Quoting</span>
        </div>
        <button class="btn btn-ghost btn-icon ml-auto text-sidebar-foreground hover:bg-sidebar-accent lg:hidden" aria-label="Cerrar menú" (click)="ui.setSidebarOpen(false)">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      </div>

      <div class="scroll-area-shipcore flex-1 overflow-y-auto px-3">
        <nav class="space-y-1 py-2" aria-label="Navegación principal">
          @for (item of items(); track item.view) {
            <button
              type="button"
              (click)="handleNav(item.view)"
              [attr.aria-current]="currentView() === item.view ? 'page' : null"
              class="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              [class]="currentView() === item.view ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'"
            >
              <span class="shrink-0" [innerHTML]="iconSvg(item.icon)"></span>
              {{ item.label }}
            </button>
          }
        </nav>
      </div>

      <div class="border-t border-sidebar-border p-3">
        <button type="button" (click)="handleLogout()" class="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
          Cerrar sesión
        </button>
      </div>
    </aside>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  protected auth = inject(AuthService);
  protected router = inject(RouterService);
  protected ui = inject(UiService);
  private api = inject(ApiClient);

  protected currentView = computed(() => this.router.view());
  protected items = computed<NavItem[]>(() => {
    const role = this.auth.role();
    if (!role) return [];
    return NAV.filter((n) => n.roles.includes(role));
  });

  handleNav(view: ViewName): void {
    this.router.navigate(view);
    this.ui.setSidebarOpen(false);
  }

  handleLogout(): void {
    this.api.logout();
  }

  iconSvg(name: string): string {
    const icons: Record<string, string> = {
      dashboard: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>',
      calc: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /></svg>',
      history: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></svg>',
      truck: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg>',
      gavel: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8" /><path d="m16 16 6-6" /><path d="m8 8 6-6" /><path d="m9 7 8 8" /><path d="m21 11-8-8" /></svg>',
      settings: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>',
    };
    return icons[name] ?? "";
  }
}

import { Component, inject , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { UiService } from "../core/services/ui.service";
import { SidebarComponent } from "./sidebar.component";
import { NavbarComponent } from "./navbar.component";
import { ViewRouterComponent } from "./view-router.component";

@Component({
  selector: "app-dashboard-layout",
  standalone: true,
  imports: [CommonModule, SidebarComponent, NavbarComponent, ViewRouterComponent],
  template: `
    <div class="flex min-h-screen bg-background">
      <!-- Desktop sidebar -->
      <div class="hidden w-60 shrink-0 border-r border-sidebar-border lg:block">
        <div class="sticky top-0 h-screen">
          <app-sidebar />
        </div>
      </div>

      <!-- Mobile sidebar (Sheet) -->
      @if (ui.sidebarOpen()) {
        <div class="fixed inset-0 z-50 lg:hidden">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" (click)="ui.setSidebarOpen(false)"></div>
          <div class="absolute left-0 top-0 h-full w-64 border-r bg-sidebar shadow-xl">
            <app-sidebar />
          </div>
        </div>
      }

      <!-- Main column -->
      <div class="flex min-w-0 flex-1 flex-col">
        <app-navbar />
        <main id="shipcore-main" class="flex-1 overflow-y-auto">
          <div class="mx-auto w-full max-w-7xl p-4 sm:p-6">
            <app-view-router />
          </div>
        </main>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutComponent {
  protected ui = inject(UiService);
}

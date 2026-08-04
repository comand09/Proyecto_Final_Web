import { Component, computed, inject , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterService } from "../core/services/router.service";
import { AuthService } from "../core/services/auth.service";
import { Role } from "../core/models/shipcore.models";
import { DashboardPageComponent } from "../features/dashboard/pages/dashboard.page";
import { QuoteFormPageComponent } from "../features/quotes/pages/quote-form.page";
import { QuoteResultsPageComponent } from "../features/quotes/pages/quote-results.page";
import { QuoteDetailPageComponent } from "../features/quotes/pages/quote-detail.page";
import { HistoryPageComponent } from "../features/history/pages/history.page";
import { CarriersListPageComponent } from "../features/carriers/pages/carriers-list.page";
import { RulesListPageComponent } from "../features/rules/pages/rules-list.page";
import { OrgConfigPageComponent } from "../features/org/pages/org-config.page";
import { OrgPlanComponent } from "../features/org/components/org-plan.component";
import { RoleDeniedComponent } from "../shared/components/role-denied/role-denied.component";

@Component({
  selector: "app-view-router",
  standalone: true,
  imports: [
    CommonModule,
    DashboardPageComponent,
    QuoteFormPageComponent,
    QuoteResultsPageComponent,
    QuoteDetailPageComponent,
    HistoryPageComponent,
    CarriersListPageComponent,
    RulesListPageComponent,
    OrgConfigPageComponent,
    OrgPlanComponent,
    RoleDeniedComponent,
  ],
  template: `
    @switch (view()) {
      @case ("dashboard") { <app-dashboard-page /> }
      @case ("quote-form") { <app-quote-form-page /> }
      @case ("quote-results") { <app-quote-results-page [quoteId]="params()['id']" /> }
      @case ("quote-detail") { <app-quote-detail-page [quoteId]="params()['id']" /> }
      @case ("history") { <app-history-page /> }
      @case ("carriers") { <app-carriers-list-page /> }
      @case ("plan") { <app-org-plan /> }
      @case ("rules") {
        @if (canAccessRules()) { <app-rules-list-page /> }
        @else { <app-role-denied /> }
      }
      @case ("org") {
        @if (canAccessOrg()) { <app-org-config-page /> }
        @else { <app-role-denied /> }
      }
      @default { <app-dashboard-page /> }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewRouterComponent {
  private router = inject(RouterService);
  private auth = inject(AuthService);

  protected view = computed(() => this.router.view());
  protected params = computed(() => this.router.params());
  protected canAccessRules = computed(() => this.auth.role() === "admin");
  protected canAccessOrg = computed(() => this.auth.role() === "admin");
}

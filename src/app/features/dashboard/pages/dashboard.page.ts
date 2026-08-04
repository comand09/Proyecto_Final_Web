import { Component, computed, inject, signal, OnInit , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ApiClient } from "../../../core/services/api-client";
import { AuthService } from "../../../core/services/auth.service";
import { UiService } from "../../../core/services/ui.service";
import { I18nService } from "../../../core/services/i18n.service";
import { RouterService } from "../../../core/services/router.service";
import { DashboardData } from "../../../core/models/shipcore.models";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { DataStateComponent } from "../../../shared/components/data-state/data-state.component";
import { BarChartComponent, BarChartDatum } from "../../../shared/components/bar-chart/bar-chart.component";
import { TranslatePipe } from "../../../shared/pipes/translate.pipe";

@Component({
  selector: "app-dashboard-page",
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, DataStateComponent, BarChartComponent, TranslatePipe],
  template: `
    <div class="dashboard-page space-y-8">
      <app-page-header
        [title]="'view.dashboard' | t"
        [description]="'dashboard.description' | t"
        [actionsTpl]="actionsTpl"
      ></app-page-header>

      <ng-template #actionsTpl>
        <button class="btn btn-outline btn-sm" (click)="refresh()" [disabled]="loading()">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" [class.animate-spin]="loading()"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
          {{ 'action.refresh' | t }}
        </button>
      </ng-template>

      <app-data-state [isLoading]="loading()" [error]="error()" [onRetry]="refresh" [empty]="!loading() && !error() && !data()">
        @if (data(); as d) {
          <!-- KPIs -->
          <div class="dashboard-kpi-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <!-- KPI: Quotes this month -->
            <div class="card overflow-hidden">
              <div class="card-content relative p-5">
                <div class="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-primary/40 to-primary/0"></div>
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ 'kpi.quotesMonth' | t }}</p>
                    <p class="mt-2 text-3xl font-bold tracking-tight">{{ d.kpis.quotesMonth }}</p>
                    <p class="mt-1.5 text-xs text-muted-foreground">
                      {{ 'kpi.usage' | t }}: <span class="font-medium text-foreground">{{ d.organization.currentUsage }}</span> / {{ d.organization.softLimit }} (soft)
                    </p>
                  </div>
                  <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /></svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- KPI: Active carriers -->
            <div class="card overflow-hidden">
              <div class="card-content relative p-5">
                <div class="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-sky-400/40 to-sky-400/0"></div>
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ 'kpi.activeCarriers' | t }}</p>
                    <p class="mt-2 text-3xl font-bold tracking-tight">{{ d.kpis.activeCarriers }}</p>
                    <p class="mt-1.5 text-xs text-muted-foreground">
                      <span class="font-medium text-emerald-600 dark:text-emerald-400">{{ 'kpi.allOperational' | t }}</span>
                    </p>
                  </div>
                  <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- KPI: Avg rate -->
            <div class="card overflow-hidden">
              <div class="card-content relative p-5">
                <div class="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-emerald-400/40 to-emerald-400/0"></div>
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ 'kpi.avgRate' | t }}</p>
                    <p class="mt-2 text-3xl font-bold tracking-tight">{{ fmtCurrency(d.kpis.avgRate) }}</p>
                    <p class="mt-1.5 text-xs text-muted-foreground">
                      <span class="font-medium text-foreground">{{ d.kpis.quotesMonth }}</span> {{ ('nav.quotes' | t).toLowerCase() }}
                    </p>
                  </div>
                  <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- KPI: Rate alerts -->
            <div class="card overflow-hidden">
              <div class="card-content relative p-5">
                <div class="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-rose-400/40 to-rose-400/0"></div>
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ 'kpi.rateAlerts' | t }}</p>
                    <p class="mt-2 text-3xl font-bold tracking-tight">{{ d.kpis.rateAlerts }}</p>
                    <p class="mt-1.5 text-xs text-muted-foreground">
                      {{ expiredCount(d) }} {{ 'kpi.expired' | t }} · {{ expiringCount(d) }} {{ 'kpi.expiring' | t }}
                    </p>
                  </div>
                  <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Two-column layout -->
          <div class="dashboard-main-grid grid grid-cols-1 xl:grid-cols-3">
            <!-- Bar chart -->
            <div class="card lg:col-span-2">
              <div class="card-header flex-row items-center justify-between">
                <div>
                  <div class="card-title text-base">{{ 'dashboard.quotesByCarrier' | t }}</div>
                  <p class="card-description">{{ 'dashboard.quotesByCarrierDesc' | t }}</p>
                </div>
                <span class="badge badge-secondary">{{ totalQuotes(d) }} {{ 'label.total' | t }}</span>
              </div>
              <div class="card-content">
                <app-bar-chart [dataInput]="chartData(d)" [height]="280"></app-bar-chart>
              </div>
            </div>

            <!-- Rate alerts -->
            <div class="card">
              <div class="card-header flex-row items-center justify-between">
                <div class="card-title text-base">{{ 'kpi.rateAlerts' | t }}</div>
                @if (d.rateAlerts.length > 0) {
                  <span class="badge bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">{{ d.rateAlerts.length }}</span>
                }
              </div>
              <div class="card-content">
                @if (d.rateAlerts.length === 0) {
                  <div class="flex flex-col items-center gap-2 py-8 text-center">
                    <div class="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    </div>
                    <p class="text-sm font-medium">{{ 'dashboard.noRateAlerts' | t }}</p>
                    <p class="text-xs text-muted-foreground">{{ 'dashboard.noRateAlertsDesc' | t }}</p>
                  </div>
                } @else {
                  <ul class="divide-y">
                    @for (a of d.rateAlerts; track a.id) {
                      <li class="flex items-center gap-3 py-2.5">
                        <div
                          class="flex size-9 shrink-0 items-center justify-center rounded-lg"
                          [class]="a.expired ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'"
                        >
                          @if (a.expired) {
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                          } @else {
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7.5h-3.5L14 4h-4L6.5 7.5H3a1 1 0 0 0-1 1V19a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V8.5a1 1 0 0 0-1-1Z" /><path d="M9 12h6" /></svg>
                          }
                        </div>
                        <div class="min-w-0 flex-1">
                          <p class="truncate text-sm font-medium">{{ a.carrier.name }} · <span class="capitalize text-muted-foreground">{{ a.zone }}</span></p>
                          <p class="text-xs text-muted-foreground">Vence {{ fmtDate(a.validTo) }} · v{{ a.version }}</p>
                        </div>
                        <span
                          class="badge"
                          [class]="a.expired
                            ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400'
                            : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400'"
                        >
                          {{ a.expired ? ('status.expired' | t) : daysUntil(a.validTo) === 0 ? ('status.today' | t) : daysUntil(a.validTo) + "d" }}
                        </span>
                      </li>
                    }
                  </ul>
                }
              </div>
            </div>
          </div>

          <!-- Recent quotes -->
          <div class="card">
            <div class="card-header flex-row items-center justify-between">
              <div class="card-title text-base">{{ 'dashboard.recentQuotes' | t }}</div>
              <button class="btn btn-ghost btn-sm" (click)="goToHistory()">{{ 'dashboard.viewHistory' | t }}</button>
            </div>
            <div class="card-content">
              @if (d.recentQuotes.length === 0) {
                <p class="py-6 text-center text-sm text-muted-foreground">{{ 'dashboard.noRecentQuotes' | t }}</p>
              } @else {
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="border-b text-left text-xs text-muted-foreground">
                        <th class="px-3 py-2.5 font-medium">{{ 'label.date' | t }}</th>
                        <th class="px-3 py-2.5 font-medium">{{ 'label.route' | t }}</th>
                        <th class="px-3 py-2.5 font-medium">{{ 'label.carrier' | t }}</th>
                        <th class="px-3 py-2.5 text-right font-medium">{{ 'label.price' | t }}</th>
                        <th class="px-3 py-2.5 font-medium">{{ 'label.status' | t }}</th>
                        <th class="px-3 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (q of d.recentQuotes; track q.id) {
                        <tr class="border-b last:border-0 transition-colors hover:bg-muted/40">
                          <td class="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">{{ fmtDateTime(q.createdAt) }}</td>
                          <td class="px-3 py-2.5 whitespace-nowrap">
                            <span class="font-medium">{{ q.origin }}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-1 inline text-muted-foreground"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                            <span class="font-medium">{{ q.destination }}</span>
                            <span class="ml-1 text-xs text-muted-foreground">· {{ q.weightKg }} kg</span>
                          </td>
                          <td class="px-3 py-2.5 whitespace-nowrap">
                            @if (q.selectedCarrier?.name) {
                              {{ q.selectedCarrier!.name }}
                            } @else {
                              <span class="text-muted-foreground">—</span>
                            }
                          </td>
                          <td class="px-3 py-2.5 whitespace-nowrap text-right font-medium tabular-nums">
                            @if (q.selectedPrice != null) {
                              {{ fmtCurrency(q.selectedPrice) }}
                            } @else {
                              <span class="text-muted-foreground">—</span>
                            }
                          </td>
                          <td class="px-3 py-2.5 whitespace-nowrap">
                            @switch (q.status) {
                              @case ("booked") { <span class="badge border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">{{ 'status.booked' | t }}</span> }
                              @case ("expired") { <span class="badge badge-secondary">{{ 'status.expired' | t }}</span> }
                              @default { <span class="badge badge-outline">{{ 'status.quoted' | t }}</span> }
                            }
                          </td>
                          <td class="px-3 py-2.5 text-right">
                            <button class="btn btn-ghost btn-sm" (click)="goToDetail(q.id)">{{ 'action.view' | t }}</button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>
        }
      </app-data-state>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent implements OnInit {
  protected api = inject(ApiClient);
  protected auth = inject(AuthService);
  protected ui = inject(UiService);
  private i18n = inject(I18nService);
  private router = inject(RouterService);

  protected loading = signal(false);
  protected error = signal<unknown>(null);
  protected data = signal<DashboardData | null>(null);

  ngOnInit(): void {
    this.refresh();
  }

  refresh = (): void => {
    this.loading.set(true);
    this.error.set(null);
    this.api.dashboardObs().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => {
        // Fallback a mock
        try {
          const d = this.api.dashboard();
          this.data.set(d);
        } catch (e) {
          this.error.set(e);
        } finally {
          this.loading.set(false);
        }
      },
    });
  };

  fmtCurrency(amount: number): string {
    const org = this.auth.organization();
    const country = (org?.country ?? "AR") as any;
    return this.i18n.formatCurrency(amount, this.ui.locale(), country);
  }

  fmtDate(d: string): string {
    return this.i18n.formatDate(d, this.ui.locale());
  }

  fmtDateTime(d: string): string {
    return this.i18n.formatDateTime(d, this.ui.locale());
  }

  daysUntil(iso: string): number {
    const ms = new Date(iso).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }

  /** Build bar chart data from dashboard data. */
  chartData(d: DashboardData): BarChartDatum[] {
    return (d.quotesByCarrier ?? []).map((c) => ({
      label: c.name,
      value: c.count,
      sublabel: c.carrierId,
    }));
  }

  totalQuotes(d: DashboardData): number {
    return (d.quotesByCarrier ?? []).reduce((sum, c) => sum + (c.count ?? 0), 0);
  }

  expiredCount(d: DashboardData): number {
    return (d.rateAlerts ?? []).filter((a) => a.expired).length;
  }

  expiringCount(d: DashboardData): number {
    return (d.rateAlerts ?? []).filter((a) => !a.expired).length;
  }

  goToDetail(quoteId: string): void {
    this.router.navigate("quote-detail", { id: quoteId });
  }

  goToHistory(): void {
    this.router.navigate("history", {});
  }
}

import { Component, Input, OnInit, computed, inject, signal, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ApiClient } from "../../../core/services/api-client";
import { RouterService } from "../../../core/services/router.service";
import { AuthService } from "../../../core/services/auth.service";
import { UiService } from "../../../core/services/ui.service";
import { I18nService } from "../../../core/services/i18n.service";
import { ToastService } from "../../../core/services/toast.service";
import { Quote, QuoteResult } from "../../../core/models/shipcore.models";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { DataStateComponent } from "../../../shared/components/data-state/data-state.component";
import { TranslatePipe } from "../../../shared/pipes/translate.pipe";

type SortKey = "price" | "transit" | "carrier";

@Component({
  selector: "app-quote-results-page",
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, DataStateComponent, TranslatePipe],
  template: `
    <div class="shipcore-page quote-results-page space-y-8">
      <app-page-header
        [title]="'view.quoteResults' | t"
        [description]="data() ? data()!.origin + ' → ' + data()!.destination + ' · ' + data()!.weightKg + ' kg · ' + data()!.serviceType : 'Compará las tarifas disponibles.'"
        [breadcrumbs]="breadcrumbs"
        [actionsTpl]="actionsTpl"
      ></app-page-header>

      <ng-template #actionsTpl>
        <button class="btn btn-outline btn-sm" (click)="goForm()">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
          {{ 'action.newQuote' | t }}
        </button>
      </ng-template>

      @if (!quoteId) {
        <p class="text-sm text-muted-foreground">{{ 'quote.notSpecified' | t }}</p>
      } @else {
        <app-data-state class="shipcore-data-block" [isLoading]="loading()" [error]="error()" [onRetry]="refresh" [empty]="!loading() && !error() && !data()">
          @if (data(); as q) {
            <!-- Summary -->
            <div class="summary-grid grid grid-cols-2 sm:grid-cols-5">
              <div class="card p-3">
                <p class="text-xs text-muted-foreground">{{ 'label.origin' | t }}</p>
                <p class="text-sm font-medium">{{ q.origin }}</p>
              </div>
              <div class="card p-3">
                <p class="text-xs text-muted-foreground">{{ 'label.destination' | t }}</p>
                <p class="text-sm font-medium">{{ q.destination }}</p>
              </div>
              <div class="card p-3">
                <p class="text-xs text-muted-foreground">{{ 'label.weight' | t }}</p>
                <p class="text-sm font-medium">{{ q.weightKg }} kg</p>
              </div>
              <div class="card p-3">
                <p class="text-xs text-muted-foreground">{{ 'label.distance' | t }}</p>
                <p class="text-sm font-medium">{{ q.distanceKm }} km</p>
              </div>
              <div class="card p-3">
                <p class="text-xs text-muted-foreground">{{ 'label.service' | t }}</p>
                <p class="text-sm font-medium capitalize">{{ q.serviceType }}</p>
              </div>
            </div>

            <!-- Results -->
            <div class="card">
              <div class="card-header">
                <div class="card-title text-base flex items-center gap-2">
                  {{ 'quote.resultsAvailable' | t }}
                  <span class="badge badge-secondary">{{ sortedResults().length }}</span>
                  <div class="ml-auto flex items-center gap-1 text-xs">
                    <span class="text-muted-foreground">{{ 'quote.sortBy' | t }}</span>
                    <select class="h-7 rounded border bg-background px-2 text-xs" [value]="sortKey()" (change)="onSortChange($event)">
                      <option value="price">{{ 'label.price' | t }}</option>
                      <option value="transit">{{ 'label.transit' | t }}</option>
                      <option value="carrier">{{ 'label.carrier' | t }}</option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="card-content">
                @if (sortedResults().length === 0) {
                  <div class="py-10 text-center text-sm text-muted-foreground">
                    {{ 'quote.noResults' | t }}
                  </div>
                } @else {
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead>
                        <tr class="border-b text-left text-xs text-muted-foreground">
                          <th class="px-3 py-2 font-medium">{{ 'label.carrier' | t }}</th>
                          <th class="px-3 py-2 font-medium">{{ 'label.version' | t }}</th>
                          <th class="px-3 py-2 text-right font-medium">{{ 'label.price' | t }}</th>
                          <th class="px-3 py-2 font-medium">{{ 'label.transit' | t }}</th>
                          <th class="px-3 py-2 font-medium">{{ 'label.restrictions' | t }}</th>
                          <th class="px-3 py-2 text-right font-medium">{{ 'label.action' | t }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (r of sortedResults(); track r.id) {
                          <tr class="border-b last:border-0" [ngClass]="{'bg-emerald-50': r.selected, 'dark:bg-emerald-500/10': r.selected}">
                            <td class="px-3 py-2 whitespace-nowrap">
                              <div class="flex items-center gap-2">
                                @if (r.preferred) {
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                }
                                <span class="font-medium">{{ r.carrier?.name ?? '—' }}</span>
                              </div>
                              <span class="text-xs text-muted-foreground">{{ r.carrier?.code }}</span>
                            </td>
                            <td class="px-3 py-2 whitespace-nowrap font-mono text-xs">v{{ r.rateVersionUsed }}</td>
                            <td class="px-3 py-2 whitespace-nowrap text-right font-semibold tabular-nums">{{ fmtCurrency(r.price) }}</td>
                            <td class="px-3 py-2 whitespace-nowrap text-xs">{{ r.transitDaysMin }}-{{ r.transitDaysMax }} días</td>
                            <td class="px-3 py-2 text-xs text-muted-foreground max-w-xs">
                              @if (r.restrictions) { {{ r.restrictions }} } @else { <span class="text-muted-foreground/60">—</span> }
                            </td>
                            <td class="px-3 py-2 text-right">
                              @if (r.selected) {
                                <span class="badge bg-emerald-100 text-emerald-700">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                  {{ 'action.selected' | t }}
                                </span>
                              } @else {
                                <button class="btn btn-primary btn-sm" (click)="selectResult(r)" [disabled]="selecting() === r.id || navigating()">
                                  @if (selecting() === r.id) {
                                    <svg class="size-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                  } @else {
                                    {{ 'action.select' | t }}
                                  }
                                </button>
                              }
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
      }
    </div>

    <!-- ── Overlay retorno al dashboard ── -->
    @if (navigating()) {
      <div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5" style="background:rgba(15,118,110,0.95);backdrop-filter:blur(8px)">
        <svg class="size-16 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <div class="text-center">
          <p class="text-2xl font-bold text-white">{{ 'quote.selectedCarrier' | t }}</p>
          <p class="mt-1 text-white/90 text-sm">Retornando al dashboard…</p>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteResultsPageComponent implements OnInit {
  @Input() quoteId?: string;

  private api = inject(ApiClient);
  private router = inject(RouterService);
  private auth = inject(AuthService);
  private ui = inject(UiService);
  private i18n = inject(I18nService);
  private toast = inject(ToastService);

  protected loading = signal(false);
  protected error = signal<unknown>(null);
  protected data = signal<Quote | null>(null);
  protected sortKey = signal<SortKey>("price");
  protected selecting = signal<string | null>(null);
  protected navigating = signal(false);

  protected breadcrumbs = [
    { label: "Dashboard", onClick: () => this.goDashboard() },
    { label: "Cotizaciones", onClick: () => this.goForm() },
    { label: "Resultados" },
  ];

  protected sortedResults = computed<QuoteResult[]>(() => {
    const q = this.data();
    if (!q?.results) return [];
    const arr = [...q.results];
    const key = this.sortKey();
    arr.sort((a, b) => {
      if (key === "price") return a.price - b.price;
      if (key === "transit") return a.transitDaysMin - b.transitDaysMin;
      return (a.carrier?.name ?? "").localeCompare(b.carrier?.name ?? "");
    });
    return arr;
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh = (): void => {
    if (!this.quoteId) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.getQuoteObs(this.quoteId!).subscribe({
      next: (q) => {
        this.data.set(q);
        this.loading.set(false);
      },
      error: () => {
        try {
          const q = this.api.getQuote(this.quoteId!);
          this.data.set(q);
        } catch (e) {
          this.error.set(e);
        } finally {
          this.loading.set(false);
        }
      },
    });
  };

  onSortChange(e: Event): void {
    const v = (e.target as HTMLSelectElement).value as SortKey;
    this.sortKey.set(v);
  }

  selectResult(r: QuoteResult): void {
    if (!this.quoteId || this.selecting() || this.navigating()) return;
    this.selecting.set(r.id);

    const handleSuccess = (updated?: Quote) => {
      this.toast.success("Courier seleccionado", `${r.carrier?.name} · ${this.fmtCurrency(r.price)}`);
      if (updated) this.data.set(updated);
      this.selecting.set(null);
      this.navigating.set(true);
      setTimeout(() => {
        this.router.navigate("dashboard");
      }, 2000);
    };

    this.api.selectQuoteResultObs(this.quoteId!, r.id).subscribe({
      next: (updated) => handleSuccess(updated),
      error: () => {
        try {
          this.api.selectQuoteResult(this.quoteId!, r.id);
          handleSuccess();
        } catch (e: any) {
          this.toast.error("Error", e?.message ?? "No se pudo seleccionar");
          this.selecting.set(null);
        }
      },
    });
  }

  fmtCurrency(amount: number): string {
    const org = this.auth.organization();
    const country = (org?.country ?? "AR") as any;
    return this.i18n.formatCurrency(amount, this.ui.locale(), country);
  }

  goDashboard(): void {
    this.router.navigate("dashboard");
  }

  goForm(): void {
    this.router.navigate("quote-form");
  }
}

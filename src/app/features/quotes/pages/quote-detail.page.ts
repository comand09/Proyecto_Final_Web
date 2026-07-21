import { Component, Input, OnInit, inject, signal , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ApiClient } from "../../../core/services/api-client";
import { RouterService } from "../../../core/services/router.service";
import { AuthService } from "../../../core/services/auth.service";
import { UiService } from "../../../core/services/ui.service";
import { I18nService } from "../../../core/services/i18n.service";
import { Quote } from "../../../core/models/shipcore.models";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { DataStateComponent } from "../../../shared/components/data-state/data-state.component";

@Component({
  selector: "app-quote-detail-page",
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, DataStateComponent],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Detalle de cotización"
        [description]="data() ? fmtDateTime(data()!.createdAt) : 'Cargando…'"
        [breadcrumbs]="breadcrumbs"
        [actionsTpl]="actionsTpl"
      ></app-page-header>

      <ng-template #actionsTpl>
        <button class="btn btn-outline btn-sm" (click)="goHistory()">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
          Volver
        </button>
      </ng-template>

      @if (!quoteId) {
        <p class="text-sm text-muted-foreground">No se especificó una cotización.</p>
      } @else {
        <app-data-state [isLoading]="loading()" [error]="error()" [onRetry]="refresh" [empty]="!loading() && !error() && !data()">
          @if (data(); as q) {
            <!-- Quote info -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div class="card p-4">
                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                  Ruta
                </div>
                <p class="mt-1 text-sm font-medium">{{ q.origin }} → {{ q.destination }}</p>
                <p class="text-xs text-muted-foreground capitalize">{{ q.originZone }} → {{ q.destZone }}</p>
              </div>
              <div class="card p-4">
                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /></svg>
                  Distancia
                </div>
                <p class="mt-1 text-sm font-medium">{{ q.distanceKm }} km</p>
              </div>
              <div class="card p-4">
                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                  Estado
                </div>
                <p class="mt-1 text-sm font-medium capitalize">
                  @switch (q.status) {
                    @case ("booked") { <span class="badge bg-emerald-100 text-emerald-700">Reservada</span> }
                    @case ("expired") { <span class="badge badge-secondary">Expirada</span> }
                    @default { <span class="badge badge-outline">Cotizada</span> }
                  }
                </p>
              </div>
              <div class="card p-4">
                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                  Solicitado por
                </div>
                <p class="mt-1 text-sm font-medium">{{ q.user?.name ?? '—' }}</p>
                <p class="text-xs text-muted-foreground">{{ q.user?.email }}</p>
              </div>
            </div>

            <!-- Package info -->
            <div class="card">
              <div class="card-header">
                <div class="card-title text-base">Datos del envío</div>
              </div>
              <div class="card-content grid grid-cols-2 gap-4 sm:grid-cols-5">
                <div>
                  <p class="text-xs text-muted-foreground">Peso</p>
                  <p class="text-sm font-medium">{{ q.weightKg }} kg</p>
                </div>
                <div>
                  <p class="text-xs text-muted-foreground">Largo</p>
                  <p class="text-sm font-medium">{{ q.lengthCm }} cm</p>
                </div>
                <div>
                  <p class="text-xs text-muted-foreground">Ancho</p>
                  <p class="text-sm font-medium">{{ q.widthCm }} cm</p>
                </div>
                <div>
                  <p class="text-xs text-muted-foreground">Alto</p>
                  <p class="text-sm font-medium">{{ q.heightCm }} cm</p>
                </div>
                <div>
                  <p class="text-xs text-muted-foreground">Servicio</p>
                  <p class="text-sm font-medium capitalize">{{ q.serviceType }}</p>
                </div>
              </div>
            </div>

            <!-- Results table -->
            <div class="card">
              <div class="card-header">
                <div class="card-title text-base">Resultados de cotización</div>
                <p class="card-description">Resultados con trazabilidad de versión de tarifa.</p>
              </div>
              <div class="card-content">
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="border-b text-left text-xs text-muted-foreground">
                        <th class="px-3 py-2 font-medium">Courier</th>
                        <th class="px-3 py-2 font-medium">Versión</th>
                        <th class="px-3 py-2 text-right font-medium">Precio</th>
                        <th class="px-3 py-2 font-medium">Tránsito</th>
                        <th class="px-3 py-2 font-medium">Restricciones</th>
                        <th class="px-3 py-2 text-right font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (r of q.results; track r.id) {
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
                              <span class="badge bg-emerald-100 text-emerald-700">Seleccionado</span>
                            } @else {
                              <span class="text-xs text-muted-foreground">—</span>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          }
        </app-data-state>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteDetailPageComponent implements OnInit {
  @Input() quoteId?: string;

  private api = inject(ApiClient);
  private router = inject(RouterService);
  private auth = inject(AuthService);
  private ui = inject(UiService);
  private i18n = inject(I18nService);

  protected loading = signal(false);
  protected error = signal<unknown>(null);
  protected data = signal<Quote | null>(null);

  protected breadcrumbs = [
    { label: "Dashboard", onClick: () => this.goDashboard() },
    { label: "Historial", onClick: () => this.goHistory() },
    { label: "Detalle" },
  ];

  ngOnInit(): void {
    this.refresh();
  }

  refresh = (): void => {
    if (!this.quoteId) return;
    this.loading.set(true);
    this.error.set(null);
    setTimeout(() => {
      try {
        const q = this.api.getQuote(this.quoteId!);
        this.data.set(q);
      } catch (e) {
        this.error.set(e);
      } finally {
        this.loading.set(false);
      }
    }, 100);
  };

  fmtCurrency(amount: number): string {
    const org = this.auth.organization();
    const country = (org?.country ?? "AR") as any;
    return this.i18n.formatCurrency(amount, this.ui.locale(), country);
  }

  fmtDateTime(d: string): string {
    return this.i18n.formatDateTime(d, this.ui.locale());
  }

  goDashboard(): void {
    this.router.navigate("dashboard");
  }

  goHistory(): void {
    this.router.navigate("history");
  }
}

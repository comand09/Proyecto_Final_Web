import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ApiClient } from "../../../core/services/api-client";
import { AuthService } from "../../../core/services/auth.service";
import { UiService } from "../../../core/services/ui.service";
import { I18nService } from "../../../core/services/i18n.service";
import { ToastService } from "../../../core/services/toast.service";
import { Carrier, CarrierRate, RateStatus, Zone } from "../../../core/models/shipcore.models";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { DataStateComponent } from "../../../shared/components/data-state/data-state.component";
import { ConfirmDialogComponent } from "../../../shared/components/confirm-dialog/confirm-dialog.component";
import { RateFormDialogComponent } from "../components/rate-form-dialog.component";
import { RateVersionHistoryDialogComponent } from "../components/rate-version-history-dialog.component";
import { CarrierFormDialogComponent } from "../components/carrier-form-dialog.component";
import { TranslatePipe } from "../../../shared/pipes/translate.pipe";

@Component({
  selector: "app-carriers-list-page",
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    DataStateComponent,
    ConfirmDialogComponent,
    RateFormDialogComponent,
    RateVersionHistoryDialogComponent,
    CarrierFormDialogComponent,
    TranslatePipe,
  ],
  template: `
    <div class="shipcore-page carriers-page space-y-8">
      <app-page-header
        [title]="'view.carriers' | t"
        [description]="'carriers.description' | t"
      ></app-page-header>

      <!-- Tabs -->
      <div class="shipcore-section space-y-6">
        <div class="carriers-toolbar">
          <div class="tabs-list">
            <button class="tabs-trigger" [class.tabs-trigger-active]="tab() === 'couriers'" (click)="tab.set('couriers')">{{ 'carriers.tab.carriers' | t }}</button>
            <button class="tabs-trigger" [class.tabs-trigger-active]="tab() === 'rates'" (click)="tab.set('rates')">{{ 'carriers.tab.rates' | t }}</button>
          </div>

          @if (isAdmin() && tab() === 'couriers') {
            <button class="btn btn-primary btn-sm" (click)="openCarrierCreate()">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
              {{ 'action.newCarrier' | t }}
            </button>
          }

          @if (isAdmin() && tab() === 'rates') {
            <button class="btn btn-primary btn-sm" (click)="openRateCreate()">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
              {{ 'action.newRate' | t }}
            </button>
          }
        </div>

        <!-- ─── Couriers tab ─── -->
        @if (tab() === 'couriers') {
          <app-data-state class="shipcore-data-block" [isLoading]="cLoading()" [error]="cError()" [onRetry]="refreshCarriers" [empty]="!cLoading() && !cError() && carriers().length === 0">
            <div class="card">
              <div class="card-content">
                @if (carriers().length === 0) {
                  <p class="py-8 text-center text-sm text-muted-foreground">{{ 'carriers.empty' | t }}</p>
                } @else {
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead>
                        <tr class="border-b text-left text-xs text-muted-foreground">
                          <th class="px-3 py-2 font-medium">{{ 'label.name' | t }}</th>
                          <th class="px-3 py-2 font-medium">Código</th>
                          <th class="px-3 py-2 font-medium text-center">{{ 'label.rates' | t }}</th>
                          <th class="px-3 py-2 font-medium">{{ 'label.status' | t }}</th>
                          @if (isAdmin()) {
                            <th class="px-3 py-2 font-medium text-right">{{ 'label.actions' | t }}</th>
                          }
                        </tr>
                      </thead>
                      <tbody>
                        @for (c of carriers(); track c.id) {
                          <tr class="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td class="px-3 py-2">
                              <div class="flex items-center gap-3">
                                <div class="carrier-logo" [title]="c.logoUrl ? 'Logo configurado' : 'Sin logo'">
                                  <span>{{ carrierInitials(c) }}</span>
                                  @if (c.logoUrl) {
                                    <img [src]="c.logoUrl" [alt]="'Logo de ' + c.name" (error)="hideBrokenLogo($event)" />
                                  }
                                </div>
                                <div class="min-w-0">
                                  <div class="truncate font-medium">{{ c.name }}</div>
                                  @if (c.logoUrl) {
                                    <div class="truncate text-xs text-muted-foreground">Logo configurado</div>
                                  }
                                </div>
                              </div>
                            </td>
                            <td class="px-3 py-2">
                              <span class="badge badge-outline font-mono">{{ c.code }}</span>
                            </td>
                            <td class="px-3 py-2 text-center text-xs text-muted-foreground">
                              {{ c.rateCount ?? 0 }}
                            </td>
                            <td class="px-3 py-2">
                              <span class="badge" [class]="c.active ? 'bg-emerald-100 text-emerald-700' : 'badge-outline'">
                                {{ c.active ? ('status.active' | t) : ('status.inactive' | t) }}
                              </span>
                            </td>
                            @if (isAdmin()) {
                              <td class="px-3 py-2 text-right">
                                <div class="flex items-center justify-end gap-1">
                                  <button class="btn btn-ghost btn-icon" style="height:32px;width:32px;"
                                          aria-label="Editar courier" (click)="openCarrierEdit(c)">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                                  </button>
                                  <button class="btn btn-ghost btn-icon text-destructive hover:text-destructive" style="height:32px;width:32px;"
                                          aria-label="Eliminar courier" (click)="deleteCarrierTarget.set(c)">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                  </button>
                                </div>
                              </td>
                            }
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            </div>
          </app-data-state>
        }

        <!-- ─── Rates tab ─── -->
        @if (tab() === 'rates') {
          <div class="shipcore-section space-y-6">
            <!-- Filters -->
            <div class="filters-card card">
              <div class="card-content">
                <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div class="relative flex-1 min-w-[200px]">
                <svg class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                <input type="text" [placeholder]="'filters.searchCarrierRate' | t" class="input pl-8" [value]="rateSearch()" (input)="onRateSearchInput($event)" />
              </div>
              <select class="input w-full sm:w-[180px]" [value]="rateCarrierFilter()" (change)="onRateCarrierFilterChange($event)">
                <option value="all">{{ 'filters.allCarriers' | t }}</option>
                @for (c of carriers(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
              <select class="input w-full sm:w-[140px]" [value]="rateZoneFilter()" (change)="onRateZoneFilterChange($event)">
                <option value="all">{{ 'filters.allFemale' | t }}</option>
                <option value="local">Local</option>
                <option value="nacional">Nacional</option>
                <option value="internacional">Internacional</option>
              </select>
              <select class="input w-full sm:w-[140px]" [value]="rateStatusFilter()" (change)="onRateStatusFilterChange($event)">
                <option value="all">{{ 'filters.all' | t }}</option>
                <option value="active">{{ 'status.rateActive' | t }}</option>
                <option value="inactive">{{ 'status.inactive' | t }}</option>
                <option value="draft">{{ 'status.draft' | t }}</option>
              </select>
                  @if (hasRateFilters()) {
                    <button class="btn btn-ghost btn-sm" (click)="clearRateFilters()">{{ 'action.clear' | t }}</button>
                  }
                </div>
              </div>
            </div>

            <app-data-state class="shipcore-data-block" [isLoading]="rLoading()" [error]="rError()" [onRetry]="refreshRates" [empty]="!rLoading() && !rError() && filteredRates().length === 0">
              <div class="card">
                <div class="card-content">
                  @if (filteredRates().length === 0) {
                    <p class="py-8 text-center text-sm text-muted-foreground">{{ 'rates.empty' | t }}</p>
                  } @else {
                    <div class="overflow-x-auto">
                      <table class="w-full text-sm">
                        <thead>
                          <tr class="border-b text-left text-xs text-muted-foreground">
                            <th class="px-3 py-2 font-medium">{{ 'label.carrier' | t }}</th>
                            <th class="px-3 py-2 font-medium">{{ 'label.zone' | t }}</th>
                            <th class="px-3 py-2 font-medium">{{ 'label.validity' | t }}</th>
                            <th class="px-3 py-2 font-medium text-center">{{ 'label.version' | t }}</th>
                            <th class="px-3 py-2 font-medium text-right">{{ 'label.base' | t }}</th>
                            <th class="px-3 py-2 font-medium">{{ 'label.status' | t }}</th>
                            @if (isAdmin()) {
                              <th class="px-3 py-2 font-medium text-right">{{ 'label.actions' | t }}</th>
                            }
                          </tr>
                        </thead>
                        <tbody>
                          @for (r of filteredRates(); track r.id) {
                            <tr class="border-b last:border-0 hover:bg-muted/30 transition-colors">
                              <td class="px-3 py-2">
                                <div class="font-medium">{{ r.carrier?.name ?? '—' }}</div>
                                <div class="text-xs text-muted-foreground">{{ r.carrier?.code ?? '' }}</div>
                              </td>
                              <td class="px-3 py-2">
                                <span class="badge badge-outline capitalize">{{ r.zone }}</span>
                              </td>
                              <td class="px-3 py-2 text-xs text-muted-foreground">
                                {{ i18n.formatDate(r.validFrom, ui.locale()) }} → {{ i18n.formatDate(r.validTo, ui.locale()) }}
                              </td>
                              <td class="px-3 py-2 text-center">
                                <span class="font-mono text-xs">v{{ r.version }}</span>
                              </td>
                              <td class="px-3 py-2 text-right font-medium">
                                {{ fmtCurrency(r.basePrice) }}
                              </td>
                              <td class="px-3 py-2">
                                <span class="badge" [class]="statusBadgeClass(r.status)">
                                  {{ statusLabel(r.status) }}
                                </span>
                              </td>
                              @if (isAdmin()) {
                                <td class="px-3 py-2 text-right">
                                  <div class="flex items-center justify-end gap-1">
                                    <button class="btn btn-ghost btn-icon" style="height:32px;width:32px;"
                                            aria-label="Editar tarifa" title="Editar tarifa" (click)="openRateEdit(r)">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                                    </button>
                                    <button class="btn btn-ghost btn-icon" style="height:32px;width:32px;"
                                            aria-label="Ver historial" title="Historial de versiones" (click)="openVersionHistory(r)">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
                                    </button>
                                    <button class="btn btn-ghost btn-icon text-destructive hover:text-destructive" style="height:32px;width:32px;"
                                            aria-label="Eliminar tarifa" (click)="deleteTarget.set(r)">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                    </button>
                                  </div>
                                </td>
                              }
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                </div>
              </div>
            </app-data-state>
          </div>
        }
      </div>

      <!-- Confirm: delete rate -->
      <app-confirm-dialog
        [open]="!!deleteTarget()"
        title="Eliminar tarifa"
        [description]="'¿Seguro que querés eliminar la tarifa de ' + (deleteTarget()?.carrier?.name ?? '') + ' zona ' + (deleteTarget()?.zone ?? '') + ' v' + (deleteTarget()?.version ?? 0) + '?'"
        [confirmLabel]="'action.delete' | t"
        [destructive]="true"
        (confirmed)="confirmDeleteRate()"
        (cancelled)="deleteTarget.set(null)"
      ></app-confirm-dialog>

      <!-- Confirm: delete carrier -->
      <app-confirm-dialog
        [open]="!!deleteCarrierTarget()"
        title="Eliminar courier"
        [description]="'¿Seguro que querés eliminar el courier ' + (deleteCarrierTarget()?.name ?? '') + '? Esta acción eliminará también sus tarifas.'"
        [confirmLabel]="'action.delete' | t"
        [destructive]="true"
        (confirmed)="confirmDeleteCarrier()"
        (cancelled)="deleteCarrierTarget.set(null)"
      ></app-confirm-dialog>

      <!-- Carrier form dialog -->
      <app-carrier-form-dialog
        [open]="carrierFormOpen()"
        [carrier]="editingCarrier()"
        (saved)="onCarrierSaved()"
        (cancelled)="closeCarrierForm()"
      ></app-carrier-form-dialog>

      <!-- Rate form dialog -->
      <app-rate-form-dialog
        [open]="rateFormOpen()"
        [rate]="editingRate()"
        (saved)="onRateSaved()"
        (cancelled)="closeRateForm()"
      ></app-rate-form-dialog>

      <!-- Rate version history dialog -->
      <app-rate-version-history-dialog
        [open]="versionHistoryOpen()"
        [rate]="versionHistoryRate()"
        (closed)="closeVersionHistory()"
      ></app-rate-version-history-dialog>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarriersListPageComponent implements OnInit {
  private api = inject(ApiClient);
  protected auth = inject(AuthService);
  protected ui   = inject(UiService);
  protected i18n = inject(I18nService);
  private toast = inject(ToastService);

  protected tab = signal<"couriers" | "rates">("couriers");
  protected isAdmin = computed(() => this.auth.role() === "admin");

  carrierInitials(c: Carrier): string {
    const source = (c.name || c.code || "C").trim();
    const initials = source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("");
    return (initials || source.slice(0, 2) || "C").toUpperCase();
  }

  hideBrokenLogo(event: Event): void {
    (event.target as HTMLImageElement).style.display = "none";
  }

  // ─── Carriers ─────────────────────────────────────────────────
  protected carriers = signal<Carrier[]>([]);
  protected cLoading = signal(false);
  protected cError   = signal<unknown>(null);

  protected carrierFormOpen   = signal(false);
  protected editingCarrier    = signal<Carrier | null>(null);
  protected deleteCarrierTarget = signal<Carrier | null>(null);

  openCarrierCreate(): void {
    this.editingCarrier.set(null);
    this.carrierFormOpen.set(true);
  }

  openCarrierEdit(c: Carrier): void {
    this.editingCarrier.set(c);
    this.carrierFormOpen.set(true);
  }

  closeCarrierForm(): void {
    this.carrierFormOpen.set(false);
    this.editingCarrier.set(null);
  }

  onCarrierSaved(): void {
    this.closeCarrierForm();
    this.refreshCarriers();
  }

  confirmDeleteCarrier(): void {
    const target = this.deleteCarrierTarget();
    if (!target) return;
    this.api.deleteCarrierObs(target.id).subscribe({
      next: () => {
        this.toast.success("Courier eliminado", target.name);
        this.deleteCarrierTarget.set(null);
        this.refreshCarriers();
      },
      error: (e: any) => {
        const msg = e?.error?.message || e?.message || "No se pudo eliminar";
        this.toast.error("Error", msg);
        this.deleteCarrierTarget.set(null);
      },
    });
  }

  // ─── Rates ────────────────────────────────────────────────────
  protected allRates     = signal<CarrierRate[]>([]);
  protected rLoading     = signal(false);
  protected rError       = signal<unknown>(null);
  protected rateSearch        = signal("");
  protected rateCarrierFilter = signal("all");
  protected rateZoneFilter    = signal("all");
  protected rateStatusFilter  = signal("all");

  protected hasRateFilters = computed(() =>
    this.rateSearch() !== "" ||
    this.rateCarrierFilter() !== "all" ||
    this.rateZoneFilter() !== "all" ||
    this.rateStatusFilter() !== "all"
  );

  protected filteredRates = computed<CarrierRate[]>(() => {
    const s = this.rateSearch().toLowerCase();
    return this.allRates().filter((r) => {
      if (s && !(`${r.carrier?.name ?? ""} ${r.zone}`.toLowerCase().includes(s))) return false;
      if (this.rateCarrierFilter() !== "all" && r.carrierId !== this.rateCarrierFilter()) return false;
      if (this.rateZoneFilter() !== "all" && r.zone !== this.rateZoneFilter()) return false;
      if (this.rateStatusFilter() !== "all" && r.status !== this.rateStatusFilter()) return false;
      return true;
    });
  });

  protected rateFormOpen      = signal(false);
  protected editingRate        = signal<CarrierRate | null>(null);
  protected versionHistoryOpen = signal(false);
  protected versionHistoryRate = signal<CarrierRate | null>(null);
  protected deleteTarget       = signal<CarrierRate | null>(null);

  ngOnInit(): void {
    this.refreshCarriers();
    this.refreshRates();
  }

  refreshCarriers = (): void => {
    this.cLoading.set(true);
    this.cError.set(null);
    this.api.carriersObs().subscribe({
      next: (data) => { this.carriers.set(data || []); this.cLoading.set(false); },
      error: (err)  => { this.cError.set(err);         this.cLoading.set(false); },
    });
  };

  refreshRates = (): void => {
    this.rLoading.set(true);
    this.rError.set(null);
    this.api.ratesObs().subscribe({
      next: (data) => { this.allRates.set(data || []); this.rLoading.set(false); },
      error: (err)  => { this.rError.set(err);         this.rLoading.set(false); },
    });
  };

  onRateSearchInput(e: Event): void        { this.rateSearch.set((e.target as HTMLInputElement).value); }
  onRateCarrierFilterChange(e: Event): void { this.rateCarrierFilter.set((e.target as HTMLSelectElement).value); }
  onRateZoneFilterChange(e: Event): void    { this.rateZoneFilter.set((e.target as HTMLSelectElement).value); }
  onRateStatusFilterChange(e: Event): void  { this.rateStatusFilter.set((e.target as HTMLSelectElement).value); }
  clearRateFilters(): void {
    this.rateSearch.set(""); this.rateCarrierFilter.set("all");
    this.rateZoneFilter.set("all"); this.rateStatusFilter.set("all");
  }

  openRateCreate(): void {
    this.editingRate.set(null);
    this.rateFormOpen.set(true);
  }

  openRateEdit(r: CarrierRate): void {
    this.editingRate.set(r);
    this.rateFormOpen.set(true);
  }

  closeRateForm(): void {
    this.rateFormOpen.set(false);
    this.editingRate.set(null);
  }

  onRateSaved(): void {
    this.closeRateForm();
    this.refreshRates();
  }

  openVersionHistory(r: CarrierRate): void {
    this.versionHistoryRate.set(r);
    this.versionHistoryOpen.set(true);
  }

  closeVersionHistory(): void {
    this.versionHistoryOpen.set(false);
    this.versionHistoryRate.set(null);
  }

  confirmDeleteRate(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.api.deleteRateObs(target.id).subscribe({
      next: () => {
        this.toast.success("Tarifa eliminada", `${target.carrier?.name} · v${target.version}`);
        this.deleteTarget.set(null);
        this.refreshRates();
      },
      error: (e: any) => {
        const msg = e?.error?.message || e?.message || "No se pudo eliminar";
        this.toast.error("Error", msg);
        this.deleteTarget.set(null);
      },
    });
  }

  fmtCurrency(amount: number): string {
    const org = this.auth.organization();
    const country = (org?.country ?? "AR") as any;
    return this.i18n.formatCurrency(amount, this.ui.locale(), country);
  }

  statusLabel(status: RateStatus): string {
    switch (status) {
      case "active":   return this.i18n.translate(this.ui.locale(), "status.rateActive");
      case "draft":    return this.i18n.translate(this.ui.locale(), "status.draft");
      default:         return this.i18n.translate(this.ui.locale(), "status.inactive");
    }
  }

  statusBadgeClass(status: RateStatus): string {
    switch (status) {
      case "active":   return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
      case "draft":    return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
      default:         return "badge-outline";
    }
  }
}

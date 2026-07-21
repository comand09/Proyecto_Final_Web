import { Component, OnInit, computed, inject, signal , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ApiClient } from "../../../core/services/api-client";
import { AuthService } from "../../../core/services/auth.service";
import { UiService } from "../../../core/services/ui.service";
import { I18nService } from "../../../core/services/i18n.service";
import { ToastService } from "../../../core/services/toast.service";
import { Carrier, CarrierRate, RateStatus, Zone } from "../../../core/models/shipcore.models";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { DataStateComponent } from "../../../shared/components/data-state/data-state.component";
import { DataTableComponent, Column } from "../../../shared/components/data-table/data-table.component";
import { ConfirmDialogComponent } from "../../../shared/components/confirm-dialog/confirm-dialog.component";
import { RateFormDialogComponent } from "../components/rate-form-dialog.component";
import { RateVersionHistoryDialogComponent } from "../components/rate-version-history-dialog.component";

@Component({
  selector: "app-carriers-list-page",
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    DataStateComponent,
    DataTableComponent,
    ConfirmDialogComponent,
    RateFormDialogComponent,
    RateVersionHistoryDialogComponent,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Couriers y Tarifas"
        description="Gestioná los couriers y sus tarifas con versionado y trazabilidad."
      ></app-page-header>

      <!-- Tabs -->
      <div class="space-y-4">
        <div class="tabs-list">
          <button class="tabs-trigger" [class.tabs-trigger-active]="tab() === 'couriers'" (click)="tab.set('couriers')">Couriers</button>
          <button class="tabs-trigger" [class.tabs-trigger-active]="tab() === 'rates'" (click)="tab.set('rates')">Tarifas</button>
        </div>

        <!-- Couriers tab -->
        @if (tab() === 'couriers') {
          <app-data-state [isLoading]="cLoading()" [error]="cError()" [onRetry]="refreshCarriers" [empty]="!cLoading() && !cError() && carriers().length === 0">
            <div class="flex justify-end">
              @if (isAdmin()) {
                <button class="btn btn-primary btn-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                  Nuevo courier
                </button>
              }
            </div>
            <app-data-table
              [columns]="carrierColumns"
              [rows]="carriers()"
              [rowKey]="carrierKeyFn"
            ></app-data-table>
          </app-data-state>
        }

        <!-- Rates tab -->
        @if (tab() === 'rates') {
          <div class="space-y-4">
            <!-- Filters -->
            <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div class="relative flex-1 min-w-[200px]">
                <svg class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                <input type="text" placeholder="Buscar por courier o zona…" class="input pl-8" [value]="rateSearch()" (input)="onRateSearchInput($event)" />
              </div>
              <select class="input w-full sm:w-[180px]" [value]="rateCarrierFilter()" (change)="onRateCarrierFilterChange($event)">
                <option value="all">Todos los couriers</option>
                @for (c of carriers(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
              <select class="input w-full sm:w-[140px]" [value]="rateZoneFilter()" (change)="onRateZoneFilterChange($event)">
                <option value="all">Todas</option>
                <option value="local">Local</option>
                <option value="nacional">Nacional</option>
                <option value="internacional">Internacional</option>
              </select>
              <select class="input w-full sm:w-[140px]" [value]="rateStatusFilter()" (change)="onRateStatusFilterChange($event)">
                <option value="all">Todos</option>
                <option value="active">Activa</option>
                <option value="inactive">Inactiva</option>
                <option value="draft">Borrador</option>
              </select>
              @if (hasRateFilters()) {
                <button class="btn btn-ghost btn-sm" (click)="clearRateFilters()">Limpiar</button>
              }
            </div>

            <app-data-state [isLoading]="rLoading()" [error]="rError()" [onRetry]="refreshRates" [empty]="!rLoading() && !rError() && filteredRates().length === 0">
              <div class="flex justify-end">
                @if (isAdmin()) {
                  <button class="btn btn-primary btn-sm" (click)="openRateCreate()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                    Nueva tarifa
                  </button>
                }
              </div>
              <app-data-table
                [columns]="rateColumns"
                [rows]="filteredRates()"
                [rowKey]="rateKeyFn"
              ></app-data-table>
            </app-data-state>
          </div>
        }
      </div>

      <!-- Confirm dialog (delete rate) -->
      <app-confirm-dialog
        [open]="!!deleteTarget()"
        title="Eliminar tarifa"
        [description]="'¿Seguro que querés eliminar la tarifa de ' + (deleteTarget()?.carrier?.name ?? '') + ' zona ' + (deleteTarget()?.zone ?? '') + ' v' + (deleteTarget()?.version ?? 0) + '?'"
        confirmLabel="Eliminar"
        [destructive]="true"
        (confirmed)="confirmDeleteRate()"
        (cancelled)="deleteTarget.set(null)"
      ></app-confirm-dialog>

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
  private auth = inject(AuthService);
  private ui = inject(UiService);
  private i18n = inject(I18nService);
  private toast = inject(ToastService);

  protected tab = signal<"couriers" | "rates">("couriers");
  protected isAdmin = computed(() => this.auth.role() === "admin");

  // Carriers
  protected carriers = signal<Carrier[]>([]);
  protected cLoading = signal(false);
  protected cError = signal<unknown>(null);

  // Rates
  protected allRates = signal<CarrierRate[]>([]);
  protected rLoading = signal(false);
  protected rError = signal<unknown>(null);
  protected rateSearch = signal("");
  protected rateCarrierFilter = signal("all");
  protected rateZoneFilter = signal("all");
  protected rateStatusFilter = signal("all");

  protected hasRateFilters = computed(() => {
    return (
      this.rateSearch() !== "" ||
      this.rateCarrierFilter() !== "all" ||
      this.rateZoneFilter() !== "all" ||
      this.rateStatusFilter() !== "all"
    );
  });

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

  // Rate form / version history / delete
  protected rateFormOpen = signal(false);
  protected editingRate = signal<CarrierRate | null>(null);
  protected versionHistoryOpen = signal(false);
  protected versionHistoryRate = signal<CarrierRate | null>(null);
  protected deleteTarget = signal<CarrierRate | null>(null);

  protected carrierKeyFn = (c: Carrier) => c.id;
  protected rateKeyFn = (r: CarrierRate) => r.id;

  protected carrierColumns: Column<Carrier>[] = [
    {
      key: "name",
      header: "Nombre",
      cell: (c) => `${c.name}\n${c.code}`,
    },
    {
      key: "rateCount",
      header: "Tarifas",
      align: "center",
      cell: (c) => String(c.rateCount ?? 0),
    },
    {
      key: "active",
      header: "Estado",
      cell: (c) => (c.active ? "Activo" : "Inactivo"),
    },
  ];

  protected rateColumns: Column<CarrierRate>[] = [
    {
      key: "carrier",
      header: "Courier",
      cell: (r) => `${r.carrier?.name ?? "—"}\n${r.carrier?.code ?? ""}`,
    },
    {
      key: "zone",
      header: "Zona",
      cell: (r) => r.zone,
    },
    {
      key: "validity",
      header: "Vigencia",
      cell: (r) => `${this.i18n.formatDate(r.validFrom, this.ui.locale())} → ${this.i18n.formatDate(r.validTo, this.ui.locale())}`,
    },
    {
      key: "version",
      header: "Versión",
      align: "center",
      cell: (r) => `v${r.version}`,
    },
    {
      key: "basePrice",
      header: "Base",
      align: "right",
      cell: (r) => this.fmtCurrency(r.basePrice),
    },
    {
      key: "status",
      header: "Estado",
      cell: (r) => this.statusLabel(r.status),
    },
  ];

  ngOnInit(): void {
    this.refreshCarriers();
    this.refreshRates();
  }

  refreshCarriers = (): void => {
    this.cLoading.set(true);
    this.cError.set(null);
    setTimeout(() => {
      try {
        this.carriers.set(this.api.listCarriers());
      } catch (e) {
        this.cError.set(e);
      } finally {
        this.cLoading.set(false);
      }
    }, 100);
  };

  refreshRates = (): void => {
    this.rLoading.set(true);
    this.rError.set(null);
    setTimeout(() => {
      try {
        this.allRates.set(this.api.listRates());
      } catch (e) {
        this.rError.set(e);
      } finally {
        this.rLoading.set(false);
      }
    }, 100);
  };

  onRateSearchInput(e: Event): void {
    this.rateSearch.set((e.target as HTMLInputElement).value);
  }
  onRateCarrierFilterChange(e: Event): void {
    this.rateCarrierFilter.set((e.target as HTMLSelectElement).value);
  }
  onRateZoneFilterChange(e: Event): void {
    this.rateZoneFilter.set((e.target as HTMLSelectElement).value);
  }
  onRateStatusFilterChange(e: Event): void {
    this.rateStatusFilter.set((e.target as HTMLSelectElement).value);
  }
  clearRateFilters(): void {
    this.rateSearch.set("");
    this.rateCarrierFilter.set("all");
    this.rateZoneFilter.set("all");
    this.rateStatusFilter.set("all");
  }

  openRateCreate(): void {
    this.editingRate.set(null);
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

  closeVersionHistory(): void {
    this.versionHistoryOpen.set(false);
    this.versionHistoryRate.set(null);
  }

  confirmDeleteRate(): void {
    const target = this.deleteTarget();
    if (!target) return;
    try {
      this.api.deleteRate(target.id);
      this.toast.success("Tarifa eliminada", `${target.carrier?.name} · v${target.version}`);
      this.refreshRates();
    } catch (e: any) {
      this.toast.error("Error", e?.message ?? "No se pudo eliminar");
    } finally {
      this.deleteTarget.set(null);
    }
  }

  fmtCurrency(amount: number): string {
    const org = this.auth.organization();
    const country = (org?.country ?? "AR") as any;
    return this.i18n.formatCurrency(amount, this.ui.locale(), country);
  }

  statusLabel(status: RateStatus): string {
    switch (status) {
      case "active": return "Activa";
      case "draft": return "Borrador";
      default: return "Inactiva";
    }
  }
}

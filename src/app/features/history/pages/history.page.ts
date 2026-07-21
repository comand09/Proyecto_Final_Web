import { Component, OnInit, computed, inject, signal, effect , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ApiClient } from "../../../core/services/api-client";
import { RouterService } from "../../../core/services/router.service";
import { AuthService } from "../../../core/services/auth.service";
import { UiService } from "../../../core/services/ui.service";
import { I18nService } from "../../../core/services/i18n.service";
import { Carrier, Quote, QuoteStatus } from "../../../core/models/shipcore.models";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { DataStateComponent } from "../../../shared/components/data-state/data-state.component";
import { DataTableComponent, Column } from "../../../shared/components/data-table/data-table.component";

@Component({
  selector: "app-history-page",
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, DataStateComponent, DataTableComponent],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Historial"
        description="Todas las cotizaciones de tu organización con filtros."
      ></app-page-header>

      <!-- Filters -->
      <div class="card">
        <div class="card-content space-y-3">
          <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div class="relative flex-1 min-w-[200px]">
              <svg class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              <input type="text" placeholder="Buscar por origen, destino o usuario…" class="input pl-8" [value]="search()" (input)="onSearchInput($event)" aria-label="Buscar" />
            </div>
            <input type="date" class="input w-full sm:w-[160px]" [value]="dateFrom()" (change)="onDateFromChange($event)" aria-label="Desde" />
            <input type="date" class="input w-full sm:w-[160px]" [value]="dateTo()" (change)="onDateToChange($event)" aria-label="Hasta" />
            <select class="input w-full sm:w-[180px]" [value]="carrierId()" (change)="onCarrierChange($event)" aria-label="Courier">
              <option value="all">Todos los couriers</option>
              @for (c of carriers(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
            <select class="input w-full sm:w-[140px]" [value]="status()" (change)="onStatusChange($event)" aria-label="Estado">
              <option value="all">Todos</option>
              <option value="quoted">Cotizada</option>
              <option value="booked">Reservada</option>
              <option value="expired">Expirada</option>
            </select>
            @if (hasFilters()) {
              <button class="btn btn-ghost btn-sm" (click)="clearFilters()">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                Limpiar
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Table -->
      <app-data-state [isLoading]="loading()" [error]="error()" [onRetry]="refresh" [empty]="!loading() && !error() && items().length === 0">
        <app-data-table
          [columns]="columns"
          [rows]="items()"
          [page]="page()"
          [pageSize]="pageSize"
          [total]="total()"
          [onPageChange]="onPageChange"
          [rowKey]="rowKeyFn"
          [onRowClick]="onRowClickFn"
        ></app-data-table>
      </app-data-state>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPageComponent implements OnInit {
  private api = inject(ApiClient);
  private router = inject(RouterService);
  private auth = inject(AuthService);
  private ui = inject(UiService);
  private i18n = inject(I18nService);

  protected loading = signal(false);
  protected error = signal<unknown>(null);
  protected items = signal<Quote[]>([]);
  protected total = signal(0);
  protected carriers = signal<Carrier[]>([]);

  protected page = signal(1);
  protected pageSize = 10;
  protected dateFrom = signal("");
  protected dateTo = signal("");
  protected carrierId = signal("all");
  protected status = signal("all");
  protected search = signal("");

  protected hasFilters = computed(() => {
    return (
      this.dateFrom() !== "" ||
      this.dateTo() !== "" ||
      this.carrierId() !== "all" ||
      this.status() !== "all" ||
      this.search() !== ""
    );
  });

  protected rowKeyFn = (_: Quote, i: number) => String(i);

  protected onRowClickFn = (row: Quote) => {
    this.router.navigate("quote-detail", { id: row.id });
  };

  protected onPageChange = (p: number) => {
    this.page.set(p);
    this.refresh();
  };

  protected columns: Column<Quote>[] = [
    {
      key: "createdAt",
      header: "Fecha",
      cell: (q) => this.i18n.formatDate(q.createdAt, this.ui.locale()),
    },
    {
      key: "route",
      header: "Ruta",
      cell: (q) => `${q.origin} → ${q.destination}`,
    },
    {
      key: "weightKg",
      header: "Peso",
      align: "right",
      cell: (q) => `${q.weightKg} kg`,
    },
    {
      key: "carrier",
      header: "Courier",
      cell: (q) => q.selectedCarrier?.name ?? "—",
    },
    {
      key: "price",
      header: "Precio",
      align: "right",
      cell: (q) => (q.selectedPrice != null ? this.fmtCurrency(q.selectedPrice) : "—"),
    },
    {
      key: "status",
      header: "Estado",
      cell: (q) => this.statusLabel(q.status),
    },
    {
      key: "user",
      header: "Usuario",
      cell: (q) => q.user?.name ?? "—",
    },
  ];

  constructor() {
    // Reset page when filters change
    effect(() => {
      const _ = [this.dateFrom(), this.dateTo(), this.carrierId(), this.status(), this.search()];
      if (this.page() !== 1) this.page.set(1);
    });
  }

  ngOnInit(): void {
    // Load carriers for the filter
    try {
      this.carriers.set(this.api.listCarriers());
    } catch {
      /* ignore */
    }
    this.refresh();
  }

  refresh = (): void => {
    this.loading.set(true);
    this.error.set(null);
    setTimeout(() => {
      try {
        const res = this.api.listQuotes({
          page: this.page(),
          pageSize: this.pageSize,
          dateFrom: this.dateFrom() || undefined,
          dateTo: this.dateTo() || undefined,
          carrierId: this.carrierId() === "all" ? undefined : this.carrierId(),
          status: (this.status() === "all" ? undefined : (this.status() as QuoteStatus)),
          search: this.search().trim() || undefined,
        });
        this.items.set(res.items);
        this.total.set(res.total);
      } catch (e) {
        this.error.set(e);
      } finally {
        this.loading.set(false);
      }
    }, 100);
  };

  onSearchInput(e: Event): void {
    this.search.set((e.target as HTMLInputElement).value);
    this.refresh();
  }
  onDateFromChange(e: Event): void {
    this.dateFrom.set((e.target as HTMLInputElement).value);
    this.refresh();
  }
  onDateToChange(e: Event): void {
    this.dateTo.set((e.target as HTMLInputElement).value);
    this.refresh();
  }
  onCarrierChange(e: Event): void {
    this.carrierId.set((e.target as HTMLSelectElement).value);
    this.refresh();
  }
  onStatusChange(e: Event): void {
    this.status.set((e.target as HTMLSelectElement).value);
    this.refresh();
  }

  clearFilters(): void {
    this.dateFrom.set("");
    this.dateTo.set("");
    this.carrierId.set("all");
    this.status.set("all");
    this.search.set("");
    this.page.set(1);
    this.refresh();
  }

  fmtCurrency(amount: number): string {
    const org = this.auth.organization();
    const country = (org?.country ?? "AR") as any;
    return this.i18n.formatCurrency(amount, this.ui.locale(), country);
  }

  statusLabel(status: string): string {
    switch (status) {
      case "booked": return "Reservada";
      case "expired": return "Expirada";
      default: return "Cotizada";
    }
  }
}

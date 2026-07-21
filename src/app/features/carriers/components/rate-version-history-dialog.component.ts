import { Component, Input, Output, EventEmitter, inject, signal, OnInit, OnChanges, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ApiClient } from "../../../core/services/api-client";
import { UiService } from "../../../core/services/ui.service";
import { I18nService } from "../../../core/services/i18n.service";
import { CarrierRate } from "../../../core/models/shipcore.models";

@Component({
  selector: "app-rate-version-history-dialog",
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="dialog-backdrop" (click)="close()"></div>
        <div class="dialog-panel max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-semibold">Historial de versiones</h3>
          @if (rateSig(); as r) {
            <p class="mt-1 text-sm text-muted-foreground">{{ r.carrier?.name }} · Zona {{ r.zone }}</p>
          }

          <div class="mt-5">
            @if (versions().length === 0) {
              <p class="py-8 text-center text-sm text-muted-foreground">Sin versiones previas.</p>
            } @else {
              <ol class="relative border-l border-border pl-6">
                @for (v of versions(); track v.id) {
                  <li class="mb-5">
                    <div class="absolute -left-[7px] mt-1.5 size-3.5 rounded-full border-2 border-background" [class.bg-primary]="v.status === 'active'" [class.bg-muted-foreground]="v.status !== 'active'"></div>
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-mono text-sm font-semibold">v{{ v.version }}</span>
                      <span class="badge badge-outline">{{ statusLabel(v.status) }}</span>
                      @if (v.id === rateSig()?.id) {
                        <span class="badge bg-primary text-primary-foreground">Actual</span>
                      }
                    </div>
                    <p class="mt-1 text-xs text-muted-foreground">Vigencia: {{ fmtDate(v.validFrom) }} → {{ fmtDate(v.validTo) }}</p>
                    <p class="mt-0.5 text-xs text-muted-foreground">
                      Base: <span class="font-medium text-foreground">{{ fmtCurrency(v.basePrice) }}</span> ·
                      Por kg: <span class="font-medium text-foreground">{{ fmtCurrency(v.pricePerKg) }}</span> ·
                      Por km: <span class="font-medium text-foreground">{{ fmtCurrency(v.pricePerKm) }}</span>
                    </p>
                    <p class="mt-0.5 text-xs text-muted-foreground">Peso: {{ v.minWeightKg }}-{{ v.maxWeightKg }} kg · Origen: {{ v.source }}</p>
                  </li>
                }
              </ol>
            }
          </div>

          <div class="mt-6 flex justify-end">
            <button class="btn btn-outline btn-md" (click)="close()">Cerrar</button>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RateVersionHistoryDialogComponent implements OnInit, OnChanges {
  @Input() open = false;
  @Input() rate: CarrierRate | null = null;
  @Output() closed = new EventEmitter<void>();

  private api = inject(ApiClient);
  private ui = inject(UiService);
  private i18n = inject(I18nService);

  protected versions = signal<CarrierRate[]>([]);
  protected rateSig = signal<CarrierRate | null>(null);

  ngOnInit(): void {
    this.rateSig.set(this.rate);
  }

  ngOnChanges(): void {
    this.rateSig.set(this.rate);
    if (this.open && this.rate) {
      try {
        const vs = this.api.listRateVersions(this.rate.carrierId, this.rate.zone);
        this.versions.set(vs);
      } catch {
        this.versions.set([]);
      }
    }
  }

  close(): void {
    this.closed.emit();
  }

  fmtDate(d: string): string {
    return this.i18n.formatDate(d, this.ui.locale());
  }

  fmtCurrency(amount: number): string {
    return this.i18n.formatCurrency(amount, this.ui.locale(), "AR" as any);
  }

  statusLabel(status: string): string {
    switch (status) {
      case "active": return "Activa";
      case "draft": return "Borrador";
      default: return "Inactiva";
    }
  }
}

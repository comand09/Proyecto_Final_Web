import { Component, OnInit, computed, inject, signal , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ApiClient } from "../../../core/services/api-client";
import { UiService } from "../../../core/services/ui.service";
import { I18nService } from "../../../core/services/i18n.service";
import { ToastService } from "../../../core/services/toast.service";
import { Organization } from "../../../core/models/shipcore.models";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { DataStateComponent } from "../../../shared/components/data-state/data-state.component";

@Component({
  selector: "app-org-plan",
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, DataStateComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-lg font-semibold">Plan y uso</h2>
        <p class="text-sm text-muted-foreground">Revisá el plan actual de tu organización y el consumo del mes.</p>
      </div>

      <app-data-state [isLoading]="loading()" [error]="error()" [onRetry]="refresh" [empty]="!loading() && !error() && !data()">
        @if (data(); as d) {
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <!-- Plan info -->
            <div class="card lg:col-span-1">
              <div class="card-header">
                <div class="card-title text-base">Plan actual</div>
                <p class="card-description">Organización: {{ d.name }}</p>
              </div>
              <div class="card-content space-y-3">
                <div class="flex items-center gap-2">
                  <span class="badge" [class]="planBadgeClass(d.plan)">
                    @switch (d.plan) {
                      @case ("enterprise") { Enterprise }
                      @case ("growth") { Growth }
                      @default { Starter }
                    }
                  </span>
                </div>
                <div class="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                  <p>País: <span class="font-medium text-foreground">{{ countryLabel(d.country) }}</span></p>
                  <p class="mt-1">Creada: <span class="font-medium text-foreground">{{ fmtDate(d.createdAt) }}</span></p>
                </div>
              </div>
            </div>

            <!-- Usage -->
            <div class="card lg:col-span-2">
              <div class="card-header">
                <div class="card-title text-base">Consumo del mes</div>
                <p class="card-description">Cotizaciones realizadas en el mes en curso.</p>
              </div>
              <div class="card-content space-y-5">
                <div>
                  <div class="mb-1 flex items-center justify-between text-sm">
                    <span class="text-muted-foreground">Soft limit (alerta)</span>
                    <span class="font-medium">{{ d.currentUsage }} / {{ d.softLimit }}</span>
                  </div>
                  <div class="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div class="h-full transition-all" [class]="softExceeded() ? 'bg-amber-500' : 'bg-primary'" [style.width.%]="softPct()"></div>
                  </div>
                  @if (softExceeded()) {
                    <p class="mt-1 flex items-center gap-1 text-xs text-amber-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                      Superaste el soft limit. Considerá mejorar tu plan.
                    </p>
                  }
                </div>
                <div>
                  <div class="mb-1 flex items-center justify-between text-sm">
                    <span class="text-muted-foreground">Hard limit (bloqueo)</span>
                    <span class="font-medium">{{ d.currentUsage }} / {{ d.hardLimit }}</span>
                  </div>
                  <div class="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div class="h-full transition-all" [class]="hardExceeded() ? 'bg-destructive' : 'bg-emerald-500'" [style.width.%]="hardPct()"></div>
                  </div>
                  @if (hardExceeded()) {
                    <p class="mt-1 flex items-center gap-1 text-xs text-destructive">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                      Superaste el hard limit. Las cotizaciones se pausarán.
                    </p>
                  }
                </div>
                <div class="rounded-md border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
                  <p class="font-medium text-foreground">¿Cómo funcionan los límites?</p>
                  <p class="mt-1">El <span class="font-medium">soft limit</span> te avisa cuando estás por alcanzar tu cuota. El <span class="font-medium">hard limit</span> bloquea nuevas cotizaciones hasta el próximo ciclo.</p>
                </div>
              </div>
            </div>
          </div>
        }
      </app-data-state>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgPlanComponent implements OnInit {
  private api = inject(ApiClient);
  private ui = inject(UiService);
  private i18n = inject(I18nService);
  private toast = inject(ToastService);

  protected loading = signal(false);
  protected error = signal<unknown>(null);
  protected data = signal<Organization | null>(null);

  protected softPct = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return Math.min(100, (d.currentUsage / Math.max(1, d.softLimit)) * 100);
  });
  protected hardPct = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return Math.min(100, (d.currentUsage / Math.max(1, d.hardLimit)) * 100);
  });
  protected softExceeded = computed(() => {
    const d = this.data();
    return d ? d.currentUsage > d.softLimit : false;
  });
  protected hardExceeded = computed(() => {
    const d = this.data();
    return d ? d.currentUsage > d.hardLimit : false;
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh = (): void => {
    this.loading.set(true);
    this.error.set(null);
    setTimeout(() => {
      try {
        this.data.set(this.api.getOrganization());
      } catch (e) {
        this.error.set(e);
      } finally {
        this.loading.set(false);
      }
    }, 100);
  };

  planBadgeClass(plan: string): string {
    switch (plan) {
      case "enterprise": return "bg-amber-100 text-amber-700 border-amber-200";
      case "growth": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  }

  countryLabel(country: string): string {
    switch (country) {
      case "AR": return "Argentina";
      case "CL": return "Chile";
      case "CO": return "Colombia";
      case "MX": return "México";
      default: return country;
    }
  }

  fmtDate(d: string): string {
    return this.i18n.formatDate(d, this.ui.locale());
  }
}

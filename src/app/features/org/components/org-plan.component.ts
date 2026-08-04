import { Component, OnInit, computed, inject, signal , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormControl, ReactiveFormsModule, Validators } from "@angular/forms";
import { ApiClient } from "../../../core/services/api-client";
import { AuthService } from "../../../core/services/auth.service";
import { UiService } from "../../../core/services/ui.service";
import { I18nService } from "../../../core/services/i18n.service";
import { ToastService } from "../../../core/services/toast.service";
import { Organization } from "../../../core/models/shipcore.models";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { DataStateComponent } from "../../../shared/components/data-state/data-state.component";

@Component({
  selector: "app-org-plan",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, DataStateComponent],
  template: `
    <div class="shipcore-panel-page org-plan-panel space-y-8">
      <div class="section-heading">
        <h2 class="text-lg font-semibold">Plan y uso</h2>
        <p class="text-sm text-muted-foreground">Revisá el plan actual de tu organización y el consumo del mes.</p>
      </div>

      <app-data-state class="shipcore-data-block" [isLoading]="loading()" [error]="error()" [onRetry]="refresh" [empty]="!loading() && !error() && !data()">
        @if (data(); as d) {
          <div class="shipcore-form-grid grid grid-cols-1 lg:grid-cols-3">
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
                <div class="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                  <p class="font-medium text-foreground">Ciclo del plan</p>
                  <p class="mt-1">{{ planCycleLabel(d.plan) }}</p>
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
                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="rounded-md border bg-muted/30 p-3">
                    <p class="text-xs text-muted-foreground">Estado</p>
                    <p class="mt-1 text-base font-semibold">{{ usageStatus() }}</p>
                  </div>
                  <div class="rounded-md border bg-muted/30 p-3">
                    <p class="text-xs text-muted-foreground">Disponible hasta bloqueo</p>
                    <p class="mt-1 text-base font-semibold">{{ remainingHard() }}</p>
                  </div>
                </div>
                @if (isAdmin()) {
                  <button type="button" class="btn btn-outline btn-sm" (click)="resetUsage()" [disabled]="saving()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
                    Recargar consumo
                  </button>
                }
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
  private auth = inject(AuthService);
  private ui = inject(UiService);
  private i18n = inject(I18nService);
  private toast = inject(ToastService);

  protected loading = signal(false);
  protected error = signal<unknown>(null);
  protected data = signal<Organization | null>(null);
  protected saving = signal(false);
  protected isAdmin = this.auth.isAdmin;

  protected nameControl = new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] });
  protected rucControl = new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.minLength(11), Validators.maxLength(11)] });
  protected countryControl = new FormControl<"AR" | "CL" | "CO" | "MX">("AR", { nonNullable: true, validators: [Validators.required] });
  protected planControl = new FormControl<"starter" | "growth" | "enterprise">("starter", { nonNullable: true, validators: [Validators.required] });
  protected softLimitControl = new FormControl(1000, { nonNullable: true, validators: [Validators.required, Validators.min(0)] });
  protected hardLimitControl = new FormControl(1200, { nonNullable: true, validators: [Validators.required, Validators.min(0)] });

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
  protected remainingHard = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return Math.max(0, d.hardLimit - d.currentUsage);
  });
  protected usageStatus = computed(() => {
    if (this.hardExceeded()) return "Bloqueado";
    if (this.softExceeded()) return "En alerta";
    return "Operativo";
  });
  protected limitsInvalid(): boolean {
    const d = this.data();
    const soft = Number(this.softLimitControl.value);
    const hard = Number(this.hardLimitControl.value);
    return !!d && (hard < soft || hard < d.currentUsage);
  }
  protected formInvalid(): boolean {
    return this.nameControl.invalid ||
      this.rucControl.invalid ||
      this.countryControl.invalid ||
      this.planControl.invalid ||
      this.softLimitControl.invalid ||
      this.hardLimitControl.invalid ||
      this.limitsInvalid();
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh = (): void => {
    this.loading.set(true);
    this.error.set(null);
    this.api.organizationObs().subscribe({
      next: (org) => {
        this.data.set(org);
        this.fillForm(org);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e);
        this.loading.set(false);
      },
    });
  };

  saveOrganization(): void {
    const current = this.data();
    if (!current || this.formInvalid()) return;

    this.saving.set(true);
    this.api.updateOrganizationObs({
      ...current,
      name: this.nameControl.value.trim(),
      ruc: this.rucControl.value.trim(),
      country: this.countryControl.value,
      plan: this.planControl.value,
      softLimit: Number(this.softLimitControl.value),
      hardLimit: Number(this.hardLimitControl.value),
      currentUsage: current.currentUsage,
    }).subscribe({
      next: (org) => {
        this.data.set(org);
        this.fillForm(org);
        this.toast.success("Organizacion actualizada", "Los datos del plan fueron guardados.");
        this.saving.set(false);
      },
      error: (e) => {
        this.toast.error("Error", e?.error?.message ?? e?.message ?? "No se pudo actualizar la organizacion");
        this.saving.set(false);
      },
    });
  }

  resetUsage(): void {
    const current = this.data();
    if (!current || !this.isAdmin()) return;

    this.saving.set(true);
    this.api.resetOrganizationUsageObs(current.id).subscribe({
      next: (org) => {
        this.data.set(org);
        this.fillForm(org);
        this.toast.success("Uso reiniciado", "El consumo del plan volvio a cero.");
        this.saving.set(false);
      },
      error: (e) => {
        this.toast.error("Error", e?.error?.message ?? e?.message ?? "No se pudo reiniciar el uso");
        this.saving.set(false);
      },
    });
  }

  private fillForm(org: Organization): void {
    this.nameControl.setValue(org.name || "");
    this.rucControl.setValue(org.ruc || "");
    this.countryControl.setValue(org.country);
    this.planControl.setValue(org.plan);
    this.softLimitControl.setValue(org.softLimit);
    this.hardLimitControl.setValue(org.hardLimit);
  }

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

  planCycleLabel(plan: string): string {
    switch (plan) {
      case "enterprise": return "Enterprise reinicia el consumo automaticamente cada dia.";
      case "growth": return "Growth reinicia el consumo automaticamente cada semana.";
      default: return "Starter reinicia el consumo automaticamente cada mes.";
    }
  }

  fmtDate(d: string): string {
    return this.i18n.formatDate(d, this.ui.locale());
  }
}

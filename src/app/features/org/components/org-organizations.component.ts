import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { forkJoin } from "rxjs";
import { ApiClient } from "../../../core/services/api-client";
import { UiService } from "../../../core/services/ui.service";
import { I18nService } from "../../../core/services/i18n.service";
import { ToastService } from "../../../core/services/toast.service";
import { Country, Organization, Plan } from "../../../core/models/shipcore.models";
import { DataStateComponent } from "../../../shared/components/data-state/data-state.component";
import { ConfirmDialogComponent } from "../../../shared/components/confirm-dialog/confirm-dialog.component";

@Component({
  selector: "app-org-organizations",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataStateComponent, ConfirmDialogComponent],
  template: `
    <div class="shipcore-panel-page org-organizations-panel space-y-6">
      <div class="section-heading flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-semibold">Organizaciones</h2>
          <p class="text-sm text-muted-foreground">Administracion general de tenants del sistema.</p>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-outline btn-sm" (click)="resetAllUsage()" [disabled]="saving() || organizations().length === 0">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
            Recargar todos
          </button>
          <button class="btn btn-primary btn-sm" (click)="openCreate()">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
            Nueva organizacion
          </button>
        </div>
      </div>

      <app-data-state class="shipcore-data-block" [isLoading]="loading()" [error]="error()" [onRetry]="refresh" [empty]="!loading() && !error() && organizations().length === 0">
        <div class="card">
          <div class="card-content">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b text-left text-xs text-muted-foreground">
                    <th class="px-3 py-2 font-medium">Organizacion</th>
                    <th class="px-3 py-2 font-medium">RUC</th>
                    <th class="px-3 py-2 font-medium">Pais</th>
                    <th class="px-3 py-2 font-medium">Plan</th>
                    <th class="px-3 py-2 font-medium">Uso / Limite</th>
                    <th class="px-3 py-2 font-medium">Creada</th>
                    <th class="px-3 py-2 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (org of organizations(); track org.id) {
                    <tr class="border-b last:border-0">
                      <td class="px-3 py-2">
                        <p class="font-medium">{{ org.name }}</p>
                        <p class="text-xs text-muted-foreground">{{ org.address || "Sin direccion" }}</p>
                      </td>
                      <td class="px-3 py-2 font-mono text-xs">{{ org.ruc || "-" }}</td>
                      <td class="px-3 py-2">{{ countryLabel(org.country) }}</td>
                      <td class="px-3 py-2">
                        <span class="badge" [class]="planBadgeClass(org.plan)">
                          {{ planLabel(org.plan) }}
                        </span>
                      </td>
                      <td class="px-3 py-2">
                        <div class="flex min-w-36 items-center gap-2">
                          <div class="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                            <div class="h-full" [class]="usageClass(org)" [style.width.%]="usagePct(org)"></div>
                          </div>
                          <span class="text-xs text-muted-foreground">{{ org.currentUsage }} / {{ org.hardLimit }}</span>
                        </div>
                      </td>
                      <td class="px-3 py-2 text-xs text-muted-foreground">{{ fmtDate(org.createdAt) }}</td>
                      <td class="px-3 py-2 text-right">
                        <div class="flex items-center justify-end gap-1">
                          <button class="btn btn-ghost btn-icon" style="height:32px;width:32px;" aria-label="Resetear uso" (click)="resetUsage(org)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
                          </button>
                          <button class="btn btn-ghost btn-icon" style="height:32px;width:32px;" aria-label="Editar" (click)="openEdit(org)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>
                          </button>
                          <button class="btn btn-ghost btn-icon text-destructive hover:text-destructive" style="height:32px;width:32px;" aria-label="Eliminar" (click)="deleteTarget.set(org)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </app-data-state>

      @if (dialogOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="dialog-backdrop" (click)="closeDialog()"></div>
          <div class="dialog-panel max-w-2xl">
            <h3 class="text-lg font-semibold">{{ editing() ? "Editar organizacion" : "Nueva organizacion" }}</h3>
            <p class="mt-1 text-sm text-muted-foreground">Define el tenant, su plan y sus limites de consumo.</p>

            <form class="mt-5 grid gap-4 sm:grid-cols-2" [formGroup]="form" (ngSubmit)="save()">
              <div class="sm:col-span-2">
                <label class="label" for="org-name-admin">Nombre</label>
                <input id="org-name-admin" class="input mt-1.5" formControlName="name" />
              </div>
              <div>
                <label class="label" for="org-ruc-admin">RUC</label>
                <input id="org-ruc-admin" class="input mt-1.5" maxlength="11" formControlName="ruc" />
              </div>
              <div>
                <label class="label" for="org-phone-admin">Telefono</label>
                <input id="org-phone-admin" class="input mt-1.5" maxlength="20" formControlName="phone" />
              </div>
              <div class="sm:col-span-2">
                <label class="label" for="org-address-admin">Direccion</label>
                <input id="org-address-admin" class="input mt-1.5" formControlName="address" />
              </div>
              <div>
                <label class="label" for="org-country-admin">Pais</label>
                <select id="org-country-admin" class="input mt-1.5" formControlName="country">
                  <option value="AR">Argentina</option>
                  <option value="CL">Chile</option>
                  <option value="CO">Colombia</option>
                  <option value="MX">Mexico</option>
                </select>
              </div>
              <div>
                <label class="label" for="org-plan-admin">Plan</label>
                <select id="org-plan-admin" class="input mt-1.5" formControlName="plan">
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div class="rounded-md border bg-muted/30 p-3">
                <p class="text-xs text-muted-foreground">Soft limit automatico</p>
                <p class="mt-1 text-base font-semibold">{{ selectedPlanLimits().soft }} cotizaciones</p>
              </div>
              <div class="rounded-md border bg-muted/30 p-3">
                <p class="text-xs text-muted-foreground">Hard limit automatico</p>
                <p class="mt-1 text-base font-semibold">{{ selectedPlanLimits().hard }} cotizaciones</p>
              </div>
              <div>
                <label class="label" for="org-usage-admin">Uso actual</label>
                <input id="org-usage-admin" class="input mt-1.5" type="number" min="0" formControlName="currentUsage" />
              </div>
              <div class="flex items-end">
                @if (limitsInvalid()) {
                  <p class="text-xs text-destructive">El hard limit debe cubrir el soft limit y el uso actual.</p>
                }
              </div>
              <div class="sm:col-span-2 mt-2 flex justify-end gap-2">
                <button type="button" class="btn btn-outline btn-md" (click)="closeDialog()" [disabled]="saving()">Cancelar</button>
                <button type="submit" class="btn btn-primary btn-md" [disabled]="saving() || form.invalid || limitsInvalid()">
                  @if (saving()) { Guardando... } @else { Guardar }
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <app-confirm-dialog
        [open]="!!deleteTarget()"
        title="Eliminar organizacion"
        [description]="'Se desactivara ' + (deleteTarget()?.name ?? 'esta organizacion') + '. Esta accion no borra sus registros historicos.'"
        confirmLabel="Eliminar"
        [destructive]="true"
        (confirmed)="confirmDelete()"
        (cancelled)="deleteTarget.set(null)"
      ></app-confirm-dialog>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgOrganizationsComponent implements OnInit {
  private api = inject(ApiClient);
  private fb = inject(FormBuilder);
  private ui = inject(UiService);
  private i18n = inject(I18nService);
  private toast = inject(ToastService);

  protected loading = signal(false);
  protected error = signal<unknown>(null);
  protected organizations = signal<Organization[]>([]);
  protected dialogOpen = signal(false);
  protected editing = signal<Organization | null>(null);
  protected saving = signal(false);
  protected deleteTarget = signal<Organization | null>(null);

  protected form = this.fb.nonNullable.group({
    name: ["", [Validators.required, Validators.maxLength(150)]],
    ruc: ["", [Validators.required, Validators.minLength(11), Validators.maxLength(11)]],
    address: ["", [Validators.maxLength(255)]],
    phone: ["", [Validators.maxLength(20)]],
    country: ["AR" as Country, [Validators.required]],
    plan: ["starter" as Plan, [Validators.required]],
    softLimit: [1000, [Validators.required, Validators.min(0)]],
    hardLimit: [1200, [Validators.required, Validators.min(0)]],
    currentUsage: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh = (): void => {
    this.loading.set(true);
    this.error.set(null);
    this.api.listOrganizationsObs().subscribe({
      next: (organizations) => {
        this.organizations.set(organizations);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e);
        this.loading.set(false);
      },
    });
  };

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({
      name: "",
      ruc: "",
      address: "",
      phone: "",
      country: "AR",
      plan: "starter",
      softLimit: 1000,
      hardLimit: 1200,
      currentUsage: 0,
    });
    this.dialogOpen.set(true);
  }

  openEdit(org: Organization): void {
    this.editing.set(org);
    this.form.reset({
      name: org.name,
      ruc: org.ruc || "",
      address: org.address || "",
      phone: org.phone || "",
      country: org.country,
      plan: org.plan,
      softLimit: org.softLimit,
      hardLimit: org.hardLimit,
      currentUsage: org.currentUsage,
    });
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    if (this.saving()) return;
    this.dialogOpen.set(false);
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.limitsInvalid()) return;

    const editing = this.editing();
    const value = this.form.getRawValue();
    const limits = this.planLimits(value.plan);
    const payload: Partial<Organization> = {
      name: value.name.trim(),
      ruc: value.ruc.trim(),
      address: value.address.trim(),
      phone: value.phone.trim(),
      country: value.country,
      plan: value.plan,
      softLimit: limits.soft,
      hardLimit: limits.hard,
      currentUsage: Number(value.currentUsage),
    };

    this.saving.set(true);
    const request = editing
      ? this.api.updateOrganizationByIdObs(editing.id, payload)
      : this.api.createOrganizationObs(payload);

    request.subscribe({
      next: () => {
        this.toast.success(
          editing ? "Organizacion actualizada" : "Organizacion creada",
          editing ? "Los cambios fueron guardados." : "El nuevo tenant ya esta disponible."
        );
        this.saving.set(false);
        this.dialogOpen.set(false);
        this.refresh();
      },
      error: (e) => {
        this.toast.error("Error", e?.error?.message ?? e?.message ?? "No se pudo guardar la organizacion");
        this.saving.set(false);
      },
    });
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.api.deleteOrganizationObs(target.id).subscribe({
      next: () => {
        this.toast.success("Organizacion eliminada", target.name);
        this.deleteTarget.set(null);
        this.refresh();
      },
      error: (e) => {
        this.toast.error("Error", e?.error?.message ?? e?.message ?? "No se pudo eliminar la organizacion");
        this.deleteTarget.set(null);
      },
    });
  }

  resetUsage(org: Organization): void {
    this.api.resetOrganizationUsageObs(org.id).subscribe({
      next: () => {
        this.toast.success("Uso reiniciado", org.name);
        this.refresh();
      },
      error: (e) => this.toast.error("Error", e?.error?.message ?? e?.message ?? "No se pudo reiniciar el uso"),
    });
  }

  resetAllUsage(): void {
    const organizations = this.organizations();
    if (organizations.length === 0) return;

    this.saving.set(true);
    forkJoin(organizations.map((org) => this.api.resetOrganizationUsageObs(org.id))).subscribe({
      next: () => {
        this.toast.success("Uso reiniciado", "Todas las organizaciones fueron recargadas.");
        this.saving.set(false);
        this.refresh();
      },
      error: (e) => {
        this.toast.error("Error", e?.error?.message ?? e?.message ?? "No se pudo reiniciar el uso");
        this.saving.set(false);
      },
    });
  }

  limitsInvalid(): boolean {
    const value = this.form.getRawValue();
    const limits = this.planLimits(value.plan);
    const soft = limits.soft;
    const hard = limits.hard;
    const usage = Number(value.currentUsage);
    return hard < soft || usage > hard;
  }

  selectedPlanLimits(): { soft: number; hard: number } {
    return this.planLimits(this.form.controls.plan.value);
  }

  planLimits(plan: Plan): { soft: number; hard: number } {
    switch (plan) {
      case "enterprise": return { soft: 10000, hard: 12000 };
      case "growth": return { soft: 3000, hard: 3600 };
      default: return { soft: 1000, hard: 1200 };
    }
  }

  usagePct(org: Organization): number {
    return Math.min(100, (org.currentUsage / Math.max(1, org.hardLimit)) * 100);
  }

  usageClass(org: Organization): string {
    if (org.currentUsage >= org.hardLimit) return "bg-destructive";
    if (org.currentUsage >= org.softLimit) return "bg-amber-500";
    return "bg-primary";
  }

  planBadgeClass(plan: Plan): string {
    switch (plan) {
      case "enterprise": return "bg-amber-100 text-amber-700 border-amber-200";
      case "growth": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  }

  planLabel(plan: Plan): string {
    switch (plan) {
      case "enterprise": return "Enterprise";
      case "growth": return "Growth";
      default: return "Starter";
    }
  }

  countryLabel(country: Country): string {
    switch (country) {
      case "AR": return "Argentina";
      case "CL": return "Chile";
      case "CO": return "Colombia";
      case "MX": return "Mexico";
      default: return country;
    }
  }

  fmtDate(d: string): string {
    return this.i18n.formatDate(d, this.ui.locale());
  }
}

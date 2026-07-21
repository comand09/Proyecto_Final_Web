import { Component, OnInit, inject, signal , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ApiClient } from "../../../core/services/api-client";
import { ToastService } from "../../../core/services/toast.service";
import { ShippingRule } from "../../../core/models/shipcore.models";
import { describeRule } from "../../../core/services/quote-engine";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { DataStateComponent } from "../../../shared/components/data-state/data-state.component";
import { DataTableComponent, Column } from "../../../shared/components/data-table/data-table.component";
import { ConfirmDialogComponent } from "../../../shared/components/confirm-dialog/confirm-dialog.component";
import { RuleFormDialogComponent } from "../components/rule-form-dialog.component";

const ACTION_LABEL: Record<string, string> = {
  surcharge: "Recargo",
  discount: "Descuento",
  block: "Bloquear",
  prefer: "Priorizar",
};

const FIELD_LABEL: Record<string, string> = {
  weight: "Peso",
  zone: "Zona",
  serviceType: "Servicio",
  carrier: "Courier",
};

@Component({
  selector: "app-rules-list-page",
  standalone: true,
  imports: [
    CommonModule,
    PageHeaderComponent,
    DataStateComponent,
    DataTableComponent,
    ConfirmDialogComponent,
    RuleFormDialogComponent,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Reglas de negocio"
        description="Configurá recargos, descuentos, bloqueos y priorizaciones que se aplican al cotizar."
        [actionsTpl]="actionsTpl"
      ></app-page-header>

      <ng-template #actionsTpl>
        <button class="btn btn-primary btn-sm" (click)="openCreate()">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
          Nueva regla
        </button>
      </ng-template>

      <app-data-state [isLoading]="loading()" [error]="error()" [onRetry]="refresh" [empty]="!loading() && !error() && rules().length === 0">
        <div class="card">
          <div class="card-content">
            @if (rules().length === 0) {
              <p class="py-8 text-center text-sm text-muted-foreground">No hay reglas configuradas.</p>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b text-left text-xs text-muted-foreground">
                      <th class="px-3 py-2 font-medium">Regla</th>
                      <th class="px-3 py-2 font-medium">Campo</th>
                      <th class="px-3 py-2 font-medium">Acción</th>
                      <th class="px-3 py-2 font-medium">Prioridad</th>
                      <th class="px-3 py-2 font-medium">Estado</th>
                      <th class="px-3 py-2 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (r of rules(); track r.id) {
                      <tr class="border-b last:border-0">
                        <td class="px-3 py-2">
                          <div class="font-medium">{{ r.name }}</div>
                          <div class="text-xs text-muted-foreground">{{ describe(r) }}</div>
                        </td>
                        <td class="px-3 py-2">
                          <span class="badge badge-outline">{{ fieldLabel(r.field) }}</span>
                        </td>
                        <td class="px-3 py-2">
                          <span class="badge" [class]="actionBadgeClass(r.action)">{{ actionLabel(r.action) }}</span>
                          @if (r.action === 'surcharge' || r.action === 'discount') {
                            <span class="ml-1 text-xs">{{ r.action === 'surcharge' ? '+' : '-' }}{{ r.actionValue }}%</span>
                          }
                        </td>
                        <td class="px-3 py-2 text-xs">{{ r.priority }}</td>
                        <td class="px-3 py-2">
                          <button
                            class="inline-flex h-6 w-11 items-center rounded-full transition-colors"
                            [class.bg-primary]="r.active"
                            [class.bg-muted]="!r.active"
                            (click)="toggleActive(r)"
                            [attr.aria-label]="r.active ? 'Desactivar' : 'Activar'"
                          >
                            <span class="inline-block size-4 transform rounded-full bg-white transition-transform" [class.translate-x-6]="r.active" [class.translate-x-1]="!r.active"></span>
                          </button>
                        </td>
                        <td class="px-3 py-2 text-right">
                          <div class="flex items-center justify-end gap-1">
                            <button class="btn btn-ghost btn-icon" style="height:32px;width:32px;" aria-label="Editar" (click)="openEdit(r)">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>
                            </button>
                            <button class="btn btn-ghost btn-icon text-destructive hover:text-destructive" style="height:32px;width:32px;" aria-label="Eliminar" (click)="deleteTarget.set(r)">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      </app-data-state>

      <app-confirm-dialog
        [open]="!!deleteTarget()"
        title="Eliminar regla"
        [description]="'¿Seguro que querés eliminar la regla ' + (deleteTarget()?.name ?? '') + '?'"
        confirmLabel="Eliminar"
        [destructive]="true"
        (confirmed)="confirmDelete()"
        (cancelled)="deleteTarget.set(null)"
      ></app-confirm-dialog>

      <app-rule-form-dialog
        [open]="formOpen()"
        [rule]="editingRule()"
        (saved)="onSaved()"
        (cancelled)="closeForm()"
      ></app-rule-form-dialog>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesListPageComponent implements OnInit {
  private api = inject(ApiClient);
  private toast = inject(ToastService);

  protected loading = signal(false);
  protected error = signal<unknown>(null);
  protected rules = signal<ShippingRule[]>([]);
  protected formOpen = signal(false);
  protected editingRule = signal<ShippingRule | null>(null);
  protected deleteTarget = signal<ShippingRule | null>(null);
  protected togglingId = signal<string | null>(null);

  ngOnInit(): void {
    this.refresh();
  }

  refresh = (): void => {
    this.loading.set(true);
    this.error.set(null);
    setTimeout(() => {
      try {
        this.rules.set(this.api.listRules());
      } catch (e) {
        this.error.set(e);
      } finally {
        this.loading.set(false);
      }
    }, 100);
  };

  openCreate(): void {
    this.editingRule.set(null);
    this.formOpen.set(true);
  }

  openEdit(r: ShippingRule): void {
    this.editingRule.set(r);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingRule.set(null);
  }

  onSaved(): void {
    this.closeForm();
    this.refresh();
  }

  toggleActive(r: ShippingRule): void {
    this.togglingId.set(r.id);
    setTimeout(() => {
      try {
        this.api.updateRule(r.id, { active: !r.active });
        this.toast.success(r.active ? "Regla desactivada" : "Regla activada", r.name);
        this.refresh();
      } catch (e: any) {
        this.toast.error("Error", e?.message ?? "No se pudo actualizar");
      } finally {
        this.togglingId.set(null);
      }
    }, 200);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    try {
      this.api.deleteRule(target.id);
      this.toast.success("Regla eliminada", target.name);
      this.refresh();
    } catch (e: any) {
      this.toast.error("Error", e?.message ?? "No se pudo eliminar");
    } finally {
      this.deleteTarget.set(null);
    }
  }

  describe(r: ShippingRule): string {
    return describeRule(r);
  }

  actionLabel(a: string): string {
    return ACTION_LABEL[a] ?? a;
  }

  fieldLabel(f: string): string {
    return FIELD_LABEL[f] ?? f;
  }

  actionBadgeClass(a: string): string {
    switch (a) {
      case "surcharge": return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400";
      case "discount": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
      case "block": return "bg-destructive text-destructive-foreground";
      case "prefer": return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
      default: return "badge-secondary";
    }
  }
}

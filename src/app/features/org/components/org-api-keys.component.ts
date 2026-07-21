import { Component, OnInit, inject, signal , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ApiClient } from "../../../core/services/api-client";
import { UiService } from "../../../core/services/ui.service";
import { I18nService } from "../../../core/services/i18n.service";
import { ToastService } from "../../../core/services/toast.service";
import { ApiEnv, ApiKey } from "../../../core/models/shipcore.models";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { DataStateComponent } from "../../../shared/components/data-state/data-state.component";
import { ConfirmDialogComponent } from "../../../shared/components/confirm-dialog/confirm-dialog.component";

@Component({
  selector: "app-org-api-keys",
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, DataStateComponent, ConfirmDialogComponent],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold">API Keys</h2>
          <p class="text-sm text-muted-foreground">Claves de acceso a la API de ShipCore.</p>
        </div>
        <button class="btn btn-primary btn-sm" (click)="openCreate()">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
          Generar nueva key
        </button>
      </div>

      <app-data-state [isLoading]="loading()" [error]="error()" [onRetry]="refresh" [empty]="!loading() && !error() && keys().length === 0">
        <div class="card">
          <div class="card-content">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b text-left text-xs text-muted-foreground">
                    <th class="px-3 py-2 font-medium">Preview</th>
                    <th class="px-3 py-2 font-medium">Entorno</th>
                    <th class="px-3 py-2 font-medium">Uso / Cuota</th>
                    <th class="px-3 py-2 font-medium">Último uso</th>
                    <th class="px-3 py-2 font-medium">Creada</th>
                    <th class="px-3 py-2 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (k of keys(); track k.id) {
                    <tr class="border-b last:border-0">
                      <td class="px-3 py-2 font-mono text-xs">••••{{ k.keyPreview }}</td>
                      <td class="px-3 py-2">
                        <span class="badge" [class]="k.environment === 'prod' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'">
                          {{ k.environment === 'prod' ? 'Producción' : 'Sandbox' }}
                        </span>
                      </td>
                      <td class="px-3 py-2">
                        <div class="flex items-center gap-2">
                          <div class="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                            <div class="h-full bg-primary" [style.width.%]="usagePct(k)"></div>
                          </div>
                          <span class="text-xs text-muted-foreground">{{ k.usageCount }} / {{ k.quotaLimit }}</span>
                        </div>
                      </td>
                      <td class="px-3 py-2 text-xs text-muted-foreground">{{ fmtDateTime(k.lastUsedAt) }}</td>
                      <td class="px-3 py-2 text-xs text-muted-foreground">{{ fmtDate(k.createdAt) }}</td>
                      <td class="px-3 py-2 text-right">
                        <button class="btn btn-ghost btn-icon text-destructive hover:text-destructive" style="height:32px;width:32px;" aria-label="Revocar" (click)="revokeTarget.set(k)">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </app-data-state>

      <!-- Create dialog -->
      @if (createOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="dialog-backdrop" (click)="closeCreate()"></div>
          <div class="dialog-panel max-w-md">
            <h3 class="text-lg font-semibold">Generar nueva API Key</h3>
            <p class="mt-1 text-sm text-muted-foreground">Elegí el entorno. La key completa se mostrará una sola vez.</p>
            <div class="mt-4 space-y-3">
              <div>
                <label class="label">Entorno</label>
                <select class="input mt-1.5" [value]="env()" (change)="onEnvChange($event)">
                  <option value="sandbox">Sandbox</option>
                  <option value="prod">Producción</option>
                </select>
              </div>
            </div>
            <div class="mt-6 flex justify-end gap-2">
              <button type="button" class="btn btn-outline btn-md" (click)="closeCreate()" [disabled]="creating()">Cancelar</button>
              <button type="button" class="btn btn-primary btn-md" (click)="handleCreate()" [disabled]="creating()">
                @if (creating()) { Generando… } @else { Generar }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Created key display -->
      @if (createdKey(); as ck) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="dialog-backdrop"></div>
          <div class="dialog-panel max-w-md">
            <div class="flex items-start gap-3">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
              </div>
              <div class="flex-1">
                <h3 class="text-base font-semibold">API Key generada</h3>
                <p class="mt-1 text-sm text-muted-foreground">Copiá esta key ahora. Por seguridad, no se volverá a mostrar.</p>
              </div>
            </div>
            <div class="mt-4">
              <div class="flex items-center gap-2 rounded-md border bg-muted/40 p-3">
                <code class="flex-1 truncate font-mono text-xs">{{ ck.fullKey }}</code>
                <button class="btn btn-ghost btn-sm" (click)="copyKey(ck.fullKey!)">
                  @if (copied()) {
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                  }
                  {{ copied() ? 'Copiado' : 'Copiar' }}
                </button>
              </div>
            </div>
            <div class="mt-6 flex justify-end">
              <button class="btn btn-primary btn-md" (click)="closeCreatedKey()">Entendido</button>
            </div>
          </div>
        </div>
      }

      <app-confirm-dialog
        [open]="!!revokeTarget()"
        title="Revocar API Key"
        [description]="'¿Seguro que querés revocar la key ••••' + (revokeTarget()?.keyPreview ?? '') + '?'"
        confirmLabel="Revocar"
        [destructive]="true"
        (confirmed)="confirmRevoke()"
        (cancelled)="revokeTarget.set(null)"
      ></app-confirm-dialog>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgApiKeysComponent implements OnInit {
  private api = inject(ApiClient);
  private ui = inject(UiService);
  private i18n = inject(I18nService);
  private toast = inject(ToastService);

  protected loading = signal(false);
  protected error = signal<unknown>(null);
  protected keys = signal<ApiKey[]>([]);
  protected createOpen = signal(false);
  protected env = signal<ApiEnv>("sandbox");
  protected creating = signal(false);
  protected createdKey = signal<ApiKey | null>(null);
  protected copied = signal(false);
  protected revokeTarget = signal<ApiKey | null>(null);

  ngOnInit(): void {
    this.refresh();
  }

  refresh = (): void => {
    this.loading.set(true);
    this.error.set(null);
    setTimeout(() => {
      try {
        this.keys.set(this.api.listApiKeys());
      } catch (e) {
        this.error.set(e);
      } finally {
        this.loading.set(false);
      }
    }, 100);
  };

  openCreate(): void {
    this.env.set("sandbox");
    this.createOpen.set(true);
  }

  closeCreate(): void {
    if (this.creating()) return;
    this.createOpen.set(false);
  }

  onEnvChange(e: Event): void {
    this.env.set((e.target as HTMLSelectElement).value as ApiEnv);
  }

  handleCreate(): void {
    this.creating.set(true);
    setTimeout(() => {
      try {
        const k = this.api.createApiKey(this.env());
        this.createdKey.set(k);
        this.createOpen.set(false);
        this.toast.success("API Key generada", `Entorno: ${k.environment}`);
        this.refresh();
      } catch (e: any) {
        this.toast.error("Error", e?.message ?? "No se pudo generar");
      } finally {
        this.creating.set(false);
      }
    }, 300);
  }

  closeCreatedKey(): void {
    this.createdKey.set(null);
    this.copied.set(false);
  }

  copyKey(key: string): void {
    try {
      navigator.clipboard.writeText(key);
      this.copied.set(true);
      this.toast.success("Copiado", "La key está en el portapapeles");
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.toast.error("No se pudo copiar", "Copiala manualmente");
    }
  }

  confirmRevoke(): void {
    const target = this.revokeTarget();
    if (!target) return;
    try {
      this.api.deleteApiKey(target.id);
      this.toast.success("API Key revocada", `••••${target.keyPreview}`);
      this.refresh();
    } catch (e: any) {
      this.toast.error("Error", e?.message ?? "No se pudo revocar");
    } finally {
      this.revokeTarget.set(null);
    }
  }

  usagePct(k: ApiKey): number {
    return Math.min(100, (k.usageCount / Math.max(1, k.quotaLimit)) * 100);
  }

  fmtDate(d: string): string {
    return this.i18n.formatDate(d, this.ui.locale());
  }

  fmtDateTime(d: string | null): string {
    return this.i18n.formatDateTime(d, this.ui.locale());
  }
}

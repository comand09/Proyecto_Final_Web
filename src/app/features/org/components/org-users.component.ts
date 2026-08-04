import { Component, OnInit, inject, signal , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ApiClient } from "../../../core/services/api-client";
import { AuthService } from "../../../core/services/auth.service";
import { UiService } from "../../../core/services/ui.service";
import { I18nService } from "../../../core/services/i18n.service";
import { ToastService } from "../../../core/services/toast.service";
import { Organization, Role, User } from "../../../core/models/shipcore.models";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { DataStateComponent } from "../../../shared/components/data-state/data-state.component";
import { ConfirmDialogComponent } from "../../../shared/components/confirm-dialog/confirm-dialog.component";

@Component({
  selector: "app-org-users",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, DataStateComponent, ConfirmDialogComponent],
  template: `
    <div class="shipcore-panel-page org-users-panel space-y-6">
      <div class="section-heading flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold">Usuarios</h2>
          <p class="text-sm text-muted-foreground">Gestioná los usuarios de tu organización.</p>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-outline btn-sm" (click)="syncBackend()">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
            Sincronizar a BD
          </button>
          <button class="btn btn-primary btn-sm" (click)="openCreate()">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
            Nuevo usuario
          </button>
        </div>
      </div>

      <app-data-state class="shipcore-data-block" [isLoading]="loading()" [error]="error()" [onRetry]="refresh" [empty]="!loading() && !error() && users().length === 0">
        <div class="card">
          <div class="card-content">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b text-left text-xs text-muted-foreground">
                    <th class="px-3 py-2 font-medium">Nombre</th>
                    <th class="px-3 py-2 font-medium">Email</th>
                    <th class="px-3 py-2 font-medium">Organizacion</th>
                    <th class="px-3 py-2 font-medium">Rol</th>
                    <th class="px-3 py-2 font-medium">Estado</th>
                    <th class="px-3 py-2 font-medium">Creado</th>
                    <th class="px-3 py-2 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (u of users(); track u.id) {
                    <tr class="border-b last:border-0">
                      <td class="px-3 py-2 font-medium">{{ u.name }}</td>
                      <td class="px-3 py-2 text-muted-foreground">{{ u.email }}</td>
                      <td class="px-3 py-2 text-muted-foreground">{{ organizationName(u) }}</td>
                      <td class="px-3 py-2">
                        <span class="badge" [class]="u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'badge-secondary'">
                          {{ u.role === 'admin' ? 'Admin' : 'Operador' }}
                        </span>
                      </td>
                      <td class="px-3 py-2">
                        <span class="badge" [class]="u.active ? 'bg-emerald-100 text-emerald-700' : 'badge-outline'">
                          {{ u.active ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td class="px-3 py-2 text-xs text-muted-foreground">{{ fmtDate(u.createdAt) }}</td>
                      <td class="px-3 py-2 text-right">
                        <div class="flex items-center justify-end gap-1">
                          <button class="btn btn-ghost btn-icon" style="height:32px;width:32px;" aria-label="Editar" (click)="openEdit(u)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>
                          </button>
                          @if (u.id !== currentUser?.id) {
                            <button class="btn btn-ghost btn-icon text-destructive hover:text-destructive" style="height:32px;width:32px;" aria-label="Eliminar" (click)="deleteTarget.set(u)">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                            </button>
                          }
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

      <!-- User form dialog -->
      @if (dialogOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="dialog-backdrop" (click)="closeDialog()"></div>
          <div class="dialog-panel max-w-md">
            <h3 class="text-lg font-semibold">{{ editing() ? 'Editar usuario' : 'Nuevo usuario' }}</h3>
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="mt-4 space-y-4" novalidate>
              <div>
                <label for="name" class="label">Nombre</label>
                <input id="name" type="text" formControlName="name" class="input mt-1.5" />
                @if (form.controls.name.touched && form.controls.name.invalid) { <p class="mt-1 text-xs text-destructive">Nombre requerido</p> }
              </div>
              <div>
                <label for="email" class="label">Email</label>
                <input id="email" type="email" formControlName="email" class="input mt-1.5" />
                @if (form.controls.email.touched && form.controls.email.invalid) { <p class="mt-1 text-xs text-destructive">Email inválido</p> }
              </div>
              <div>
                <label for="password" class="label">Contraseña</label>
                <input id="password" type="text" formControlName="password" class="input mt-1.5" />
                @if (form.controls.password.touched && form.controls.password.invalid) { <p class="mt-1 text-xs text-destructive">Mínimo 3 caracteres</p> }
              </div>
              <div>
                <label for="organizationId" class="label">Organizacion</label>
                <select id="organizationId" formControlName="organizationId" class="input mt-1.5">
                  @for (org of organizations(); track org.id) {
                    <option [value]="org.id">{{ org.name }}</option>
                  }
                </select>
                @if (form.controls.organizationId.touched && form.controls.organizationId.invalid) { <p class="mt-1 text-xs text-destructive">Selecciona una organizacion</p> }
              </div>
              <div>
                <label for="role" class="label">Rol</label>
                <select id="role" formControlName="role" class="input mt-1.5">
                  <option value="operador">Operador</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  [class.bg-primary]="form.controls.active.value"
                  [class.bg-muted]="!form.controls.active.value"
                  (click)="form.controls.active.setValue(!form.controls.active.value)"
                >
                  <span class="inline-block size-4 transform rounded-full bg-white transition-transform" [class.translate-x-6]="form.controls.active.value" [class.translate-x-1]="!form.controls.active.value"></span>
                </button>
                <span class="text-sm">Usuario activo</span>
              </div>
              <div class="flex justify-end gap-2 pt-2">
                <button type="button" class="btn btn-outline btn-md" (click)="closeDialog()" [disabled]="submitting()">Cancelar</button>
                <button type="submit" class="btn btn-primary btn-md" [disabled]="submitting()">
                  @if (submitting()) { Guardando… } @else { Guardar }
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <app-confirm-dialog
        [open]="!!deleteTarget()"
        title="Eliminar usuario"
        [description]="'¿Seguro que querés eliminar a ' + (deleteTarget()?.name ?? '') + '?'"
        confirmLabel="Eliminar"
        [destructive]="true"
        (confirmed)="confirmDelete()"
        (cancelled)="deleteTarget.set(null)"
      ></app-confirm-dialog>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgUsersComponent implements OnInit {
  private api = inject(ApiClient);
  private auth = inject(AuthService);
  private ui = inject(UiService);
  private i18n = inject(I18nService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  protected loading = signal(false);
  protected error = signal<unknown>(null);
  protected users = signal<User[]>([]);
  protected organizations = signal<Organization[]>([]);
  protected dialogOpen = signal(false);
  protected editing = signal<User | null>(null);
  protected submitting = signal(false);
  protected deleteTarget = signal<User | null>(null);

  protected currentUser = this.auth.user();

  protected form = this.fb.nonNullable.group({
    name: ["", [Validators.required, Validators.minLength(2)]],
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(3)]],
    organizationId: ["", [Validators.required]],
    role: ["operador" as Role, [Validators.required]],
    active: [true],
  });

  ngOnInit(): void {
    this.loadOrganizations();
    this.refresh();
  }

  private loadOrganizations(): void {
    this.api.listOrganizationsObs().subscribe({
      next: (organizations) => this.organizations.set(organizations || []),
      error: () => this.organizations.set([]),
    });
  }

  refresh = (): void => {
    this.loading.set(true);
    this.error.set(null);
    this.api.listUsersObs().subscribe({
      next: (users) => {
        this.users.set(users || []);
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
    const defaultOrganizationId = this.organizations()[0]?.id || this.auth.organization()?.id || "";
    this.form.reset({ name: "", email: "", password: "", organizationId: defaultOrganizationId, role: "operador", active: true });
    this.dialogOpen.set(true);
  }

  openEdit(u: User): void {
    this.editing.set(u);
    this.form.reset({
      name: u.name,
      email: u.email,
      password: u.password || "••••••••",
      organizationId: u.organizationId,
      role: u.role,
      active: u.active,
    });
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    if (this.submitting()) return;
    this.dialogOpen.set(false);
    this.editing.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const v = this.form.getRawValue();

    if (this.editing()) {
      this.api.updateUserObs(this.editing()!.id, v).subscribe({
        next: () => {
          this.toast.success("Usuario actualizado en BD", v.name);
          this.closeDialog();
          this.refresh();
          this.submitting.set(false);
        },
        error: (err) => {
          this.toast.error("Error", err?.error?.message ?? err?.message ?? "No se pudo actualizar");
          this.submitting.set(false);
        },
      });
    } else {
      this.api.createUserObs(v).subscribe({
        next: () => {
          this.toast.success("Usuario insertado en BD", v.name);
          this.closeDialog();
          this.refresh();
          this.submitting.set(false);
        },
        error: (err) => {
          this.toast.error("Error", err?.error?.message ?? err?.message ?? "No se pudo guardar");
          this.submitting.set(false);
        },
      });
    }
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.api.deleteUserObs(target.id).subscribe({
      next: () => {
        this.toast.success("Usuario eliminado de BD", target.name);
        this.deleteTarget.set(null);
        this.refresh();
      },
      error: (err) => {
        this.toast.error("Error", err?.error?.message ?? err?.message ?? "No se pudo eliminar");
        this.deleteTarget.set(null);
      },
    });
  }


  syncBackend(): void {
    this.toast.info("Enviando datos a BD...", "Insertando datos en la base de datos backend.");
    this.api.syncMockDataToBackend().subscribe({
      next: (res) => {
        this.toast.success("Inserción completada en BD", `Carriers: ${res.carriers}, Reglas: ${res.rules}, Usuarios: ${res.users}`);
        this.refresh();
      },
    });
  }

  fmtDate(d: string): string {
    return this.i18n.formatDate(d, this.ui.locale());
  }

  organizationName(user: User): string {
    return user.organizationName || this.organizations().find((org) => org.id === user.organizationId)?.name || "Sin organizacion";
  }
}

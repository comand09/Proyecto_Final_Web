import { Component, EventEmitter, Input, Output, inject, signal, OnChanges, SimpleChanges, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ApiClient } from "../../../core/services/api-client";
import { AuthService } from "../../../core/services/auth.service";
import { ToastService } from "../../../core/services/toast.service";

@Component({
  selector: "app-user-profile-dialog",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    @if (open) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="dialog-backdrop" (click)="onCancel()"></div>
        <div class="dialog-panel max-w-lg w-full max-h-[90vh] overflow-y-auto">

          <div class="flex items-center justify-between border-b pb-3">
            <div>
              <h3 class="text-lg font-semibold">Perfil de Usuario</h3>
              <p class="text-xs text-muted-foreground">Actualizá tu información personal no sensible.</p>
            </div>
            <button class="btn btn-ghost btn-icon" (click)="onCancel()" aria-label="Cerrar">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Informative Notice -->
          <div class="mt-4 rounded-md bg-muted/50 p-3 border border-border">
            <div class="flex items-center gap-2 text-xs font-semibold text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Campos protegidos y de contexto
            </div>
            <p class="mt-1 text-[11px] text-muted-foreground">
              Tu Email, Rol y Organización son asignados por la administración del sistema y no pueden editarse directamente por seguridad.
            </p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="mt-4 space-y-4" novalidate>

            <!-- Disabled / Read-Only Fields -->
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="label text-xs">Correo Electrónico (Login)</label>
                <div class="input mt-1 flex items-center justify-between bg-muted/40 text-xs text-muted-foreground cursor-not-allowed">
                  <span class="truncate">{{ email() }}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
              </div>
              <div>
                <label class="label text-xs">Rol Asignado</label>
                <div class="input mt-1 flex items-center justify-between bg-muted/40 text-xs cursor-not-allowed">
                  <span class="font-semibold capitalize" [class.text-primary]="role() === 'admin'">
                    {{ role() === 'admin' ? 'Administrador' : 'Operador' }}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
              </div>
            </div>

            <!-- Editable Fields -->
            <div class="border-t pt-3">
              <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Información Personal (Editable)</h4>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label for="up-firstName" class="label">Nombre</label>
                  <input id="up-firstName" type="text" formControlName="firstName" class="input mt-1" placeholder="Tu nombre" />
                  @if (form.controls.firstName.touched && form.controls.firstName.invalid) {
                    <p class="mt-1 text-xs text-destructive">Nombre requerido</p>
                  }
                </div>
                <div>
                  <label for="up-lastName" class="label">Apellido</label>
                  <input id="up-lastName" type="text" formControlName="lastName" class="input mt-1" placeholder="Tu apellido" />
                  @if (form.controls.lastName.touched && form.controls.lastName.invalid) {
                    <p class="mt-1 text-xs text-destructive">Apellido requerido</p>
                  }
                </div>
              </div>

              <div class="mt-3">
                <label for="up-phone" class="label">Teléfono de contacto</label>
                <input id="up-phone" type="text" formControlName="phone" class="input mt-1" placeholder="Ej: +51 987654321" />
              </div>

              <div class="mt-3">
                <label for="up-address" class="label">Dirección / Oficina</label>
                <input id="up-address" type="text" formControlName="address" class="input mt-1" placeholder="Ej: Av. Principal 123, Lima" />
              </div>

              <div class="mt-3">
                <label for="up-bio" class="label">Biografía / Notas</label>
                <textarea id="up-bio" formControlName="bio" rows="2" class="input mt-1 py-2" placeholder="Resumen o rol interno..."></textarea>
              </div>
            </div>

            @if (errorMsg()) {
              <div class="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{{ errorMsg() }}</div>
            }

            <div class="flex justify-end gap-2 pt-3 border-t">
              <button type="button" class="btn btn-outline btn-md" (click)="onCancel()" [disabled]="submitting()">Cancelar</button>
              <button type="submit" class="btn btn-primary btn-md" [disabled]="submitting()">
                @if (submitting()) {
                  <svg class="size-4 animate-spin mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Guardando…
                } @else {
                  Guardar cambios
                }
              </button>
            </div>

          </form>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileDialogComponent implements OnChanges {
  @Input() open = false;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private api = inject(ApiClient);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  protected submitting = signal(false);
  protected errorMsg = signal<string | null>(null);

  protected email = signal("");
  protected role = signal("");

  protected form = this.fb.nonNullable.group({
    firstName: ["", [Validators.required]],
    lastName:  ["", [Validators.required]],
    phone:     [""],
    address:   [""],
    bio:       [""],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["open"] && this.open) {
      this.loadProfile();
    }
  }

  private loadProfile(): void {
    const user = this.auth.user();
    if (user) {
      this.email.set(user.email);
      this.role.set(user.role);
    }

    this.api.getProfileObs().subscribe({
      next: (profile: any) => {
        const nameParts = (profile.name || "").trim().split(" ");
        const first = profile.firstName || nameParts[0] || "";
        const last = profile.lastName || nameParts.slice(1).join(" ") || "";

        this.email.set(profile.email || user?.email || "");
        this.role.set(profile.role || user?.role || "");

        this.form.reset({
          firstName: first,
          lastName:  last,
          phone:     profile.phone || "",
          address:   profile.address || "",
          bio:       profile.bio || "",
        });
      },
      error: () => {
        // Fallback to local session
        if (user) {
          const nameParts = (user.name || "").trim().split(" ");
          this.form.reset({
            firstName: nameParts[0] || "",
            lastName:  nameParts.slice(1).join(" ") || "",
            phone:     "",
            address:   "",
            bio:       "",
          });
        }
      },
    });
  }

  onCancel(): void {
    if (this.submitting()) return;
    this.cancelled.emit();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMsg.set(null);
    const val = this.form.getRawValue();

    this.api.updateProfileObs(val).subscribe({
      next: (updatedUser) => {
        // Update local session
        const current = this.auth.user();
        if (current) {
          this.auth.setUser({
            ...current,
            name: `${val.firstName} ${val.lastName}`.trim(),
          });
        }
        this.toast.success("Perfil actualizado", `${val.firstName} ${val.lastName}`);
        this.submitting.set(false);
        this.saved.emit();
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || "No se pudo actualizar el perfil";
        this.errorMsg.set(msg);
        this.toast.error("Error", msg);
        this.submitting.set(false);
      },
    });
  }
}

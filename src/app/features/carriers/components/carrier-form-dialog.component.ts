import { Component, EventEmitter, Input, Output, inject, signal, OnChanges, SimpleChanges, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ApiClient } from "../../../core/services/api-client";
import { AuthService } from "../../../core/services/auth.service";
import { ToastService } from "../../../core/services/toast.service";
import { Carrier, Organization } from "../../../core/models/shipcore.models";

@Component({
  selector: "app-carrier-form-dialog",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    @if (open) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="dialog-backdrop" (click)="onCancel()"></div>
        <div class="dialog-panel max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto">
          <h3 class="text-lg font-semibold">{{ carrier ? 'Editar courier' : 'Nuevo courier' }}</h3>

          @if (carrier) {
            <p class="mt-1 text-sm text-muted-foreground">
              Editando <strong>{{ carrier.name }}</strong>. El código identificador no se puede cambiar.
            </p>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="mt-4 space-y-4" novalidate>
            <div>
              <label for="cf-name" class="label">Nombre del courier</label>
              <input id="cf-name" type="text" formControlName="name" class="input mt-1.5" placeholder="Ej: DHL Express" />
              @if (form.controls.name.touched && form.controls.name.invalid) {
                <p class="mt-1 text-xs text-destructive">Nombre requerido (mínimo 2 caracteres)</p>
              }
            </div>

            <div>
              <label for="cf-code" class="label">Código corto</label>
              <input id="cf-code" type="text" formControlName="code" class="input mt-1.5"
                     placeholder="Ej: DHL" [attr.disabled]="carrier ? '' : null" />
              @if (form.controls.code.touched && form.controls.code.invalid) {
                <p class="mt-1 text-xs text-destructive">Código requerido</p>
              }
            </div>

            <div>
              <label for="cf-serviceType" class="label">Tipo de servicio</label>
              <select id="cf-serviceType" formControlName="serviceType" class="input mt-1.5">
                <option value="standard">Estándar</option>
                <option value="express">Express</option>
                <option value="overnight">Overnight</option>
              </select>
            </div>

            <div>
              <label for="cf-organizationId" class="label">Organización</label>
              <select id="cf-organizationId" formControlName="organizationId" class="input mt-1.5">
                @for (org of organizations(); track org.id) {
                  <option [value]="org.id">{{ org.name }}</option>
                }
              </select>
              @if (form.controls.organizationId.touched && form.controls.organizationId.invalid) {
                <p class="mt-1 text-xs text-destructive">SeleccionÃ¡ una organizaciÃ³n</p>
              }
            </div>

            <div>
              <label for="cf-contactEmail" class="label">Email de contacto</label>
              <input id="cf-contactEmail" type="email" formControlName="contactEmail" class="input mt-1.5"
                     placeholder="contacto@carrier.com" />
              @if (form.controls.contactEmail.touched && form.controls.contactEmail.invalid) {
                <p class="mt-1 text-xs text-destructive">Email inválido</p>
              }
            </div>

            <div>
              <label for="cf-phone" class="label">Teléfono</label>
              <input id="cf-phone" type="text" formControlName="phone" class="input mt-1.5" placeholder="999999999" />
            </div>

            <div>
              <label for="cf-logoUrl" class="label">URL del logo (opcional)</label>
              <input
                id="cf-logoUrl"
                type="url"
                formControlName="logoUrl"
                class="input mt-1.5"
                placeholder="https://..."
                (input)="logoPreviewBroken.set(false)"
              />
              @if (form.controls.logoUrl.touched && form.controls.logoUrl.invalid) {
                <p class="mt-1 text-xs text-destructive">UsÃ¡ una URL vÃ¡lida que empiece con http:// o https://</p>
              }
              @if (form.controls.logoUrl.value.trim()) {
                <div class="carrier-logo-preview mt-2">
                  <div class="carrier-logo-preview-image">
                    @if (!logoPreviewBroken()) {
                      <img [src]="form.controls.logoUrl.value.trim()" alt="Vista previa del logo" (error)="onLogoPreviewError($event)" />
                    }
                    @if (logoPreviewBroken()) {
                      <span>Sin vista previa</span>
                    }
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-medium">Vista previa del logo</p>
                    <p class="truncate text-xs text-muted-foreground">{{ form.controls.logoUrl.value.trim() }}</p>
                  </div>
                </div>
              }
            </div>

            @if (errorMsg()) {
              <div class="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{{ errorMsg() }}</div>
            }

            <div class="flex justify-end gap-2 pt-2">
              <button type="button" class="btn btn-outline btn-md" (click)="onCancel()" [disabled]="submitting()">Cancelar</button>
              <button type="submit" class="btn btn-primary btn-md" [disabled]="submitting()">
                @if (submitting()) { Guardando… } @else { Guardar }
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarrierFormDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() carrier: Carrier | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private api = inject(ApiClient);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  protected submitting = signal(false);
  protected errorMsg = signal<string | null>(null);
  protected logoPreviewBroken = signal(false);
  protected organizations = signal<Organization[]>([]);

  protected form = this.fb.nonNullable.group({
    name:         ["", [Validators.required, Validators.minLength(2)]],
    code:         ["", [Validators.required]],
    serviceType:  ["standard", [Validators.required]],
    organizationId: ["", [Validators.required]],
    contactEmail: ["", [Validators.required, Validators.email]],
    phone:        ["999999999"],
    logoUrl:      ["", [Validators.pattern(/^$|^https?:\/\/.+/i)]],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["carrier"] || changes["open"]) {
      this.errorMsg.set(null);
      this.logoPreviewBroken.set(false);
      if (this.open) {
        this.loadOrganizations();
      }
      if (this.carrier) {
        this.form.reset({
          name:         this.carrier.name,
          code:         this.carrier.code,
          serviceType:  "standard",
          organizationId: this.carrier.organizationId || this.auth.organization()?.id || "",
          contactEmail: "contacto@carrier.com",
          phone:        "999999999",
          logoUrl:      this.carrier.logoUrl || "",
        });
        // Lock code when editing
        this.form.controls.code.disable();
      } else {
        this.form.reset({
          name:         "",
          code:         "",
          serviceType:  "standard",
          organizationId: this.auth.organization()?.id || "",
          contactEmail: "",
          phone:        "999999999",
          logoUrl:      "",
        });
        this.form.controls.code.enable();
      }
    }
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
    const raw = this.form.getRawValue();
    const val = {
      ...raw,
      name: raw.name.trim(),
      code: raw.code.trim().toUpperCase(),
      contactEmail: raw.contactEmail.trim(),
      phone: raw.phone.trim(),
      logoUrl: raw.logoUrl.trim(),
    };

    const request$ = this.carrier
      ? this.api.updateCarrierObs(this.carrier.id, val)
      : this.api.createCarrierObs(val);

    request$.subscribe({
      next: (res) => {
        this.toast.success(
          this.carrier ? "Courier actualizado" : "Courier creado",
          res.name
        );
        this.submitting.set(false);
        this.saved.emit();
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || "No se pudo guardar el courier";
        this.errorMsg.set(msg);
        this.toast.error("Error", msg);
        this.submitting.set(false);
      },
    });
  }

  onLogoPreviewError(event: Event): void {
    this.logoPreviewBroken.set(true);
    (event.target as HTMLImageElement).style.display = "none";
  }

  private loadOrganizations(): void {
    const current = this.auth.organization();
    if (current && this.organizations().length === 0) {
      this.organizations.set([current]);
    }

    this.api.listOrganizationsObs().subscribe({
      next: (orgs) => {
        const list = orgs && orgs.length ? orgs : (current ? [current] : []);
        this.organizations.set(list);
        if (!this.form.controls.organizationId.value && list.length) {
          this.form.controls.organizationId.setValue(list[0].id);
        }
      },
      error: () => {
        if (current) {
          this.organizations.set([current]);
          this.form.controls.organizationId.setValue(current.id);
        }
      },
    });
  }
}

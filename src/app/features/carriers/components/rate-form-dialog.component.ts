import { Component, Input, Output, EventEmitter, inject, signal, OnInit, OnChanges , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators, ValidatorFn, AbstractControl, ValidationErrors } from "@angular/forms";
import { ApiClient } from "../../../core/services/api-client";
import { ToastService } from "../../../core/services/toast.service";
import { Carrier, CarrierRate, RateSource, RateStatus, Zone } from "../../../core/models/shipcore.models";

const validRangeValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const vf = group.get("validFrom")?.value;
  const vt = group.get("validTo")?.value;
  if (vf && vt && new Date(vf) >= new Date(vt)) {
    return { validRange: true };
  }
  return null;
};

@Component({
  selector: "app-rate-form-dialog",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    @if (open) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="dialog-backdrop" (click)="cancel()"></div>
        <div class="dialog-panel max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-semibold">{{ rate ? 'Editar tarifa' : 'Nueva tarifa' }}</h3>
          <p class="mt-1 text-sm text-muted-foreground">Configurá la tarifa del courier. Si editás una tarifa existente, se creará una nueva versión.</p>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="mt-5 space-y-4" novalidate>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="carrierId" class="label">Courier</label>
                <select id="carrierId" formControlName="carrierId" class="input mt-1.5">
                  <option value="">Seleccioná un courier</option>
                  @for (c of carriers; track c.id) {
                    <option [value]="c.id">{{ c.name }} ({{ c.code }})</option>
                  }
                </select>
                @if (touched('carrierId') && invalid('carrierId', 'required')) { <p class="mt-1 text-xs text-destructive">Courier requerido</p> }
              </div>
              <div>
                <label for="zone" class="label">Zona</label>
                <select id="zone" formControlName="zone" class="input mt-1.5">
                  <option value="local">Local</option>
                  <option value="nacional">Nacional</option>
                  <option value="internacional">Internacional</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="validFrom" class="label">Vigencia desde</label>
                <input id="validFrom" type="date" formControlName="validFrom" class="input mt-1.5" />
                @if (touched('validFrom') && invalid('validFrom', 'required')) { <p class="mt-1 text-xs text-destructive">Requerido</p> }
              </div>
              <div>
                <label for="validTo" class="label">Vigencia hasta</label>
                <input id="validTo" type="date" formControlName="validTo" class="input mt-1.5" />
                @if (touched('validTo') && invalid('validTo', 'required')) { <p class="mt-1 text-xs text-destructive">Requerido</p> }
                @if (form.errors?.['validRange']) { <p class="mt-1 text-xs text-destructive">La fecha "hasta" debe ser mayor que "desde"</p> }
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label for="basePrice" class="label">Precio base</label>
                <input id="basePrice" type="number" step="any" min="0" formControlName="basePrice" class="input mt-1.5" />
                @if (touched('basePrice') && invalid('basePrice', 'min')) { <p class="mt-1 text-xs text-destructive">≥ 0</p> }
              </div>
              <div>
                <label for="pricePerKg" class="label">Precio por kg</label>
                <input id="pricePerKg" type="number" step="any" min="0" formControlName="pricePerKg" class="input mt-1.5" />
                @if (touched('pricePerKg') && invalid('pricePerKg', 'min')) { <p class="mt-1 text-xs text-destructive">≥ 0</p> }
              </div>
              <div>
                <label for="pricePerKm" class="label">Precio por km</label>
                <input id="pricePerKm" type="number" step="any" min="0" formControlName="pricePerKm" class="input mt-1.5" />
                @if (touched('pricePerKm') && invalid('pricePerKm', 'min')) { <p class="mt-1 text-xs text-destructive">≥ 0</p> }
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="minWeightKg" class="label">Peso mínimo (kg)</label>
                <input id="minWeightKg" type="number" step="any" min="0" formControlName="minWeightKg" class="input mt-1.5" />
              </div>
              <div>
                <label for="maxWeightKg" class="label">Peso máximo (kg)</label>
                <input id="maxWeightKg" type="number" step="any" min="0" formControlName="maxWeightKg" class="input mt-1.5" />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="transitDaysMin" class="label">Tránsito mín (días)</label>
                <input id="transitDaysMin" type="number" min="0" formControlName="transitDaysMin" class="input mt-1.5" />
              </div>
              <div>
                <label for="transitDaysMax" class="label">Tránsito máx (días)</label>
                <input id="transitDaysMax" type="number" min="0" formControlName="transitDaysMax" class="input mt-1.5" />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="status" class="label">Estado</label>
                <select id="status" formControlName="status" class="input mt-1.5">
                  <option value="active">Activa</option>
                  <option value="inactive">Inactiva</option>
                  <option value="draft">Borrador</option>
                </select>
              </div>
              <div>
                <label for="source" class="label">Origen</label>
                <select id="source" formControlName="source" class="input mt-1.5">
                  <option value="manual">Manual</option>
                  <option value="api">API</option>
                  <option value="import">Importación</option>
                </select>
              </div>
            </div>

            <div class="mt-6 flex justify-end gap-2">
              <button type="button" class="btn btn-outline btn-md" (click)="cancel()" [disabled]="submitting()">Cancelar</button>
              <button type="submit" class="btn btn-primary btn-md" [disabled]="submitting()">
                @if (submitting()) {
                  <svg class="size-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Guardando…
                } @else {
                  Guardar
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
export class RateFormDialogComponent implements OnInit, OnChanges {
  @Input() open = false;
  @Input() rate: CarrierRate | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private api = inject(ApiClient);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  protected carriers: Carrier[] = [];
  protected submitting = signal(false);

  protected form = this.fb.nonNullable.group(
    {
      carrierId: ["", [Validators.required]],
      zone: ["local" as Zone, [Validators.required]],
      validFrom: ["", [Validators.required]],
      validTo: ["", [Validators.required]],
      basePrice: [0, [Validators.required, Validators.min(0)]],
      pricePerKg: [0, [Validators.required, Validators.min(0)]],
      pricePerKm: [0, [Validators.required, Validators.min(0)]],
      minWeightKg: [0.1, [Validators.required, Validators.min(0)]],
      maxWeightKg: [50, [Validators.required, Validators.min(0)]],
      transitDaysMin: [1, [Validators.required, Validators.min(0)]],
      transitDaysMax: [5, [Validators.required, Validators.min(0)]],
      status: ["active" as RateStatus, [Validators.required]],
      source: ["manual" as RateSource, [Validators.required]],
    },
    { validators: validRangeValidator }
  );

  ngOnInit(): void {
    try {
      this.carriers = this.api.listCarriers();
    } catch {
      /* ignore */
    }
  }

  ngOnChanges(): void {
    if (this.open) {
      if (this.rate) {
        this.form.patchValue({
          carrierId: this.rate.carrierId,
          zone: this.rate.zone,
          validFrom: this.toDateInput(this.rate.validFrom),
          validTo: this.toDateInput(this.rate.validTo),
          basePrice: this.rate.basePrice,
          pricePerKg: this.rate.pricePerKg,
          pricePerKm: this.rate.pricePerKm,
          minWeightKg: this.rate.minWeightKg,
          maxWeightKg: this.rate.maxWeightKg,
          transitDaysMin: this.rate.transitDaysMin,
          transitDaysMax: this.rate.transitDaysMax,
          status: this.rate.status,
          source: this.rate.source,
        });
      } else {
        // Defaults
        const today = new Date();
        const yearAhead = new Date();
        yearAhead.setFullYear(today.getFullYear() + 1);
        this.form.patchValue({
          carrierId: this.carriers[0]?.id ?? "",
          zone: "local",
          validFrom: this.toDateInput(today),
          validTo: this.toDateInput(yearAhead),
          basePrice: 500,
          pricePerKg: 30,
          pricePerKm: 5,
          minWeightKg: 0.1,
          maxWeightKg: 30,
          transitDaysMin: 1,
          transitDaysMax: 3,
          status: "active",
          source: "manual",
        });
      }
    }
  }

  private toDateInput(d: string | Date): string {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toISOString().slice(0, 10);
  }

  touched(name: string): boolean {
    return this.form.get(name)!.touched;
  }

  invalid(name: string, error: string): boolean {
    return this.form.get(name)!.hasError(error);
  }

  cancel(): void {
    if (this.submitting()) return;
    this.cancelled.emit();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const v = this.form.getRawValue();
    setTimeout(() => {
      try {
        this.api.createRate({
          carrierId: v.carrierId,
          zone: v.zone,
          validFrom: new Date(v.validFrom).toISOString(),
          validTo: new Date(v.validTo).toISOString(),
          basePrice: Number(v.basePrice),
          pricePerKg: Number(v.pricePerKg),
          pricePerKm: Number(v.pricePerKm),
          minWeightKg: Number(v.minWeightKg),
          maxWeightKg: Number(v.maxWeightKg),
          transitDaysMin: Number(v.transitDaysMin),
          transitDaysMax: Number(v.transitDaysMax),
          status: v.status,
          source: v.source,
        });
        this.toast.success("Tarifa guardada", `v${this.rate ? this.rate.version + 1 : 1}`);
        this.saved.emit();
      } catch (e: any) {
        this.toast.error("Error", e?.message ?? "No se pudo guardar");
      } finally {
        this.submitting.set(false);
      }
    }, 300);
  }
}

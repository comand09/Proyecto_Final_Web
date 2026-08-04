import { Component, Input, Output, EventEmitter, inject, signal, OnInit, OnChanges, ChangeDetectionStrategy } from "@angular/core";
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
                <label for="rf-carrierId" class="label">Courier</label>
                @if (carriersLoading()) {
                  <div class="input mt-1.5 flex items-center gap-2 text-muted-foreground text-sm">
                    <svg class="size-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Cargando couriers…
                  </div>
                } @else {
                  <select id="rf-carrierId" formControlName="carrierId" class="input mt-1.5">
                    <option value="">Seleccioná un courier</option>
                    @for (c of carriers(); track c.id) {
                      <option [value]="c.id">{{ c.name }} ({{ c.code }})</option>
                    }
                  </select>
                }
                @if (touched('carrierId') && invalid('carrierId', 'required')) {
                  <p class="mt-1 text-xs text-destructive">Courier requerido</p>
                }
              </div>
              <div>
                <label for="rf-zone" class="label">Zona</label>
                <select id="rf-zone" formControlName="zone" class="input mt-1.5">
                  <option value="local">Local</option>
                  <option value="nacional">Nacional</option>
                  <option value="internacional">Internacional</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="rf-serviceType" class="label">Tipo de servicio</label>
                <select id="rf-serviceType" formControlName="serviceType" class="input mt-1.5">
                  <option value="standard">Estándar</option>
                  <option value="express">Express</option>
                  <option value="priority">Prioritario</option>
                </select>
              </div>
              <div>
                <label for="rf-versionNumber" class="label">Versión</label>
                <input id="rf-versionNumber" type="number" min="1" formControlName="versionNumber" class="input mt-1.5" />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="rf-validFrom" class="label">Vigencia desde</label>
                <input id="rf-validFrom" type="date" formControlName="validFrom" class="input mt-1.5" />
                @if (touched('validFrom') && invalid('validFrom', 'required')) { <p class="mt-1 text-xs text-destructive">Requerido</p> }
              </div>
              <div>
                <label for="rf-validTo" class="label">Vigencia hasta</label>
                <input id="rf-validTo" type="date" formControlName="validTo" class="input mt-1.5" />
                @if (touched('validTo') && invalid('validTo', 'required')) { <p class="mt-1 text-xs text-destructive">Requerido</p> }
                @if (form.errors?.['validRange']) { <p class="mt-1 text-xs text-destructive">La fecha "hasta" debe ser mayor que "desde"</p> }
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label for="rf-basePrice" class="label">Precio base</label>
                <input id="rf-basePrice" type="number" step="any" min="0" formControlName="basePrice" class="input mt-1.5" />
                @if (touched('basePrice') && invalid('basePrice', 'min')) { <p class="mt-1 text-xs text-destructive">≥ 0</p> }
              </div>
              <div>
                <label for="rf-pricePerKg" class="label">Precio por kg</label>
                <input id="rf-pricePerKg" type="number" step="any" min="0" formControlName="pricePerKg" class="input mt-1.5" />
              </div>
              <div>
                <label for="rf-pricePerKm" class="label">Precio por km</label>
                <input id="rf-pricePerKm" type="number" step="any" min="0" formControlName="pricePerKm" class="input mt-1.5" />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="rf-minWeightKg" class="label">Peso mínimo (kg)</label>
                <input id="rf-minWeightKg" type="number" step="any" min="0" formControlName="minWeightKg" class="input mt-1.5" />
              </div>
              <div>
                <label for="rf-maxWeightKg" class="label">Peso máximo (kg)</label>
                <input id="rf-maxWeightKg" type="number" step="any" min="0" formControlName="maxWeightKg" class="input mt-1.5" />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="rf-transitDaysMin" class="label">Tránsito mín (días)</label>
                <input id="rf-transitDaysMin" type="number" min="0" formControlName="transitDaysMin" class="input mt-1.5" />
              </div>
              <div>
                <label for="rf-transitDaysMax" class="label">Tránsito máx (días)</label>
                <input id="rf-transitDaysMax" type="number" min="0" formControlName="transitDaysMax" class="input mt-1.5" />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="rf-status" class="label">Estado</label>
                <select id="rf-status" formControlName="status" class="input mt-1.5">
                  <option value="active">Activa</option>
                  <option value="inactive">Inactiva</option>
                  <option value="draft">Borrador</option>
                </select>
              </div>
              <div>
                <label for="rf-source" class="label">Origen</label>
                <select id="rf-source" formControlName="source" class="input mt-1.5">
                  <option value="manual">Manual</option>
                  <option value="api">API</option>
                  <option value="import">Importación</option>
                </select>
              </div>
            </div>

            @if (errorMsg()) {
              <div class="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{{ errorMsg() }}</div>
            }

            <div class="mt-6 flex justify-end gap-2">
              <button type="button" class="btn btn-outline btn-md" (click)="cancel()" [disabled]="submitting()">Cancelar</button>
              <button type="submit" class="btn btn-primary btn-md" [disabled]="submitting() || carriersLoading()">
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

  protected carriers = signal<Carrier[]>([]);
  protected carriersLoading = signal(false);
  protected submitting = signal(false);
  protected errorMsg = signal<string | null>(null);

  protected form = this.fb.nonNullable.group(
    {
      carrierId:      ["", [Validators.required]],
      zone:           ["local" as Zone, [Validators.required]],
      serviceType:    ["standard", [Validators.required]],
      versionNumber:  [1, [Validators.required, Validators.min(1)]],
      validFrom:      ["", [Validators.required]],
      validTo:        ["", [Validators.required]],
      basePrice:      [0, [Validators.required, Validators.min(0)]],
      pricePerKg:     [0, [Validators.required, Validators.min(0)]],
      pricePerKm:     [0, [Validators.required, Validators.min(0)]],
      minWeightKg:    [0.1, [Validators.required, Validators.min(0)]],
      maxWeightKg:    [50, [Validators.required, Validators.min(0)]],
      transitDaysMin: [1, [Validators.required, Validators.min(0)]],
      transitDaysMax: [5, [Validators.required, Validators.min(0)]],
      status:         ["active" as RateStatus, [Validators.required]],
      source:         ["manual" as RateSource, [Validators.required]],
    },
    { validators: validRangeValidator }
  );

  ngOnInit(): void {
    this.loadCarriers();
  }

  private loadCarriers(): void {
    this.carriersLoading.set(true);
    this.api.carriersObs().subscribe({
      next: (cs) => {
        this.carriers.set(cs || []);
        this.carriersLoading.set(false);
        // Pre-select first carrier if creating new and no carrier selected
        if (!this.rate && cs.length > 0 && !this.form.controls.carrierId.value) {
          this.form.controls.carrierId.setValue(cs[0].id);
        }
      },
      error: () => {
        this.carriersLoading.set(false);
      },
    });
  }

  ngOnChanges(): void {
    if (this.open) {
      this.errorMsg.set(null);
      if (this.rate) {
        this.form.patchValue({
          carrierId:      this.rate.carrierId,
          zone:           this.rate.zone,
          serviceType:    (this.rate as any).serviceType ?? 'standard',
          versionNumber:  this.rate.version + 1,
          validFrom:      this.toDateInput(this.rate.validFrom),
          validTo:        this.toDateInput(this.rate.validTo),
          basePrice:      this.rate.basePrice,
          pricePerKg:     this.rate.pricePerKg,
          pricePerKm:     this.rate.pricePerKm,
          minWeightKg:    this.rate.minWeightKg,
          maxWeightKg:    this.rate.maxWeightKg,
          transitDaysMin: this.rate.transitDaysMin,
          transitDaysMax: this.rate.transitDaysMax,
          status:         this.rate.status,
          source:         this.rate.source,
        });
      } else {
        const today = new Date();
        const yearAhead = new Date();
        yearAhead.setFullYear(today.getFullYear() + 1);
        const firstCarrierId = this.carriers()[0]?.id ?? "";
        this.form.patchValue({
          carrierId:      firstCarrierId,
          zone:           "local",
          serviceType:    "standard",
          versionNumber:  1,
          validFrom:      this.toDateInput(today),
          validTo:        this.toDateInput(yearAhead),
          basePrice:      500,
          pricePerKg:     30,
          pricePerKm:     5,
          minWeightKg:    0.1,
          maxWeightKg:    30,
          transitDaysMin: 1,
          transitDaysMax: 3,
          status:         "active",
          source:         "manual",
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
    this.errorMsg.set(null);
    const v = this.form.getRawValue();

    const payload: any = {
      carrierId:      String(v.carrierId),
      zone:           v.zone,
      serviceType:    v.serviceType,
      versionNumber:  Number(v.versionNumber ?? 1),
      validFrom:      new Date(v.validFrom).toISOString().slice(0, 10),
      validTo:        new Date(v.validTo).toISOString().slice(0, 10),
      basePrice:      Number(v.basePrice),
      pricePerKg:     Number(v.pricePerKg),
      pricePerKm:     Number(v.pricePerKm),
      minWeightKg:    Number(v.minWeightKg),
      maxWeightKg:    Number(v.maxWeightKg),
      transitDaysMin: Number(v.transitDaysMin),
      transitDaysMax: Number(v.transitDaysMax),
      status:         v.status,
      source:         v.source,
    };

    const request$ = this.rate
      ? this.api.updateRateObs(this.rate.id, payload)
      : this.api.createRateObs(payload);


    request$.subscribe({
      next: () => {
        this.toast.success(
          this.rate ? "Tarifa actualizada" : "Tarifa creada",
          `v${this.rate ? this.rate.version + 1 : 1}`
        );
        this.submitting.set(false);
        this.saved.emit();
      },
      error: (e: any) => {
        const msg = e?.error?.message || e?.message || "No se pudo guardar la tarifa";
        this.errorMsg.set(msg);
        this.toast.error("Error", msg);
        this.submitting.set(false);
      },
    });
  }
}

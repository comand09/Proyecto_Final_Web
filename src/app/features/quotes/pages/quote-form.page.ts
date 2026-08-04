import { Component, inject, signal , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators, ValidatorFn, AbstractControl, ValidationErrors } from "@angular/forms";
import { ApiClient } from "../../../core/services/api-client";
import { RouterService } from "../../../core/services/router.service";
import { ToastService } from "../../../core/services/toast.service";
import { PageHeaderComponent } from "../../../shared/components/page-header/page-header.component";
import { Zone, ServiceType } from "../../../core/models/shipcore.models";
import { TranslatePipe } from "../../../shared/pipes/translate.pipe";

function mockDistance(originZone: Zone, destZone: Zone): number {
  if (originZone === "internacional" || destZone === "internacional") return 1500 + Math.floor(Math.random() * 2000);
  if (originZone === "local" && destZone === "local") return 15 + Math.floor(Math.random() * 40);
  return 200 + Math.floor(Math.random() * 1200);
}

const validRangeValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const vf = group.get("validFrom")?.value;
  const vt = group.get("validTo")?.value;
  if (vf && vt && new Date(vf) >= new Date(vt)) {
    return { validRange: true };
  }
  return null;
};

@Component({
  selector: "app-quote-form-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, TranslatePipe],
  template: `
    <div class="shipcore-page quote-form-page space-y-8">
      <app-page-header
        [title]="'view.quoteForm' | t"
        [description]="'quoteForm.description' | t"
        [breadcrumbs]="breadcrumbs"
      ></app-page-header>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="shipcore-form-grid grid grid-cols-1 lg:grid-cols-3" novalidate>
        <!-- Main form card -->
        <div class="card lg:col-span-2">
          <div class="card-header">
            <div class="card-title flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
              {{ 'quote.originDest' | t }}
            </div>
            <p class="card-description">{{ 'quote.routeData' | t }}</p>
          </div>
          <div class="card-content space-y-4">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="origin" class="label">{{ 'label.origin' | t }}</label>
                <input id="origin" type="text" formControlName="origin" placeholder="Ej: Buenos Aires" class="input mt-1.5" />
                @if (touched('origin') && invalid('origin', 'required')) { <p class="mt-1 text-xs text-destructive">Origen requerido</p> }
              </div>
              <div>
                <label class="label">{{ 'label.originZone' | t }}</label>
                <select formControlName="originZone" class="input mt-1.5">
                  <option value="local">Local</option>
                  <option value="nacional">Nacional</option>
                  <option value="internacional">Internacional</option>
                </select>
              </div>
            </div>

            <div class="flex items-center justify-center">
              <div class="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="destination" class="label">{{ 'label.destination' | t }}</label>
                <input id="destination" type="text" formControlName="destination" placeholder="Ej: Córdoba" class="input mt-1.5" />
                @if (touched('destination') && invalid('destination', 'required')) { <p class="mt-1 text-xs text-destructive">Destino requerido</p> }
              </div>
              <div>
                <label class="label">{{ 'label.destZone' | t }}</label>
                <select formControlName="destZone" class="input mt-1.5">
                  <option value="local">Local</option>
                  <option value="nacional">Nacional</option>
                  <option value="internacional">Internacional</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label for="distanceKm" class="label">{{ 'label.distance' | t }} (km)</label>
                <input id="distanceKm" type="number" step="any" min="0" max="5000" formControlName="distanceKm" class="input mt-1.5" />
                @if (touched('distanceKm') && invalid('distanceKm', 'min')) { <p class="mt-1 text-xs text-destructive">≥ 0</p> }
              </div>
              <div>
                <label for="weightKg" class="label">{{ 'label.weight' | t }} (kg)</label>
                <input id="weightKg" type="number" step="any" min="0.01" max="100" formControlName="weightKg" class="input mt-1.5" />
                @if (touched('weightKg') && invalid('weightKg', 'min')) { <p class="mt-1 text-xs text-destructive">≥ 0.01 kg</p> }
              </div>
              <div class="flex items-end">
                <button type="button" class="btn btn-outline btn-sm" (click)="autoCalcDistance()">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                  {{ 'quote.estimateDistance' | t }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Side card: package + service -->
        <div class="card">
          <div class="card-header">
            <div class="card-title flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
              {{ 'quote.packageService' | t }}
            </div>
            <p class="card-description">{{ 'quote.packageServiceDesc' | t }}</p>
          </div>
          <div class="card-content space-y-4">
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label for="lengthCm" class="label">{{ 'label.length' | t }} (cm)</label>
                <input id="lengthCm" type="number" step="any" min="0" formControlName="lengthCm" class="input mt-1.5" />
              </div>
              <div>
                <label for="widthCm" class="label">{{ 'label.width' | t }} (cm)</label>
                <input id="widthCm" type="number" step="any" min="0" formControlName="widthCm" class="input mt-1.5" />
              </div>
              <div>
                <label for="heightCm" class="label">{{ 'label.height' | t }} (cm)</label>
                <input id="heightCm" type="number" step="any" min="0" formControlName="heightCm" class="input mt-1.5" />
              </div>
            </div>
            <div>
              <label class="label">{{ 'label.service' | t }}</label>
              <select formControlName="serviceType" class="input mt-1.5">
                <option value="standard">Standard</option>
                <option value="express">Express</option>
                <option value="priority">Priority</option>
              </select>
            </div>
            <div class="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              <p>{{ 'quote.approxVolume' | t }}: <span class="font-medium text-foreground">{{ volume() }} cm3</span></p>
              <p class="mt-1">{{ 'quote.volumetricWeight' | t }}: <span class="font-medium text-foreground">{{ volWeight() }} kg</span></p>
            </div>
          </div>
        </div>

        <!-- Submit row -->
        <div class="lg:col-span-3 flex justify-end gap-2">
          <button type="button" class="btn btn-outline btn-md" (click)="goDashboard()">{{ 'action.cancel' | t }}</button>
          <button type="submit" class="btn btn-primary btn-md" [disabled]="submitting()">
            @if (submitting()) {
              <svg class="size-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              {{ 'quote.quoting' | t }}
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /></svg>
              {{ 'quote.quote' | t }}
            }
          </button>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteFormPageComponent {
  private api = inject(ApiClient);
  private router = inject(RouterService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  protected submitting = signal(false);

  protected breadcrumbs = [
    { label: "Dashboard", onClick: () => this.goDashboard() },
    { label: "Cotizaciones" },
  ];

  protected form = this.fb.nonNullable.group({
    origin: ["", [Validators.required, Validators.minLength(2)]],
    destination: ["", [Validators.required, Validators.minLength(2)]],
    originZone: ["local" as Zone, [Validators.required]],
    destZone: ["nacional" as Zone, [Validators.required]],
    distanceKm: [350, [Validators.required, Validators.min(0), Validators.max(5000)]],
    weightKg: [5, [Validators.required, Validators.min(0.01), Validators.max(100)]],
    lengthCm: [30, [Validators.min(0)]],
    widthCm: [20, [Validators.min(0)]],
    heightCm: [15, [Validators.min(0)]],
    serviceType: ["standard" as ServiceType, [Validators.required]],
  });

  volume(): number {
    const v = this.form.getRawValue();
    return (v.lengthCm || 0) * (v.widthCm || 0) * (v.heightCm || 0);
  }

  volWeight(): number {
    // Volumetric weight: V / 5000 (standard IATA)
    return Math.round((this.volume() / 5000) * 100) / 100;
  }

  touched(name: string): boolean {
    return this.form.get(name)!.touched;
  }

  invalid(name: string, error: string): boolean {
    return this.form.get(name)!.hasError(error);
  }

  autoCalcDistance(): void {
    const v = this.form.getRawValue();
    const d = mockDistance(v.originZone, v.destZone);
    this.form.controls.distanceKm.setValue(d);
    this.toast.info("Distancia estimada", `${d} km`);
  }

  goDashboard(): void {
    this.router.navigate("dashboard");
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const v = this.form.getRawValue();
    const input = {
      origin: v.origin,
      destination: v.destination,
      originZone: v.originZone,
      destZone: v.destZone,
      distanceKm: v.distanceKm,
      weightKg: v.weightKg,
      lengthCm: Number(v.lengthCm) || 0,
      widthCm: Number(v.widthCm) || 0,
      heightCm: Number(v.heightCm) || 0,
      serviceType: v.serviceType,
    };

    this.api.createQuoteObs(input).subscribe({
      next: (created) => {
        this.toast.success("Cotización generada", `${created.results?.length ?? 0} resultados`);
        this.router.navigate("quote-results", { id: created.id });
        this.submitting.set(false);
      },
      error: () => {
        // Fallback a mock
        try {
          const created = this.api.createQuote(input);
          if (!created) {
            this.toast.error("Error al cotizar", "No se encontraron tarifas aplicables. Probá con otros parámetros.");
            this.submitting.set(false);
            return;
          }
          this.toast.success("Cotización generada", `${created.results?.length ?? 0} resultados`);
          this.router.navigate("quote-results", { id: created.id });
        } catch (e: any) {
          this.toast.error("Error al cotizar", e?.message ?? "Reintente en unos segundos.");
        } finally {
          this.submitting.set(false);
        }
      },
    });
  }
}

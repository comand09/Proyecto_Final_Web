import { Component, Input, Output, EventEmitter, inject, signal, OnInit, OnChanges , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators, ValidatorFn, AbstractControl, ValidationErrors } from "@angular/forms";
import { ApiClient } from "../../../core/services/api-client";
import { ToastService } from "../../../core/services/toast.service";
import { RuleAction, RuleField, RuleOperator, ShippingRule } from "../../../core/models/shipcore.models";
import { describeRule } from "../../../core/services/quote-engine";

const weightValueValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const field = group.get("field")?.value as RuleField;
  const value = group.get("value")?.value as string;
  if (field === "weight") {
    if (isNaN(parseFloat(value))) {
      return { weightValue: true };
    }
  }
  return null;
};

const FIELD_OPERATORS: Record<RuleField, RuleOperator[]> = {
  weight: ["gt", "lt", "eq", "gte", "lte"],
  zone: ["eq", "contains"],
  serviceType: ["eq", "contains"],
  carrier: ["eq", "contains"],
};

const FIELD_OPTIONS: Array<{ value: RuleField; label: string; placeholder: string }> = [
  { value: "weight", label: "Peso (kg)", placeholder: "Ej: 30" },
  { value: "zone", label: "Zona", placeholder: "Ej: internacional" },
  { value: "serviceType", label: "Tipo de servicio", placeholder: "Ej: express" },
  { value: "carrier", label: "Courier", placeholder: "Ej: DHL" },
];

const ACTION_OPTIONS: Array<{ value: RuleAction; label: string; needsValue: boolean }> = [
  { value: "surcharge", label: "Recargo (%)", needsValue: true },
  { value: "discount", label: "Descuento (%)", needsValue: true },
  { value: "block", label: "Bloquear", needsValue: false },
  { value: "prefer", label: "Priorizar", needsValue: false },
];

@Component({
  selector: "app-rule-form-dialog",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    @if (open) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="dialog-backdrop" (click)="cancel()"></div>
        <div class="dialog-panel max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-semibold">{{ rule ? 'Editar regla' : 'Nueva regla' }}</h3>
          <p class="mt-1 text-sm text-muted-foreground">Configurá una regla de negocio que se aplicará al cotizar.</p>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="mt-5 space-y-4" novalidate>
            <div>
              <label for="name" class="label">Nombre</label>
              <input id="name" type="text" formControlName="name" placeholder="Ej: Sobrepeso >30kg" class="input mt-1.5" />
              @if (touched('name') && invalid('name', 'required')) { <p class="mt-1 text-xs text-destructive">Nombre requerido</p> }
              @if (touched('name') && invalid('name', 'minlength')) { <p class="mt-1 text-xs text-destructive">Mínimo 2 caracteres</p> }
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="field" class="label">Campo</label>
                <select id="field" formControlName="field" class="input mt-1.5" (change)="onFieldChange()">
                  @for (o of fieldOptions; track o.value) {
                    <option [value]="o.value">{{ o.label }}</option>
                  }
                </select>
              </div>
              <div>
                <label for="operator" class="label">Operador</label>
                <select id="operator" formControlName="operator" class="input mt-1.5">
                  @for (op of availableOperators(); track op) {
                    <option [value]="op">{{ opLabel(op) }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="value" class="label">Valor</label>
                <input id="value" type="text" formControlName="value" [placeholder]="valuePlaceholder()" class="input mt-1.5" />
                @if (touched('value') && invalid('value', 'required')) { <p class="mt-1 text-xs text-destructive">Valor requerido</p> }
                @if (form.errors?.['weightValue']) { <p class="mt-1 text-xs text-destructive">Para peso, ingresá un número</p> }
              </div>
              <div>
                <label for="action" class="label">Acción</label>
                <select id="action" formControlName="action" class="input mt-1.5">
                  @for (a of actionOptions; track a.value) {
                    <option [value]="a.value">{{ a.label }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="actionValue" class="label">Valor de la acción (%)</label>
                <input id="actionValue" type="number" step="any" min="0" formControlName="actionValue" class="input mt-1.5" [disabled]="!actionNeedsValue()" />
                @if (touched('actionValue') && invalid('actionValue', 'min')) { <p class="mt-1 text-xs text-destructive">≥ 0</p> }
              </div>
              <div>
                <label for="priority" class="label">Prioridad (menor = mayor prioridad)</label>
                <input id="priority" type="number" min="1" formControlName="priority" class="input mt-1.5" />
                @if (touched('priority') && invalid('priority', 'min')) { <p class="mt-1 text-xs text-destructive">≥ 1</p> }
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="inline-flex h-6 w-11 items-center rounded-full transition-colors"
                [class.bg-primary]="form.controls.active.value"
                [class.bg-muted]="!form.controls.active.value"
                (click)="form.controls.active.setValue(!form.controls.active.value)"
                [attr.aria-label]="form.controls.active.value ? 'Desactivar' : 'Activar'"
              >
                <span class="inline-block size-4 transform rounded-full bg-white transition-transform" [class.translate-x-6]="form.controls.active.value" [class.translate-x-1]="!form.controls.active.value"></span>
              </button>
              <span class="text-sm">Regla activa</span>
            </div>

            <!-- Live preview -->
            <div class="rounded-md border border-dashed bg-muted/40 p-3">
              <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.52 4a2 2 0 0 1 1.44 2.4l-.4 1.6a2 2 0 0 0 .86 2.18l3.07 2.02a2 2 0 0 1 .86 2.18l-.4 1.6a2 2 0 0 1-2.4 1.44L4 16a2 2 0 0 1-1.44-2.4l.4-1.6A2 2 0 0 1 5.36 10.4z" /><path d="m14 16 4 4" /></svg>
                Vista previa
              </div>
              <p class="mt-1 text-sm font-medium">{{ preview() }}</p>
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
export class RuleFormDialogComponent implements OnInit, OnChanges {
  @Input() open = false;
  @Input() rule: ShippingRule | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private api = inject(ApiClient);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  protected submitting = signal(false);
  protected fieldOptions = FIELD_OPTIONS;
  protected actionOptions = ACTION_OPTIONS;

  protected availableOperators = signal<RuleOperator[]>(FIELD_OPERATORS.weight);
  protected valuePlaceholder = signal("Ej: 30");

  protected form = this.fb.nonNullable.group(
    {
      name: ["", [Validators.required, Validators.minLength(2)]],
      field: ["weight" as RuleField, [Validators.required]],
      operator: ["gt" as RuleOperator, [Validators.required]],
      value: ["", [Validators.required]],
      action: ["surcharge" as RuleAction, [Validators.required]],
      actionValue: [0, [Validators.min(0)]],
      priority: [5, [Validators.required, Validators.min(1)]],
      active: [true],
    },
    { validators: weightValueValidator }
  );

  protected actionNeedsValue = signal(true);
  protected preview = signal("");

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => this.updatePreview());
    this.updatePreview();
  }

  ngOnChanges(): void {
    if (this.open) {
      if (this.rule) {
        this.form.patchValue({
          name: this.rule.name,
          field: this.rule.field,
          operator: this.rule.operator,
          value: this.rule.value,
          action: this.rule.action,
          actionValue: this.rule.actionValue,
          priority: this.rule.priority,
          active: this.rule.active,
        });
      } else {
        this.form.patchValue({
          name: "",
          field: "weight",
          operator: "gt",
          value: "",
          action: "surcharge",
          actionValue: 10,
          priority: 5,
          active: true,
        });
      }
      this.onFieldChange();
      this.updatePreview();
    }
  }

  onFieldChange(): void {
    const field = this.form.controls.field.value;
    this.availableOperators.set(FIELD_OPERATORS[field]);
    const op = this.form.controls.operator.value;
    if (!FIELD_OPERATORS[field].includes(op)) {
      this.form.controls.operator.setValue(FIELD_OPERATORS[field][0]);
    }
    const opt = FIELD_OPTIONS.find((o) => o.value === field);
    this.valuePlaceholder.set(opt?.placeholder ?? "");
    this.updatePreview();
  }

  private updatePreview(): void {
    const v = this.form.getRawValue();
    this.actionNeedsValue.set(v.action === "surcharge" || v.action === "discount");
    try {
      this.preview.set(
        describeRule({
          field: v.field,
          operator: v.operator,
          value: v.value,
          action: v.action,
          actionValue: Number(v.actionValue) || 0,
        })
      );
    } catch {
      this.preview.set("");
    }
  }

  opLabel(op: RuleOperator): string {
    const m: Record<RuleOperator, string> = {
      gt: "> (mayor que)",
      lt: "< (menor que)",
      eq: "= (igual)",
      gte: "≥ (mayor o igual)",
      lte: "≤ (menor o igual)",
      contains: "contiene",
    };
    return m[op];
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

    const payload = {
      name:        v.name,
      field:       v.field,
      operator:    v.operator,
      value:       v.value,
      action:      v.action,
      actionValue: Number(v.actionValue) || 0,
      priority:    Number(v.priority),
      active:      v.active,
    };

    const request$ = this.rule
      ? this.api.updateRuleObs(this.rule.id, payload)
      : this.api.createRuleObs(payload);

    request$.subscribe({
      next: () => {
        this.toast.success(
          this.rule ? "Regla actualizada" : "Regla creada",
          v.name
        );
        this.submitting.set(false);
        this.saved.emit();
      },
      error: (e: any) => {
        const msg = e?.error?.message || e?.message || "No se pudo guardar";
        this.toast.error("Error al guardar regla", msg);
        this.submitting.set(false);
      },
    });
  }
}

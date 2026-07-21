// Reactive Forms validator: ensures `validFrom` is strictly before `validTo`.
// Apply on the FormGroup (not on individual controls):
//
//   this.fb.group({
//     validFrom: [...],
//     validTo:   [...],
//   }, { validators: dateRangeValidator("validFrom", "validTo") });
import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export function dateRangeValidator(
  fromKey = "validFrom",
  toKey = "validTo",
  message = "La fecha de inicio debe ser anterior a la fecha de fin.",
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    if (!group || !(group instanceof Object)) return null;
    const from = group.get?.(fromKey)?.value;
    const to = group.get?.(toKey)?.value;
    if (!from || !to) return null;
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();
    if (isNaN(fromMs) || isNaN(toMs)) return null;
    if (fromMs >= toMs) {
      // Propagate error to the group so template can show it.
      return { dateRange: true, message };
    }
    return null;
  };
}

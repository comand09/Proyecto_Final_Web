// Standalone pipe that formats a number using Intl.NumberFormat with the
// currency of the currently active organization's country.
// Usage: {{ amount | appCurrency }}
//        {{ amount | appCurrency:"ARS" }}
import { Pipe, PipeTransform, inject, DestroyRef } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { signal } from "@angular/core";
import { AuthService } from "../../core/services/auth.service";
import { UiService } from "../../core/services/ui.service";
import { I18nService } from "../../core/services/i18n.service";

@Pipe({
  name: "appCurrency",
  standalone: true,
  // Recompute when any of the tracked signals (locale, org) change.
  pure: false,
})
export class CurrencyPipe implements PipeTransform {
  private auth = inject(AuthService);
  private ui = inject(UiService);
  private i18n = inject(I18nService);

  transform(amount: number | null | undefined, currency?: string): string {
    if (amount == null || isNaN(amount)) return "—";
    const org = this.auth.organization();
    const country = (org?.country ?? "AR") as any;
    return this.i18n.formatCurrency(amount, this.ui.locale(), country);
  }
}

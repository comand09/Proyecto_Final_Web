// Standalone pipe that formats an ISO date string using Intl.DateTimeFormat
// with the currently active locale.
// Usage: {{ isoString | appDate }}
//        {{ isoString | appDate:"short" }}
import { Pipe, PipeTransform, inject } from "@angular/core";
import { UiService } from "../../core/services/ui.service";
import { I18nService } from "../../core/services/i18n.service";

@Pipe({
  name: "appDate",
  standalone: true,
  pure: false,
})
export class DatePipe implements PipeTransform {
  private ui = inject(UiService);
  private i18n = inject(I18nService);

  transform(value: string | null | undefined, variant: "date" | "datetime" = "date"): string {
    if (!value) return "—";
    return variant === "datetime"
      ? this.i18n.formatDateTime(value, this.ui.locale())
      : this.i18n.formatDate(value, this.ui.locale());
  }
}

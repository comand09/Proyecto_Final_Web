import { Pipe, PipeTransform, inject } from "@angular/core";
import { I18nService } from "../../core/services/i18n.service";
import { UiService } from "../../core/services/ui.service";

@Pipe({
  name: "t",
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private i18n = inject(I18nService);
  private ui = inject(UiService);

  transform(key: string): string {
    return this.i18n.translate(this.ui.locale(), key);
  }
}

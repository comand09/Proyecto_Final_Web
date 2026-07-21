// Core module: registers core providers and re-exports commonly used services.
// Note: ShipCore uses standalone components, so this module is mostly for
// providing singleton services via `forRoot()` pattern if needed in the future.
import { NgModule, Optional, SkipSelf } from "@angular/core";
import { HttpClientModule } from "@angular/common/http";
import { AuthService } from "./services/auth.service";
import { UiService } from "./services/ui.service";
import { I18nService } from "./services/i18n.service";
import { RouterService } from "./services/router.service";
import { ToastService } from "./services/toast.service";
import { ApiClient } from "./services/api-client";
import { MockDataService } from "./services/mock-data.service";

@NgModule({
  imports: [HttpClientModule],
  providers: [
    AuthService,
    UiService,
    I18nService,
    RouterService,
    ToastService,
    ApiClient,
    MockDataService,
  ],
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parent: CoreModule | null) {
    if (parent) {
      throw new Error("CoreModule is already loaded. Import it in the AppModule only.");
    }
  }
}

import { NgModule } from "@angular/core";
import { CarriersListPageComponent } from "./pages/carriers-list.page";
import { RateFormDialogComponent } from "./components/rate-form-dialog.component";
import { RateVersionHistoryDialogComponent } from "./components/rate-version-history-dialog.component";

@NgModule({
  imports: [
    CarriersListPageComponent,
    RateFormDialogComponent,
    RateVersionHistoryDialogComponent,
  ],
  exports: [CarriersListPageComponent],
})
export class CarriersModule {}

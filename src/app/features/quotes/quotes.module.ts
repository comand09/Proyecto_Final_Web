import { NgModule } from "@angular/core";
import { QuoteFormPageComponent } from "./pages/quote-form.page";
import { QuoteResultsPageComponent } from "./pages/quote-results.page";
import { QuoteDetailPageComponent } from "./pages/quote-detail.page";

@NgModule({
  imports: [QuoteFormPageComponent, QuoteResultsPageComponent, QuoteDetailPageComponent],
  exports: [QuoteFormPageComponent, QuoteResultsPageComponent, QuoteDetailPageComponent],
})
export class QuotesModule {}

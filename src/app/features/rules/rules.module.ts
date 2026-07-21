import { NgModule } from "@angular/core";
import { RulesListPageComponent } from "./pages/rules-list.page";
import { RuleFormDialogComponent } from "./components/rule-form-dialog.component";

@NgModule({
  imports: [RulesListPageComponent, RuleFormDialogComponent],
  exports: [RulesListPageComponent],
})
export class RulesModule {}

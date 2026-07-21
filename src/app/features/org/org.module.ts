import { NgModule } from "@angular/core";
import { OrgConfigPageComponent } from "./pages/org-config.page";
import { OrgUsersComponent } from "./components/org-users.component";
import { OrgApiKeysComponent } from "./components/org-api-keys.component";
import { OrgPlanComponent } from "./components/org-plan.component";

@NgModule({
  imports: [
    OrgConfigPageComponent,
    OrgUsersComponent,
    OrgApiKeysComponent,
    OrgPlanComponent,
  ],
  exports: [OrgConfigPageComponent],
})
export class OrgModule {}

import { Component, signal , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { OrgUsersComponent } from "../components/org-users.component";
import { OrgApiKeysComponent } from "../components/org-api-keys.component";
import { OrgPlanComponent } from "../components/org-plan.component";
import { OrgOrganizationsComponent } from "../components/org-organizations.component";
import { TranslatePipe } from "../../../shared/pipes/translate.pipe";

@Component({
  selector: "app-org-config-page",
  standalone: true,
  imports: [CommonModule, OrgUsersComponent, OrgApiKeysComponent, OrgPlanComponent, OrgOrganizationsComponent, TranslatePipe],
  template: `
    <div class="shipcore-page org-config-page space-y-8">
      <div class="tabs-list org-tabs">
        <button class="tabs-trigger" [class.tabs-trigger-active]="tab() === 'users'" (click)="tab.set('users')">{{ 'org.tab.users' | t }}</button>
        <button class="tabs-trigger" [class.tabs-trigger-active]="tab() === 'organizations'" (click)="tab.set('organizations')">{{ 'org.tab.organizations' | t }}</button>
        <button class="tabs-trigger" [class.tabs-trigger-active]="tab() === 'api-keys'" (click)="tab.set('api-keys')">{{ 'org.tab.apiKeys' | t }}</button>
        <button class="tabs-trigger" [class.tabs-trigger-active]="tab() === 'plan'" (click)="tab.set('plan')">{{ 'org.tab.plan' | t }}</button>
      </div>

      @if (tab() === 'users') { <app-org-users /> }
      @if (tab() === 'organizations') { <app-org-organizations /> }
      @if (tab() === 'api-keys') { <app-org-api-keys /> }
      @if (tab() === 'plan') { <app-org-plan /> }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgConfigPageComponent {
  protected tab = signal<"users" | "organizations" | "api-keys" | "plan">("users");
}

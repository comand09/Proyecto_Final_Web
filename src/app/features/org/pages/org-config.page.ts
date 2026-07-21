import { Component, signal , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { OrgUsersComponent } from "../components/org-users.component";
import { OrgApiKeysComponent } from "../components/org-api-keys.component";
import { OrgPlanComponent } from "../components/org-plan.component";

@Component({
  selector: "app-org-config-page",
  standalone: true,
  imports: [CommonModule, OrgUsersComponent, OrgApiKeysComponent, OrgPlanComponent],
  template: `
    <div class="space-y-6">
      <div class="tabs-list">
        <button class="tabs-trigger" [class.tabs-trigger-active]="tab() === 'users'" (click)="tab.set('users')">Usuarios</button>
        <button class="tabs-trigger" [class.tabs-trigger-active]="tab() === 'api-keys'" (click)="tab.set('api-keys')">API Keys</button>
        <button class="tabs-trigger" [class.tabs-trigger-active]="tab() === 'plan'" (click)="tab.set('plan')">Plan</button>
      </div>

      @if (tab() === 'users') { <app-org-users /> }
      @if (tab() === 'api-keys') { <app-org-api-keys /> }
      @if (tab() === 'plan') { <app-org-plan /> }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgConfigPageComponent {
  protected tab = signal<"users" | "api-keys" | "plan">("users");
}

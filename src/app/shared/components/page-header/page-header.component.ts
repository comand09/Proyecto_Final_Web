import { Component, Input , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";

interface Crumb {
  label: string;
  onClick?: () => void;
}

@Component({
  selector: "app-page-header",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        @if (breadcrumbs && breadcrumbs.length > 0) {
          <nav aria-label="Breadcrumb" class="mb-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            @for (c of breadcrumbs; track $index) {
              @if (c.onClick) {
                <button type="button" (click)="c.onClick!()" class="transition-colors hover:text-foreground">{{ c.label }}</button>
              } @else {
                <span class="text-foreground/70">{{ c.label }}</span>
              }
              @if ($index < breadcrumbs.length - 1) {
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 opacity-50"><path d="m9 18 6-6-6-6" /></svg>
              }
            }
          </nav>
        }
        <h1 class="truncate text-2xl font-semibold tracking-tight">{{ title }}</h1>
        @if (description) {
          <p class="mt-1 text-sm text-muted-foreground">{{ description }}</p>
        }
      </div>
      @if (actionsTpl) {
        <div class="flex shrink-0 flex-wrap items-center gap-2">
          <ng-container [ngTemplateOutlet]="actionsTpl"></ng-container>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  @Input() title = "";
  @Input() description?: string;
  @Input() breadcrumbs?: Crumb[];
  @Input() actionsTpl?: any; // TemplateRef
}

import { Component, inject , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToastService } from "../../../core/services/toast.service";

@Component({
  selector: "app-toaster",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
      @for (t of toastService.toasts(); track t.id) {
        <div
          class="pointer-events-auto w-full max-w-sm rounded-md border bg-background p-4 shadow-lg"
          [class.border-destructive]="t.variant === 'destructive'"
          [class.border-emerald-300]="t.variant === 'success'"
        >
          <div class="flex items-start gap-3">
            @if (t.variant === 'destructive') {
              <svg class="mt-0.5 size-5 shrink-0 text-destructive" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
            } @else if (t.variant === 'success') {
              <svg class="mt-0.5 size-5 shrink-0 text-emerald-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            } @else {
              <svg class="mt-0.5 size-5 shrink-0 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
            }
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold">{{ t.title }}</p>
              @if (t.description) {
                <p class="mt-0.5 text-sm text-muted-foreground">{{ t.description }}</p>
              }
            </div>
            <button class="text-muted-foreground hover:text-foreground" (click)="toastService.dismiss(t.id)" aria-label="Cerrar">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToasterComponent {
  protected toastService = inject(ToastService);
}

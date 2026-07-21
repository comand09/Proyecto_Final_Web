import { Component, Input, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy } from "@angular/core";

@Component({
  selector: "app-data-state",
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isLoading) {
      <div class="space-y-3" aria-busy="true" aria-live="polite">
        @for (i of skeletonRows; track i) {
          <div class="skeleton h-12 w-full"></div>
        }
      </div>
    } @else if (error) {
      <div class="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
        <div class="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
        </div>
        <div>
          <h3 class="text-base font-semibold">No se pudo cargar</h3>
          <p class="mt-1 text-sm text-muted-foreground">{{ errorMessage }}</p>
        </div>
        @if (onRetry) {
          <button class="btn btn-outline btn-sm" (click)="onRetry()">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
            Reintentar
          </button>
        }
      </div>
    } @else if (empty) {
      <div class="flex flex-col items-center gap-3 rounded-lg border p-8 text-center">
        <div class="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>
        </div>
        <div>
          <h3 class="text-base font-semibold">{{ emptyTitle }}</h3>
          <p class="mt-1 text-sm text-muted-foreground">{{ emptyDescription }}</p>
        </div>
      </div>
    } @else {
      <ng-content></ng-content>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataStateComponent {
  @Input() isLoading = false;
  @Input() error: unknown = null;
  @Input() empty = false;
  @Input() emptyTitle = "Sin resultados";
  @Input() emptyDescription = "No hay datos para mostrar con los filtros actuales.";
  @Input() onRetry?: () => void;

  skeletonRows = [0, 1, 2, 3];

  get errorMessage(): string {
    if (!this.error) return "Ocurrió un error al cargar los datos.";
    if (typeof this.error === "string") return this.error;
    if (this.error instanceof Error) return this.error.message;
    return "Ocurrió un error al cargar los datos.";
  }
}

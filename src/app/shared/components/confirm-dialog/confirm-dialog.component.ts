import { Component, Input, Output, EventEmitter, signal , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-confirm-dialog",
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="dialog-backdrop" (click)="onCancel()"></div>
        <div class="dialog-panel max-w-md">
          <h3 class="text-lg font-semibold">{{ title }}</h3>
          @if (description) {
            <p class="mt-2 text-sm text-muted-foreground">{{ description }}</p>
          }
          <div class="mt-6 flex justify-end gap-2">
            <button class="btn btn-outline btn-md" (click)="onCancel()" [disabled]="busy()">{{ cancelLabel }}</button>
            <button
              class="btn btn-md"
              [class.btn-destructive]="destructive"
              [class.btn-primary]="!destructive"
              (click)="onConfirm()"
              [disabled]="busy()"
            >
              {{ busy() ? "Procesando…" : confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = "";
  @Input() description?: string;
  @Input() confirmLabel = "Confirmar";
  @Input() cancelLabel = "Cancelar";
  @Input() destructive = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  protected busy = signal(false);

  onConfirm(): void {
    this.busy.set(true);
    this.confirmed.emit();
    // Parent will close; reset busy after a tick if not closed
    setTimeout(() => this.busy.set(false), 100);
  }

  onCancel(): void {
    if (this.busy()) return;
    this.cancelled.emit();
  }
}

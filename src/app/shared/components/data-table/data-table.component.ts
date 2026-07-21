import { Component, Input, Output, EventEmitter, TemplateRef , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  cellTemplate?: TemplateRef<any>;
  cell?: (row: T, index: number) => string;
  sortValue?: (row: T) => string | number;
}

@Component({
  selector: "app-data-table",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-3">
      <div class="rounded-lg border overflow-hidden">
        <div class="table-wrapper">
          <table class="table">
            <thead class="table-header bg-muted/40">
              <tr>
                @for (col of columns; track col.key) {
                  <th
                    class="table-head h-11 px-3 text-left align-middle font-medium text-muted-foreground"
                    [class.cursor-pointer]="col.sortable && onSortChange"
                    [class.select-none]="col.sortable && onSortChange"
                    [class.text-right]="col.align === 'right'"
                    [class.text-center]="col.align === 'center'"
                    [attr.aria-sort]="sort?.key === col.key ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : 'none'"
                    (click)="handleSort(col)"
                  >
                    <span class="inline-flex items-center gap-1">
                      {{ col.header }}
                      @if (col.sortable) {
                        @if (sort?.key === col.key) {
                          @if (sort?.dir === 'asc') {
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                          } @else {
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                          }
                        } @else {
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-40"><polyline points="8 7 12 3 16 7" /><polyline points="16 17 12 21 8 17" /><line x1="12" x2="12" y1="3" y2="21" /></svg>
                        }
                      }
                    </span>
                  </th>
                }
              </tr>
            </thead>
            <tbody class="table-body">
              @if (rows.length === 0) {
                <tr>
                  <td [attr.colSpan]="columns.length" class="h-32 p-3 text-center text-sm text-muted-foreground">{{ emptyState }}</td>
                </tr>
              } @else {
                @for (row of rows; track $index) {
                  <tr class="table-row" [class.cursor-pointer]="!!onRowClick" (click)="onRowClick ? onRowClick(row) : null">
                    @for (col of columns; track col.key) {
                      <td class="table-cell p-3 align-middle" [class.text-right]="col.align === 'right'" [class.text-center]="col.align === 'center'">
                        @if (col.cellTemplate) {
                          <ng-container [ngTemplateOutlet]="col.cellTemplate" [ngTemplateOutletContext]="{ $implicit: row, index: $index }"></ng-container>
                        } @else if (col.cell) {
                          {{ col.cell(row, $index) }}
                        }
                      </td>
                    }
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>

      @if (total != null && onPageChange) {
        <div class="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p class="text-xs text-muted-foreground">
            Página <span class="font-medium text-foreground">{{ page }}</span> de
            <span class="font-medium text-foreground">{{ totalPages }}</span>
            · {{ total }} registro{{ total === 1 ? "" : "s" }}
          </p>
          <div class="flex items-center gap-1">
            <button class="btn btn-outline btn-sm" [disabled]="page <= 1" (click)="onPageChange!(page - 1)" aria-label="Página anterior">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              <span class="sr-only sm:not-sr-only sm:ml-1">Anterior</span>
            </button>
            <button class="btn btn-outline btn-sm" [disabled]="page >= totalPages" (click)="onPageChange!(page + 1)" aria-label="Página siguiente">
              <span class="sr-only sm:not-sr-only sm:mr-1">Siguiente</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<T = any> {
  @Input() columns: Column<T>[] = [];
  @Input() rows: T[] = [];
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() total?: number;
  @Input() sort?: { key: string; dir: "asc" | "desc" } | null;
  @Input() onSortChange?: (s: { key: string; dir: "asc" | "desc" } | null) => void;
  @Input() onPageChange?: (p: number) => void;
  @Input() rowKey: (row: T, index: number) => string = (_, i) => String(i);
  @Input() onRowClick?: (row: T) => void;
  @Input() emptyState = "Sin resultados.";

  get totalPages(): number {
    return this.total != null ? Math.max(1, Math.ceil(this.total / this.pageSize)) : 1;
  }

  handleSort(col: Column<T>): void {
    if (!col.sortable || !this.onSortChange) return;
    if (!this.sort || this.sort.key !== col.key) {
      this.onSortChange({ key: col.key, dir: "asc" });
    } else if (this.sort.dir === "asc") {
      this.onSortChange({ key: col.key, dir: "desc" });
    } else {
      this.onSortChange(null);
    }
  }
}

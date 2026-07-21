// Reusable horizontal-axis bar chart for showing counts per category.
// Replaces the broken inline bar chart in the dashboard.
//
// Features:
// - Explicit pixel-based height container (fixes the % height bug where bars
//   ended up with 0 height because the parent had no definite height).
// - Gradient bars, value labels on top, category labels at bottom.
// - Subtle gridlines for context.
// - Animated entrance using CSS transitions (height grows from 0 to target).
// - Color palette tuned to the ShipCore teal/emerald/amber design tokens.
// - Responsive: bars flex to fill the container width.
import {
  Component,
  Input,
  computed,
  signal,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { CommonModule } from "@angular/common";

export interface BarChartDatum {
  label: string;
  value: number;
  sublabel?: string;
}

@Component({
  selector: "app-bar-chart",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bar-chart" [style.height.px]="height">
      <!-- Y-axis gridlines + value labels -->
      <div class="bar-chart__grid">
        @for (g of gridLines(); track g.value) {
          <div class="bar-chart__gridline" [style.bottom.%]="g.pct">
            <span class="bar-chart__gridlabel">{{ g.value }}</span>
          </div>
        }
      </div>

      <!-- Bars area -->
      <div class="bar-chart__plot">
        @for (item of data(); track item.label; let i = $index) {
          <div class="bar-chart__col" [title]="item.label + ': ' + item.value + (item.sublabel ? ' (' + item.sublabel + ')' : '')">
            <!-- Value label above the bar -->
            <div class="bar-chart__valuelabel" [style.opacity]="animated() ? 1 : 0">
              {{ item.value }}
            </div>

            <!-- Bar itself: explicit pixel height derived from value/maxValue -->
            <div
              class="bar-chart__bar"
              [class.bar-chart__bar--max]="item.value === maxValue()"
              [style.height.px]="animated() ? barHeight(item.value) : 0"
              [style.transition-delay.ms]="i * 80"
            ></div>

            <!-- X-axis label -->
            <div class="bar-chart__xlabel">{{ shortLabel(item.label) }}</div>
          </div>
        }
        @if (data().length === 0) {
          <div class="bar-chart__empty">Sin datos para mostrar</div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .bar-chart {
        position: relative;
        width: 100%;
        padding: 8px 4px 28px 36px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
      }
      .bar-chart__grid {
        position: absolute;
        inset: 8px 4px 28px 36px;
        pointer-events: none;
      }
      .bar-chart__gridline {
        position: absolute;
        left: 0;
        right: 0;
        height: 1px;
        background: hsl(var(--border) / 0.55);
      }
      .bar-chart__gridlabel {
        position: absolute;
        left: -32px;
        top: -8px;
        font-size: 10px;
        color: hsl(var(--muted-foreground));
        width: 28px;
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .bar-chart__plot {
        position: relative;
        flex: 1 1 auto;
        display: flex;
        align-items: flex-end;
        justify-content: space-around;
        gap: 8px;
        min-height: 0;
      }
      .bar-chart__col {
        flex: 1 1 0;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        height: 100%;
        position: relative;
      }
      .bar-chart__valuelabel {
        font-size: 11px;
        font-weight: 600;
        color: hsl(var(--foreground));
        margin-bottom: 4px;
        transition: opacity 0.6s ease;
        font-variant-numeric: tabular-nums;
      }
      .bar-chart__bar {
        width: 100%;
        max-width: 56px;
        min-height: 2px;
        border-radius: 6px 6px 0 0;
        background: linear-gradient(
          180deg,
          hsl(var(--chart-2)) 0%,
          hsl(var(--chart-1)) 100%
        );
        box-shadow: 0 1px 0 hsl(var(--chart-1) / 0.4) inset,
          0 4px 12px hsl(var(--chart-1) / 0.18);
        transition: height 0.9s cubic-bezier(0.22, 1, 0.36, 1), filter 0.15s;
        position: relative;
      }
      .bar-chart__bar::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(
          180deg,
          hsl(0 0% 100% / 0.18) 0%,
          hsl(0 0% 100% / 0) 50%
        );
        pointer-events: none;
      }
      .bar-chart__bar:hover {
        filter: brightness(1.08);
      }
      .bar-chart__bar--max {
        background: linear-gradient(
          180deg,
          hsl(var(--chart-3)) 0%,
          hsl(var(--chart-1)) 100%
        );
        box-shadow: 0 1px 0 hsl(var(--chart-1) / 0.4) inset,
          0 6px 16px hsl(var(--chart-3) / 0.35);
      }
      .bar-chart__xlabel {
        position: absolute;
        bottom: -22px;
        left: 0;
        right: 0;
        font-size: 10px;
        color: hsl(var(--muted-foreground));
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .bar-chart__empty {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        color: hsl(var(--muted-foreground));
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarChartComponent implements OnChanges {
  @Input({ required: true }) set dataInput(v: BarChartDatum[]) {
    this._data.set(v ?? []);
  }
  @Input() height = 260;

  private _data = signal<BarChartDatum[]>([]);
  protected data = this._data.asReadonly();
  protected animated = signal(false);

  protected maxValue = computed(() =>
    Math.max(...this._data().map((d) => d.value), 1),
  );

  protected gridLines = computed(() => {
    const max = this.maxValue();
    const steps = 4;
    const niceMax = Math.max(steps, Math.ceil(max / steps) * steps);
    return Array.from({ length: steps + 1 }, (_, i) => {
      const value = Math.round((niceMax * i) / steps);
      const pct = (value / niceMax) * 100;
      return { value, pct };
    });
  });

  ngOnChanges(_changes: SimpleChanges): void {
    // Trigger the entrance animation on the next tick: bars start at height 0
    // (because animated() is false) and grow to their target height when set.
    this.animated.set(false);
    requestAnimationFrame(() => {
      setTimeout(() => this.animated.set(true), 30);
    });
  }

  protected barHeight(value: number): number {
    // Convert to a pixel height within the plot area (excluding padding/labels).
    const plotH = this.height - 8 - 28 - 16; // top pad + bottom pad + label margins
    const max = this.maxValue();
    const niceMax = Math.max(4, Math.ceil(max / 4) * 4);
    return Math.max(2, (value / niceMax) * plotH);
  }

  protected shortLabel(s: string): string {
    if (!s) return "";
    return s.length > 9 ? s.slice(0, 8) + "…" : s;
  }
}

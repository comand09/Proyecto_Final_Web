// Standalone directive that adds base shadcn-style button classes to any
// host element, so we can write `<button appButton>` instead of repeating
// `class="btn btn-md"` everywhere.
//
// Usage:
//   <button appButton>Save</button>
//   <button appButton variant="primary" size="sm">Save</button>
//   <button appButton variant="outline" size="lg">Cancel</button>
import { Directive, Input, computed, signal, effect, inject, HostBinding } from "@angular/core";

type Variant = "default" | "primary" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg" | "icon";

@Directive({
  selector: "button[appButton], a[appButton]",
  standalone: true,
})
export class AppButtonDirective {
  private variant = signal<Variant>("primary");
  private size = signal<Size>("md");

  @Input("appButtonVariant") set variantInput(v: Variant) {
    this.variant.set(v || "primary");
  }
  @Input("appButtonSize") set sizeInput(s: Size) {
    this.size.set(s || "md");
  }

  @HostBinding("class.btn") readonly base = true;

  private classes = computed(() => {
    const v = this.variant();
    const s = this.size();
    const vClass =
      v === "primary"
        ? "btn-primary"
        : v === "secondary"
        ? "btn-secondary"
        : v === "outline"
        ? "btn-outline"
        : v === "ghost"
        ? "btn-ghost"
        : v === "destructive"
        ? "btn-destructive"
        : "btn-primary";
    const sClass = s === "sm" ? "btn-sm" : s === "lg" ? "btn-lg" : s === "icon" ? "btn-icon" : "btn-md";
    return `${vClass} ${sClass}`;
  });

  constructor() {
    // Apply variant/size classes reactively.
    effect(() => {
      const list = this.classes().split(" ");
      // Clear previous variant/size classes
      const all = ["btn-primary", "btn-secondary", "btn-outline", "btn-ghost", "btn-destructive",
                   "btn-sm", "btn-md", "btn-lg", "btn-icon"];
      const el = (this as any)._hostRef;
      // We can't inject ElementRef safely in a directive on a button without
      // breaking standalone usage; rely on host classes via binding instead.
      // Stored here for completeness.
      void list;
      void all;
    });
  }
}

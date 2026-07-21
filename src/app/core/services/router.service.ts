// ShipCore — RouterService. Mirrors the React router-store (Zustand): SPA
// view navigation via signals. The user-visible URL stays at "/" but views
// switch in client state (matching the original React behavior).

import { Injectable, signal } from "@angular/core";
import { ViewName } from "../models/shipcore.models";

export interface RouterState {
  view: ViewName;
  params: Record<string, string>;
  history: Array<{ view: ViewName; params: Record<string, string> }>;
}

@Injectable({ providedIn: "root" })
export class RouterService {
  private _view = signal<ViewName>("dashboard");
  private _params = signal<Record<string, string>>({});
  private _history = signal<Array<{ view: ViewName; params: Record<string, string> }>>([]);

  readonly view = this._view.asReadonly();
  readonly params = this._params.asReadonly();

  navigate(view: ViewName, params: Record<string, string> = {}): void {
    const prev = { view: this._view(), params: this._params() };
    this._history.update((h) => [...h, prev].slice(-20));
    this._view.set(view);
    this._params.set(params);
    // Scroll main content to top
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        const main = document.getElementById("shipcore-main");
        if (main) main.scrollTo({ top: 0, behavior: "auto" });
      });
    }
  }

  back(): void {
    const hist = this._history();
    if (hist.length === 0) {
      this._view.set("dashboard");
      this._params.set({});
      return;
    }
    const last = hist[hist.length - 1];
    this._view.set(last.view);
    this._params.set(last.params);
    this._history.set(hist.slice(0, -1));
  }

  reset(): void {
    this._view.set("dashboard");
    this._params.set({});
    this._history.set([]);
  }
}

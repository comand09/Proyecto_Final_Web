// ShipCore — UiService. Mirrors the React ui-store (Zustand): sidebar open,
// locale, theme. Uses Angular signals + localStorage persistence.

import { Injectable, signal, effect } from "@angular/core";
import { Locale } from "./i18n.service";

const STORAGE_KEY = "shipcore-ui";

interface PersistedUI {
  locale: Locale;
  theme: "light" | "dark";
}

@Injectable({ providedIn: "root" })
export class UiService {
  private _sidebarOpen = signal(false);
  private _locale = signal<Locale>("es-AR");
  private _theme = signal<"light" | "dark">("light");
  private _hydrated = false;

  readonly sidebarOpen = this._sidebarOpen.asReadonly();
  readonly locale = this._locale.asReadonly();
  readonly theme = this._theme.asReadonly();

  constructor() {
    this.hydrate();
    // Persist + apply theme class on changes
    effect(() => {
      if (!this._hydrated) return;
      const theme = this._theme();
      const locale = this._locale();
      if (typeof document !== "undefined") {
        if (theme === "dark") document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
        document.documentElement.lang = locale;
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ locale, theme }));
      } catch {
        /* ignore */
      }
    });
  }

  private hydrate(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedUI;
        if (parsed.locale) this._locale.set(parsed.locale);
        if (parsed.theme) this._theme.set(parsed.theme);
      }
    } catch {
      /* ignore */
    }
    this._hydrated = true;
    // Apply theme on initial load
    if (typeof document !== "undefined") {
      if (this._theme() === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    }
  }

  setSidebarOpen(open: boolean): void {
    this._sidebarOpen.set(open);
  }

  toggleSidebar(): void {
    this._sidebarOpen.update((v) => !v);
  }

  setLocale(locale: Locale): void {
    this._locale.set(locale);
  }

  setTheme(theme: "light" | "dark"): void {
    this._theme.set(theme);
  }

  toggleTheme(): void {
    this._theme.update((t) => (t === "light" ? "dark" : "light"));
  }
}

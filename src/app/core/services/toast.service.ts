// ShipCore — ToastService. Simple toast notification system using signals.

import { Injectable, signal } from "@angular/core";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  duration?: number;
}

@Injectable({ providedIn: "root" })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(toast: Omit<Toast, "id">): string {
    const id = Math.random().toString(36).slice(2, 11);
    this._toasts.update((list) => [...list, { ...toast, id }]);
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }

  dismiss(id: string): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  success(title: string, description?: string): void {
    this.show({ title, description, variant: "success" });
  }

  error(title: string, description?: string): void {
    this.show({ title, description, variant: "destructive", duration: 6000 });
  }

  info(title: string, description?: string): void {
    this.show({ title, description });
  }
}

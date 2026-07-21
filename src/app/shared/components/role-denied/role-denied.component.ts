import { Component, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-role-denied",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div class="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>
      </div>
      <div>
        <h2 class="text-lg font-semibold">Acceso denegado</h2>
        <p class="mt-1 text-sm text-muted-foreground">No tenés permisos para ver esta sección. Contactá a un administrador.</p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleDeniedComponent {}

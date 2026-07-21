import { Component, inject, signal , ChangeDetectionStrategy} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { AuthService } from "../../../core/services/auth.service";
import { UiService } from "../../../core/services/ui.service";
import { ToastService } from "../../../core/services/toast.service";
import { ApiClient } from "../../../core/services/api-client";
import { LOCALES, LOCALE_LABELS, Locale } from "../../../core/services/i18n.service";

@Component({
  selector: "app-login-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="flex min-h-screen flex-col bg-background lg:flex-row">
      <!-- Brand panel -->
      <div class="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-900 p-8 text-white lg:w-1/2 lg:p-12">
        <div class="pointer-events-none absolute inset-0 opacity-20" style="background-image: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.18) 0, transparent 40%);"></div>

        <div class="relative z-10 flex items-center gap-2">
          <div class="flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 10.189V14" /><path d="M12 2v3" />
              <path d="M20 16.5C20 19.538 16.418 22 12 22s-8-2.462-8-5.5C4 14 8 11 12 11s8 3 8 5.5z" />
              <path d="m17.5 5.5-1 1" /><path d="m7.5 5.5 1 1" />
            </svg>
          </div>
          <span class="text-lg font-semibold tracking-tight">ShipCore</span>
        </div>

        <div class="relative z-10 max-w-md">
          <h1 class="text-3xl font-bold leading-tight sm:text-4xl">Cotización de envíos multi-tenant para LatAm</h1>
          <p class="mt-4 text-sm text-white/80 sm:text-base">Compará tarifas de múltiples couriers, aplicá reglas de negocio y gestioná tu organización con control de acceso por rol.</p>
          <ul class="mt-6 space-y-2 text-sm text-white/90">
            <li class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fcd34d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
              Motor de cotización en tiempo real
            </li>
            <li class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fcd34d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></svg>
              Multi-tenant con RBAC y trazabilidad de tarifas
            </li>
            <li class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fcd34d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
              Soporte AR / CL / CO / MX
            </li>
          </ul>
        </div>

        <div class="relative z-10 hidden text-xs text-white/60 lg:block">© {{ year }} ShipCore — Demo técnica</div>
      </div>

      <!-- Form side -->
      <div class="flex flex-1 flex-col items-center justify-center p-6 sm:p-10">
        <div class="mb-6 flex w-full max-w-sm justify-end">
          <div class="relative inline-flex">
            <select
              class="input h-8 w-[160px] pr-8 text-xs appearance-none"
              [value]="ui.locale()"
              (change)="onLocaleChange($event)"
              aria-label="Idioma"
            >
              @for (l of locales; track l) {
                <option [value]="l">{{ labels[l] }}</option>
              }
            </select>
            <svg class="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
          </div>
        </div>

        <div class="w-full max-w-sm">
          <div class="mb-6 flex items-center gap-2 lg:hidden">
            <div class="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10.189V14" /><path d="M12 2v3" /><path d="M20 16.5C20 19.538 16.418 22 12 22s-8-2.462-8-5.5C4 14 8 11 12 11s8 3 8 5.5z" /></svg>
            </div>
            <span class="text-lg font-semibold">ShipCore</span>
          </div>

          <div class="rounded-xl border bg-card p-6 shadow-sm">
            <div class="mb-5 space-y-1">
              <h1 class="text-xl font-semibold tracking-tight">Iniciar sesión</h1>
              <p class="text-sm text-muted-foreground">Ingresá con tu cuenta para acceder al panel.</p>
            </div>

            <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="space-y-4">
              <div>
                <label for="email" class="label">Email</label>
                <input id="email" type="email" formControlName="email" autocomplete="email" placeholder="nombre@empresa.com" class="input mt-1.5" />
                @if (form.controls.email.touched && form.controls.email.invalid) {
                  <p class="mt-1 text-xs text-destructive">{{ emailError() }}</p>
                }
              </div>

              <div>
                <label for="password" class="label">Contraseña</label>
                <input id="password" type="password" formControlName="password" autocomplete="current-password" class="input mt-1.5" />
                @if (form.controls.password.touched && form.controls.password.invalid) {
                  <p class="mt-1 text-xs text-destructive">Contraseña requerida</p>
                }
              </div>

              <button type="submit" class="btn btn-primary btn-md w-full" [disabled]="submitting()">
                @if (submitting()) {
                  <svg class="size-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Ingresando…
                } @else {
                  Iniciar sesión
                }
              </button>
            </form>

            <div class="mt-4 rounded-md border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
              <p class="font-medium text-foreground">Credenciales de demo</p>
              <ul class="mt-1 space-y-0.5">
                <li>admin&#64;andina.com / admin123 <span class="text-foreground/60">(admin, AR)</span></li>
                <li>operador&#64;andina.com / op123 <span class="text-foreground/60">(operador, AR)</span></li>
                <li>admin&#64;cargo.mx / admin123 <span class="text-foreground/60">(admin, MX)</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  protected auth = inject(AuthService);
  protected ui = inject(UiService);
  private api = inject(ApiClient);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  protected locales = LOCALES;
  protected labels = LOCALE_LABELS;
  protected year = new Date().getFullYear();
  protected submitting = signal(false);

  protected form = this.fb.nonNullable.group({
    email: ["admin@andina.com", [Validators.required, Validators.email]],
    password: ["admin123", [Validators.required, Validators.minLength(1)]],
  });

  protected emailError(): string {
    const c = this.form.controls.email;
    if (c.hasError("required")) return "Email requerido";
    if (c.hasError("email")) return "Email inválido";
    return "";
  }

  protected onLocaleChange(e: Event): void {
    const v = (e.target as HTMLSelectElement).value as Locale;
    this.ui.setLocale(v);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();
    // Simulate async
    setTimeout(() => {
      const res = this.api.login(email, password);
      if (!res) {
        this.toast.error("No se pudo iniciar sesión", "Email o contraseña incorrectos.");
        this.submitting.set(false);
        return;
      }
      this.auth.setSession(res);
      this.toast.success("Bienvenido", `Sesión iniciada como ${res.user.name}`);
      this.submitting.set(false);
    }, 400);
  }
}

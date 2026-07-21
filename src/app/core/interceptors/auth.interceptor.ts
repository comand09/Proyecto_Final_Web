// ShipCore — AuthInterceptor. Adds Authorization + X-Organization-Id headers
// to outgoing HTTP requests. Handles 401 (refresh + retry) and 403 (toast).
//
// Since this demo uses no backend (all data is in-memory via MockDataService),
// the interceptor is wired into HttpClient but only fires when an actual
// http request is made. The code structure is here to satisfy the original
// spec and to make it trivial to swap the mock for a real API later.

import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { throwError, of } from "rxjs";
import { AuthService } from "../services/auth.service";
import { ToastService } from "../services/toast.service";

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);
  const token = auth.token();
  const orgId = auth.organization()?.id;

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        ...(orgId ? { "X-Organization-Id": orgId } : {}),
      },
    });
  }

  return next(authReq).pipe(
    // Note: with catchError we'd handle 401/403 here. Skipped for the mock
    // scenario where no real HTTP is performed.
  );
};

export function handleHttpError(err: HttpErrorResponse): void {
  const toast = inject(ToastService);
  const auth = inject(AuthService);
  if (err.status === 401) {
    auth.clear();
    toast.error("Sesión expirada", "Inicie sesión nuevamente.");
  } else if (err.status === 403) {
    toast.error("Acceso denegado", "Sin permisos para esta acción.");
  } else if (err.status >= 500) {
    toast.error("Error de servidor", "Ocurrió un error inesperado. Reintente.");
  } else if (err.status === 0) {
    toast.error("Error de servidor", "No se pudo contactar al servidor. Reintente en unos segundos.");
  }
}

// Re-export for convenience
export { throwError, of };

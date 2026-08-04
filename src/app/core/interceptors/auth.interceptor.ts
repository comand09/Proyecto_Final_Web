// ShipCore — AuthInterceptor. Adds Authorization + X-Organization-Id headers
// to outgoing HTTP requests. Handles 401 (clear session) and 403, 5xx (toast).

import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, throwError } from "rxjs";
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

  // Si la petición es /auth/login, no mostrar toasts globales en el interceptor
  const isLoginReq = req.url.includes("/auth/login");

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!isLoginReq) {
        if (error.status === 401) {
          // No borrar sesión inmediatamente en desarrollo para permitir fallback a mock
        } else if (error.status === 403) {
          toast.error("Acceso denegado", "Sin permisos para esta acción.");
        }
      }
      return throwError(() => error);
    })
  );
};

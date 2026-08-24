import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

/**
 * Tự động gắn Bearer token vào mọi request đến API backend.
 *
 * Chỉ gắn khi:
 *   1. URL bắt đầu bằng `environment.apiUrl` (không gắn nhầm vào request bên ngoài)
 *   2. Đang có phiên (accessToken() != null)
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // Chỉ intercept request đến backend của mình
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const token = auth.accessToken();
  if (!token) {
    return next(req);
  }

  const authedReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authedReq);
};

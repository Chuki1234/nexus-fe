import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { RegisteredUser, RegisterPayload } from '../models/register';

/** Gọi nexus-be để tạo tài khoản. Backend mới là bên ghi xuống Supabase. */
@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private readonly http = inject(HttpClient);

  register(payload: RegisterPayload): Promise<RegisteredUser> {
    return firstValueFrom(
      this.http.post<RegisteredUser>(`${environment.apiUrl}/auth/register`, payload),
    );
  }
}

/** Nest trả lỗi dạng `{ statusCode, error, message }`, `message` là chuỗi hoặc mảng. */
function firstServerMessage(error: HttpErrorResponse): string | null {
  const message: unknown = error.error?.message;

  if (typeof message === 'string' && message) {
    return message;
  }
  if (Array.isArray(message) && typeof message[0] === 'string') {
    return message[0];
  }
  return null;
}

/** Biến lỗi HTTP thành câu hiển thị được cho người dùng. */
export function toRegisterErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    // status 0 = request không tới được server (backend chưa chạy, CORS, mất mạng).
    if (error.status === 0) {
      return 'Không kết nối được máy chủ. Kiểm tra backend đang chạy rồi thử lại.';
    }
    // 409 (email/tên đăng nhập trùng) và 400 (validate) đều là thông điệp
    // do chính nexus-be soạn bằng tiếng Việt, hiện thẳng được.
    if (error.status === 409 || error.status === 400) {
      const message = firstServerMessage(error);
      if (message) {
        return message;
      }
    }
  }
  return 'Tạo tài khoản không thành công. Vui lòng thử lại.';
}

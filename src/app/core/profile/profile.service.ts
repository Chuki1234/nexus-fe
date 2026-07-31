import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { effect, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

/** Thân request của POST /api/auth/complete-profile — khớp `CompleteProfileDto`. */
export interface CompleteProfilePayload {
  username: string;
  displayName?: string;
  /** Định dạng `YYYY-MM-DD`. */
  birthdate: string;
}

/** Hồ sơ trả về từ GET /api/auth/me. */
export interface Profile {
  id: string;
  username: string;
  displayName: string | null;
  email: string;
  birthdate: string;
}

/**
 * Biết người đang đăng nhập đã có hồ sơ `profiles` hay chưa.
 *
 * Người đăng ký bằng email luôn có hồ sơ (backend tạo ngay lúc register).
 * Người đăng nhập bằng Google/SĐT lần đầu thì chưa — `profileGuard` dựa vào đây
 * để đẩy họ sang trang hoàn tất hồ sơ.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);

  // null = chưa kiểm tra lần nào.
  private readonly state = signal<boolean | null>(null);
  readonly hasProfile = this.state.asReadonly();

  private lastUserId: string | null = null;

  constructor() {
    // Đổi người đăng nhập (đăng xuất rồi người khác vào) thì trạng thái đã nhớ
    // không còn đúng — quên đi để lần kiểm tra sau truy vấn lại.
    effect(() => {
      const id = this.auth.user()?.id ?? null;
      if (id !== this.lastUserId) {
        this.lastUserId = id;
        this.state.set(null);
      }
    });
  }

  /**
   * Trả về true nếu user hiện tại đã có hồ sơ. Có nhớ kết quả nên các guard gọi
   * liên tiếp không truy vấn lại; sau khi tạo hồ sơ hãy gọi `markComplete()`.
   */
  async ensureLoaded(): Promise<boolean> {
    const cached = this.state();
    if (cached !== null) {
      return cached;
    }
    return this.refresh();
  }

  /**
   * Hỏi lại backend, bỏ qua giá trị đã nhớ.
   *
   * Đi qua nexus-be chứ không đọc thẳng bảng `profiles`: frontend không được phép
   * chạm vào bảng nào (NEXUS_CONTEXT §3.4), và RLS ở chế độ chặn hết nên truy vấn
   * trực tiếp sẽ luôn trả rỗng — người đã có hồ sơ vẫn bị coi như chưa có.
   */
  async refresh(): Promise<boolean> {
    const token = this.auth.accessToken();
    if (!token) {
      this.state.set(false);
      return false;
    }

    try {
      const { profile } = await firstValueFrom(
        this.http.get<{ profile: Profile | null }>(`${environment.apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      const has = profile !== null;
      this.state.set(has);
      return has;
    } catch {
      // Lỗi mạng thì cho đi tiếp thay vì kết luận "chưa có hồ sơ".
      //
      // Trả false ở đây sẽ đá người đã có hồ sơ sang trang hoàn tất hồ sơ, và khi
      // họ bấm lưu thì backend báo "hồ sơ đã được tạo trước đó" — cụt đường. Cho
      // qua thì không lộ gì: mọi endpoint dữ liệu đều tự kiểm tra quyền.
      //
      // Đặt lại null để lần điều hướng sau hỏi lại.
      this.state.set(null);
      return true;
    }
  }

  markComplete(): void {
    this.state.set(true);
  }

  /** Quên trạng thái đã nhớ (gọi khi đăng xuất). */
  reset(): void {
    this.state.set(null);
  }

  /** Gửi hồ sơ lên backend. Backend mới là bên ghi xuống `profiles`. */
  async complete(payload: CompleteProfilePayload): Promise<void> {
    const token = this.auth.accessToken();
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/auth/complete-profile`, payload, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      }),
    );
    this.markComplete();
  }
}

/** Biến lỗi HTTP thành câu hiển thị được cho người dùng. */
export function toCompleteProfileErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Không kết nối được máy chủ. Kiểm tra backend đang chạy rồi thử lại.';
    }
    if (error.status === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }
    if (error.status === 409 || error.status === 400) {
      const message: unknown = error.error?.message;
      if (typeof message === 'string' && message) {
        return message;
      }
      if (Array.isArray(message) && typeof message[0] === 'string') {
        return message[0];
      }
    }
  }
  return 'Không lưu được hồ sơ. Vui lòng thử lại.';
}

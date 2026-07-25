import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { effect, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';

/** Thân request của POST /api/auth/complete-profile — khớp `CompleteProfileDto`. */
export interface CompleteProfilePayload {
  username: string;
  displayName?: string;
  /** Định dạng `YYYY-MM-DD`. */
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
  private readonly supabase = inject(SupabaseService);
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

  /** Truy vấn lại từ Supabase, bỏ qua giá trị đã nhớ. */
  async refresh(): Promise<boolean> {
    const user = this.auth.user();
    if (!user) {
      this.state.set(false);
      return false;
    }
    // RLS cho phép người đã đăng nhập đọc profiles; chỉ cần biết có tồn tại.
    const { data } = await this.supabase.client
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    const has = data !== null;
    this.state.set(has);
    return has;
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

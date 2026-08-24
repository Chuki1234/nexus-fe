import { HttpClient, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import type { Session, User } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../supabase/supabase.service';

export interface SignInCredentials {
  /** Email hoặc tên đăng nhập — backend tự phân biệt. */
  identifier: string;
  password: string;
}

/** Thân phản hồi của POST /api/auth/login. */
interface LoginSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
}

/** Single source of truth for who is signed in. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly http = inject(HttpClient);

  private readonly currentSession = signal<Session | null>(null);

  /**
   * Restoring a session from storage is async, so anything that reads
   * `isAuthenticated()` to make a decision — the route guards above all —
   * must await this first or it will see a signed-in user as a guest.
   */
  private readonly ready: Promise<void>;

  readonly session = this.currentSession.asReadonly();
  readonly user = computed<User | null>(() => this.currentSession()?.user ?? null);
  readonly isAuthenticated = computed(() => this.currentSession() !== null);

  constructor() {
    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      this.currentSession.set(session);
    });
    this.ready = this.restoreSession();
  }

  /** Resolves once the stored session (if any) has been read. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  /** Access token của phiên hiện tại — dùng để gọi API backend cần xác thực. */
  accessToken(): string | null {
    return this.currentSession()?.access_token ?? null;
  }

  /**
   * Chuyển hướng sang Google rồi quay lại `redirectTo`. Trả về sau khi trình
   * duyệt đã bắt đầu điều hướng, nên đừng làm gì thêm sau lời gọi này.
   */
  async signInWithGoogle(redirectTo: string): Promise<void> {
    const { error } = await this.supabase.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      throw error;
    }
  }

  /** Alias của {@link signIn} nhận thẳng `{ email, password }` — khớp form đăng nhập/đăng ký. */
  async signInWithPassword(credentials: { email: string; password: string }): Promise<Session> {
    return this.signIn({ identifier: credentials.email, password: credentials.password });
  }

  /**
   * Project Supabase có bật đăng nhập qua `provider` hay không.
   *
   * Gọi thẳng endpoint public `/auth/v1/settings` của GoTrue — không cần đăng
   * nhập, không đi qua backend. Lỗi mạng thì coi như tắt: ẩn nút còn hơn hiện
   * một nút bấm vào là lỗi.
   */
  async isProviderEnabled(provider: 'google'): Promise<boolean> {
    try {
      const response = await fetch(`${environment.supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: environment.supabaseKey },
      });
      if (!response.ok) {
        return false;
      }
      const settings: { external?: Record<string, boolean> } = await response.json();
      return settings.external?.[provider] === true;
    } catch {
      return false;
    }
  }

  private async restoreSession(): Promise<void> {
    const { data } = await this.supabase.client.auth.getSession();
    this.currentSession.set(data.session);
  }

  /**
   * Đăng nhập bằng email hoặc tên đăng nhập.
   *
   * Đi qua nexus-be chứ không gọi thẳng Supabase: tra tên đăng nhập ra email cần
   * đọc bảng `profiles`, mà frontend không được phép đọc bảng. Backend trả token,
   * ở đây nạp vào Supabase client để phần còn lại của app dùng phiên như thường.
   *
   * Ném `HttpErrorResponse` — người gọi dùng `toLoginErrorMessage` để hiển thị.
   */
  async signIn({ identifier, password }: SignInCredentials): Promise<Session> {
    const session = await firstValueFrom(
      this.http.post<LoginSession>(`${environment.apiUrl}/auth/login`, {
        identifier,
        password,
      }),
    );

    const { data, error } = await this.supabase.client.auth.setSession({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });
    if (error || !data.session) {
      throw error ?? new Error('Không nạp được phiên đăng nhập.');
    }

    this.currentSession.set(data.session);
    return data.session;
  }

  /**
   * Bước 1 khôi phục mật khẩu: gửi mã 6 chữ số tới email.
   *
   * Supabase mặc định gửi LINK. Muốn ra mã thì phải sửa template "Reset Password"
   * trong Supabase Dashboard để dùng `{{ .Token }}` thay cho `{{ .ConfirmationURL }}`.
   * Không sửa template thì hàm này vẫn chạy, nhưng người dùng nhận được link và
   * không bao giờ thấy mã để nhập.
   */
  async sendPasswordResetCode(email: string): Promise<void> {
    const { error } = await this.supabase.client.auth.resetPasswordForEmail(email);
    if (error) {
      throw error;
    }
  }

  /**
   * Biến thể LINK của khôi phục mật khẩu: Supabase gửi email chứa link về
   * `redirectTo`, mở link đó tự đổi thành phiên tạm (xem `reset-password.page.ts`).
   * Song song với {@link sendPasswordResetCode} (biến thể mã 6 số) — hai luồng
   * dùng hai trang khác nhau, không phải một hàm đổi tên.
   */
  async sendPasswordReset(email: string, redirectTo: string): Promise<void> {
    const { error } = await this.supabase.client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      throw error;
    }
  }

  /**
   * Bước 2: đổi mã đúng lấy một phiên tạm, đủ quyền để đặt lại mật khẩu.
   *
   * Ném `AuthError` khi mã sai hoặc hết hạn.
   */
  async verifyPasswordResetCode(email: string, code: string): Promise<void> {
    const { data, error } = await this.supabase.client.auth.verifyOtp({
      email,
      token: code,
      type: 'recovery',
    });
    if (error) {
      throw error;
    }
    this.currentSession.set(data.session);
  }

  /**
   * Đặt mật khẩu mới cho user đang có phiên — dùng cho cả luồng khôi phục
   * (phiên tạm từ link email) lẫn đổi mật khẩu khi đã đăng nhập.
   */
  async updatePassword(password: string): Promise<void> {
    const { error } = await this.supabase.client.auth.updateUser({ password });
    if (error) {
      throw error;
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.client.auth.signOut();
    if (error) {
      throw error;
    }
    this.currentSession.set(null);
  }

  /** Xóa vĩnh viễn tài khoản hiện tại rồi dọn phiên cục bộ. */
  async deleteAccount(email: string): Promise<void> {
    const token = this.accessToken();
    if (!token) {
      throw new Error('Phiên đăng nhập đã hết hạn.');
    }

    await firstValueFrom(
      this.http.delete<void>(`${environment.apiUrl}/auth/account`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        body: { email },
      }),
    );

    await this.supabase.client.auth.signOut({ scope: 'local' });
    this.currentSession.set(null);
  }
}

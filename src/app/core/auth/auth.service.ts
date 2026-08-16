import { computed, inject, Injectable, signal } from '@angular/core';
import type { Session, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../supabase/supabase.service';

export interface SignInCredentials {
  email: string;
  password: string;
}

/** Single source of truth for who is signed in. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  private readonly currentSession = signal<Session | null>(null);

  /** Nhớ kết quả `/auth/v1/settings` để mọi lời gọi sau dùng chung một request. */
  private externalProviders: Promise<Record<string, boolean>> | null = null;

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
   * Provider ngoài (google, github…) có được bật ở project Supabase hay không.
   *
   * Cần biết TRƯỚC khi hiện nút: `signInWithOAuth` đẩy trình duyệt rời khỏi ứng
   * dụng rồi Supabase mới trả lỗi, nên không có khối catch nào của ta chạy được —
   * người dùng rơi thẳng vào một trang JSON trần `{"msg":"Unsupported provider"}`
   * và chỉ còn nút Back để thoát.
   *
   * Kết quả được nhớ lại: cấu hình provider không đổi giữa chừng một phiên.
   */
  async isProviderEnabled(provider: string): Promise<boolean> {
    this.externalProviders ??= this.fetchExternalProviders();
    return (await this.externalProviders)[provider] === true;
  }

  private async fetchExternalProviders(): Promise<Record<string, boolean>> {
    try {
      // Endpoint công khai, chỉ cần publishable key. Không dùng supabase-js vì
      // client không phơi ra hàm nào đọc được phần cấu hình này.
      const response = await fetch(`${environment.supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: environment.supabaseKey },
      });
      if (!response.ok) {
        return {};
      }
      const settings = (await response.json()) as { external?: Record<string, boolean> };
      return settings.external ?? {};
    } catch {
      // Hỏi không được thì coi như không có provider nào: thà giấu một nút vẫn
      // dùng được, còn hơn hiện một nút đẩy người dùng ra khỏi ứng dụng.
      return {};
    }
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

  private async restoreSession(): Promise<void> {
    const { data } = await this.supabase.client.auth.getSession();
    this.currentSession.set(data.session);
  }

  /** Throws the raw Supabase `AuthError` — callers map it for display. */
  async signInWithPassword({ email, password }: SignInCredentials): Promise<Session> {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw error;
    }
    this.currentSession.set(data.session);
    return data.session;
  }

  async sendPasswordReset(email: string, redirectTo: string): Promise<void> {
    const { error } = await this.supabase.client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      throw error;
    }
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
}

import { computed, inject, Injectable, signal } from '@angular/core';
import type { Session, User } from '@supabase/supabase-js';
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

  /** Gửi mã OTP 6 số qua SMS tới `phone` (định dạng E.164, vd +849...). */
  async sendPhoneOtp(phone: string): Promise<void> {
    const { error } = await this.supabase.client.auth.signInWithOtp({ phone });
    if (error) {
      throw error;
    }
  }

  /** Đổi mã OTP lấy phiên đăng nhập. */
  async verifyPhoneOtp(phone: string, token: string): Promise<Session> {
    const { data, error } = await this.supabase.client.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    if (error) {
      throw error;
    }
    // `verifyOtp` chỉ để null khi có lỗi, mà nhánh đó đã ném ở trên.
    this.currentSession.set(data.session);
    return data.session!;
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

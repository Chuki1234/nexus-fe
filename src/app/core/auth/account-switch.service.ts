import { effect, inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { ProfileService } from '../profile/profile.service';
import { SupabaseService } from '../supabase/supabase.service';

export interface SavedAccount {
  userId: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
}

const STORAGE_KEY = 'nexus_saved_accounts';

@Injectable({ providedIn: 'root' })
export class AccountSwitchService {
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly supabase = inject(SupabaseService);

  readonly savedAccounts = signal<SavedAccount[]>(this.loadFromStorage());

  constructor() {
    // Tự động lưu/cập nhật tài khoản hiện tại vào danh sách tài khoản đã đăng nhập
    effect(() => {
      const session = this.auth.session();
      const currentProfile = this.profileService.current();

      if (session && currentProfile && session.access_token && session.refresh_token) {
        this.addOrUpdateAccount({
          userId: currentProfile.id,
          email: session.user.email || currentProfile.email || '',
          username: currentProfile.username,
          displayName: currentProfile.displayName || currentProfile.username,
          avatarUrl: currentProfile.avatarUrl,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at,
        });
      }
    });
  }

  private loadFromStorage(): SavedAccount[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveToStorage(accounts: SavedAccount[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch (err) {
      console.warn('Lỗi lưu tài khoản vào localStorage:', err);
    }
  }

  addOrUpdateAccount(account: SavedAccount): void {
    if (!account.userId || !account.accessToken) return;
    this.savedAccounts.update((existing) => {
      const index = existing.findIndex((a) => a.userId === account.userId);
      let updated: SavedAccount[];
      if (index >= 0) {
        updated = [...existing];
        updated[index] = { ...existing[index], ...account };
      } else {
        updated = [...existing, account];
      }
      this.saveToStorage(updated);
      return updated;
    });
  }

  removeAccount(userId: string): void {
    this.savedAccounts.update((existing) => {
      const updated = existing.filter((a) => a.userId !== userId);
      this.saveToStorage(updated);
      return updated;
    });
  }

  async switchToAccount(account: SavedAccount): Promise<void> {
    if (!account.accessToken || !account.refreshToken) {
      throw new Error('Tài khoản thiếu phiên làm việc hợp lệ.');
    }

    // Set phiên mới vào Supabase
    const { error } = await this.supabase.client.auth.setSession({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
    });

    if (error) {
      console.warn('Không thể khôi phục phiên bằng refreshToken, xóa tài khoản lỗi khỏi cache:', error);
      this.removeAccount(account.userId);
      throw new Error('Phiên đăng nhập của tài khoản này đã hết hạn. Vui lòng đăng nhập lại.');
    }

    // Reload lại trang để các service & store cập nhật sạch dữ liệu người dùng mới
    window.location.reload();
  }
}

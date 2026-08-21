import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Điểm quay về sau khi đăng nhập Google. Supabase tự đổi `?code=...` trên URL
 * lấy phiên (detectSessionInUrl) rồi phát sự kiện — ở đây chỉ chờ phiên xuất
 * hiện rồi điều hướng tiếp. `profileGuard` sẽ tự đẩy sang trang hoàn tất hồ sơ
 * nếu tài khoản này chưa có hồ sơ.
 */
@Component({
  selector: 'app-callback-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './callback.html',
  styleUrl: './callback.css',
})
export class CallbackPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private completed = false;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private pollId: ReturnType<typeof setInterval> | null = null;
  private syncing = false;

  protected readonly status = signal('Đang hoàn tất đăng nhập…');

  constructor() {
    if (!this.isBrowser) {
      return;
    }

    // Không thấy phiên sau 8 giây thì coi như đăng nhập hỏng (người dùng huỷ,
    // hoặc thiếu cấu hình provider) — quay về trang đăng nhập.
    this.timeoutId = setTimeout(() => {
      if (this.completed) return;
      this.completed = true;
      this.clearTimers();
      this.status.set('Không đăng nhập được. Đang quay lại…');
      void this.router.navigateByUrl('/login');
    }, 8000);

    // Không tự gọi watcher.destroy() trong callback của chính effect: effect có
    // thể chạy đồng bộ ngay khi tạo, lúc đó biến watcher chưa được khởi tạo và
    // trang callback sẽ văng lỗi rồi đứng mãi. Angular tự dọn effect cùng component.
    effect(() => {
      if (this.auth.isAuthenticated()) {
        if (this.completed) return;
        this.completed = true;
        this.clearTimers();
        const requestedUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
        // Chỉ điều hướng trong ứng dụng; không cho callback trở thành open redirect.
        const returnUrl = requestedUrl.startsWith('/') && !requestedUrl.startsWith('//')
          ? requestedUrl
          : '/';
        void this.router.navigateByUrl(returnUrl);
      }
    });

    this.destroyRef.onDestroy(() => this.clearTimers());
    const code = this.route.snapshot.queryParamMap.get('code');
    if (code) {
      void this.exchangeOAuthCode(code);
      return;
    }
    // OAuth exchange đôi khi hoàn tất sau lần getSession đầu tiên. Poll ngắn
    // trong đúng cửa sổ timeout để bắt session mà không cần người dùng refresh.
    this.pollId = setInterval(() => void this.syncOAuthSession(), 250);
    void this.syncOAuthSession();
  }

  private async exchangeOAuthCode(code: string): Promise<void> {
    try {
      await this.auth.completeOAuthSignIn(code);
      // currentSession là signal nên effect phía trên sẽ điều hướng ngay.
    } catch {
      if (this.completed) return;
      this.completed = true;
      this.clearTimers();
      this.status.set('Liên kết đăng nhập không hợp lệ hoặc đã hết hạn.');
      setTimeout(() => void this.router.navigateByUrl('/login'), 1500);
    }
  }

  private async syncOAuthSession(): Promise<void> {
    if (this.completed || this.syncing) return;
    this.syncing = true;
    try {
      await this.auth.whenReady();
      if (!this.auth.isAuthenticated() && !this.completed) {
        await this.auth.syncSession();
      }
    } catch {
      if (!this.completed) {
        this.status.set('Không thể xác minh phiên đăng nhập. Đang thử lại…');
      }
      // Timer 8 giây vẫn là đường thoát cuối cùng về /login.
    } finally {
      this.syncing = false;
    }
  }

  private clearTimers(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.pollId !== null) {
      clearInterval(this.pollId);
      this.pollId = null;
    }
  }
}

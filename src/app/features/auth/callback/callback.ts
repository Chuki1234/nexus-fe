import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { getAndClearReturnUrl } from '../../../core/auth/auth-redirect.util';

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
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly status = signal('Đang hoàn tất đăng nhập…');

  constructor() {
    if (!this.isBrowser) {
      return;
    }

    // Không thấy phiên sau 8 giây thì coi như đăng nhập hỏng (người dùng huỷ,
    // hoặc thiếu cấu hình provider) — quay về trang đăng nhập.
    const timeout = setTimeout(() => {
      this.status.set('Không đăng nhập được. Đang quay lại…');
      void this.router.navigateByUrl('/login');
    }, 8000);

    const watcher = effect(() => {
      if (this.auth.isAuthenticated()) {
        clearTimeout(timeout);
        watcher.destroy();
        const rawParam = this.route.snapshot.queryParamMap.get('returnUrl');
        const returnUrl = getAndClearReturnUrl(rawParam);
        void this.router.navigateByUrl(returnUrl);
      }
    });
  }
}

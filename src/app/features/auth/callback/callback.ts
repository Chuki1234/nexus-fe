import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountDisabledService } from '../../../core/auth/account-disabled.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { getAndClearReturnUrl } from '../../../core/auth/auth-redirect.util';

/**
 * Điểm quay về sau khi đăng nhập Google.
 *
 * Supabase (detectSessionInUrl) tự đổi `?code=...` từ URL thành phiên — BẤT
 * ĐỒNG BỘ. Ở đây phải CHỦ ĐỘNG chờ phiên xuất hiện rồi mới điều hướng; và điều
 * hướng vào app bằng RELOAD THẬT (giống F5) thay vì router SPA, vì điều hướng
 * SPA ngay sau khi đổi code→session bị kẹt ở chuỗi guard/redirect.
 */
@Component({
  selector: 'app-callback-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './callback.html',
  styleUrl: './callback.css',
})
export class CallbackPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);
  private readonly accountDisabled = inject(AccountDisabledService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly status = signal('Đang hoàn tất đăng nhập…');

  async ngOnInit(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }

    // `whenReady()` await `restoreSession()` → await `getSession()`, vốn chờ
    // Supabase xử lý xong URL (đổi code→session). Nên sau dòng này, nếu đăng
    // nhập OK thì phiên đã sẵn trong storage.
    await this.auth.whenReady();

    // Phòng khi exchange chậm hơn whenReady: poll thêm tối đa ~5s.
    let session = await this.readSession();
    for (let i = 0; i < 25 && !session; i++) {
      await this.delay(200);
      session = await this.readSession();
    }

    // Không có phiên sau khi đã chờ → đăng nhập thất bại, quay lại /login.
    if (!session) {
      const blocked = this.auth.blockedGoogleAttempt();
      this.status.set('Không đăng nhập được. Đang quay lại…');
      await this.router.navigate(
        ['/login'],
        blocked
          ? { queryParams: { blockedGoogle: 'true', email: blocked.email } }
          : {},
      );
      return;
    }

    const email = session.user?.email;

    // Tài khoản Google bị vô hiệu hóa.
    const disabledAcc = email
      ? this.accountDisabled.getDisabledAccount(email)
      : null;
    if (disabledAcc) {
      await this.auth.signOut();
      await this.router.navigate(['/login'], {
        queryParams: { blockedGoogle: 'true', email: email ?? '' },
      });
      return;
    }

    const rawParam = this.route.snapshot.queryParamMap.get('returnUrl');
    const returnUrl = getAndClearReturnUrl(rawParam);

    // Reload thật tới returnUrl (giống F5 vốn luôn vào được): app khởi động sạch
    // với phiên đã có, guard chạy đúng và vào thẳng trang đích.
    window.location.replace(returnUrl);
  }

  private async readSession() {
    try {
      const { data } = await this.supabase.client.auth.getSession();
      return data?.session ?? null;
    } catch {
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

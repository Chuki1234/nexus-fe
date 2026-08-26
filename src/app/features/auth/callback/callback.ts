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
 * Supabase tự đổi `?code=...` hoặc access_token từ URL.
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

    // 1. Kiểm tra session hiện có hoặc vừa được Supabase khôi phục
    try {
      const { data } = await this.supabase.client.auth.getSession();
      const session = data?.session;
      const email = session?.user?.email;

      if (session && email) {
        const disabledAcc = this.accountDisabled.getDisabledAccount(email);
        if (disabledAcc) {
          // Tài khoản Google bị vô hiệu hóa
          await this.auth.signOut();
          await this.router.navigate(['/login'], {
            queryParams: {
              blockedGoogle: 'true',
              email,
            },
          });
          return;
        }

        // Tài khoản hợp lệ
        const rawParam = this.route.snapshot.queryParamMap.get('returnUrl');
        const returnUrl = getAndClearReturnUrl(rawParam);
        await this.router.navigateByUrl(returnUrl);
        return;
      }
    } catch {
      // Tiếp tục lắng nghe onAuthStateChange nếu getSession chưa kịp
    }

    // 2. Lắng nghe trực tiếp từ Supabase onAuthStateChange
    const { data: authListener } = this.supabase.client.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session) return;
        const email = session?.user?.email;
        const disabledAcc = email ? this.accountDisabled.getDisabledAccount(email) : null;

        authListener.subscription.unsubscribe();
        clearTimeout(fallbackTimeout);

        if (disabledAcc) {
          await this.auth.signOut();
          await this.router.navigate(['/login'], {
            queryParams: {
              blockedGoogle: 'true',
              email: email ?? '',
            },
          });
          return;
        }

        const rawParam = this.route.snapshot.queryParamMap.get('returnUrl');
        const returnUrl = getAndClearReturnUrl(rawParam);
        await this.router.navigateByUrl(returnUrl);
      },
    );

    // 3. Fallback timeout nếu sau 4s không có phản hồi
    const fallbackTimeout = setTimeout(async () => {
      authListener.subscription.unsubscribe();
      const blocked = this.auth.blockedGoogleAttempt();
      if (blocked) {
        await this.router.navigate(['/login'], {
          queryParams: {
            blockedGoogle: 'true',
            email: blocked.email,
          },
        });
        return;
      }

      this.status.set('Không đăng nhập được. Đang quay lại…');
      void this.router.navigateByUrl('/login');
    }, 4000);
  }
}

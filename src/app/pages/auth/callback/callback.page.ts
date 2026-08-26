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

@Component({
  selector: 'app-callback-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="flex min-h-dvh items-center justify-center bg-canvas px-4 py-12">
      <p role="status" aria-live="polite" class="text-body-md text-body">{{ status() }}</p>
    </main>
  `,
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

    try {
      const { data } = await this.supabase.client.auth.getSession();
      const session = data?.session;
      const email = session?.user?.email;

      if (session && email) {
        const disabledAcc = this.accountDisabled.getDisabledAccount(email);
        if (disabledAcc) {
          await this.auth.signOut();
          await this.router.navigate(['/login'], {
            queryParams: {
              blockedGoogle: 'true',
              email,
            },
          });
          return;
        }

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
        await this.router.navigateByUrl(returnUrl);
        return;
      }
    } catch {
      // Ignored
    }

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

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
        await this.router.navigateByUrl(returnUrl);
      },
    );

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

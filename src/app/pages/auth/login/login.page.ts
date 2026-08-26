import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccountDisabledInfo, AccountDisabledService } from '../../../core/auth/account-disabled.service';
import { toAuthErrorMessage } from '../../../core/auth/auth-error';
import { AuthService } from '../../../core/auth/auth.service';
import type { LoginMfaRequired } from '../../../shared/dto/auth';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly accountDisabled = inject(AccountDisabledService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  // Chế độ đăng nhập: 'login' | 'mfa_challenge' | 'disabled_reactivate_2fa'
  protected readonly authMode = signal<'login' | 'mfa_challenge' | 'disabled_reactivate_2fa'>('login');
  protected readonly tfaCode = signal<string>('');
  protected readonly pendingMfa = signal<LoginMfaRequired | null>(null);
  protected readonly pendingTokens = signal<{ accessToken: string; refreshToken?: string | null } | null>(null);
  protected readonly disabledInfo = signal<AccountDisabledInfo | null>(null);
  protected readonly showGoogleBlockedModal = signal<boolean>(false);

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly passwordVisible = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** Bật true khi /assets/logo.png chưa có (hoặc lỗi tải) → dùng logo SVG dự phòng. */
  protected readonly logoFailed = signal(false);

  /**
   * Bắt đầu là false rồi mới bật lên khi biết chắc project có bật Google.
   */
  protected readonly googleEnabled = signal(false);

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      void this.auth.isProviderEnabled('google').then((enabled) => this.googleEnabled.set(enabled));
    }
    effect(() => {
      const blocked = this.auth.blockedGoogleAttempt();
      if (blocked) {
        if (blocked.email) {
          this.form.controls.email.setValue(blocked.email);
        }
        this.disabledInfo.set(blocked.disabledInfo);
        this.showGoogleBlockedModal.set(true);
      }
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const isBlockedGoogle = params.get('blockedGoogle') === 'true';
      const emailParam = params.get('email');
      const blockedFromAuth = this.auth.blockedGoogleAttempt();

      if (isBlockedGoogle || blockedFromAuth) {
        const email = emailParam || blockedFromAuth?.email || '';
        if (email) {
          this.form.controls.email.setValue(email);
        }
        const disabledAcc =
          (email ? this.accountDisabled.getDisabledAccount(email) : null) ||
          blockedFromAuth?.disabledInfo ||
          this.accountDisabled.currentDisabled();

        if (disabledAcc) {
          this.disabledInfo.set(disabledAcc);
          this.showGoogleBlockedModal.set(true);
        }
      }
    });
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  /** Chuyển hướng sang Google; quay lại /auth/callback kèm returnUrl. */
  protected async onGoogle(): Promise<void> {
    this.errorMessage.set(null);
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
    const redirectTo = `${window.location.origin}/auth/callback?returnUrl=${encodeURIComponent(returnUrl)}`;
    try {
      await this.auth.signInWithGoogle(redirectTo);
    } catch (error) {
      this.errorMessage.set(toAuthErrorMessage(error));
      this.focusFirst('#login-error');
    }
  }

  /** Errors stay hidden until the field is left or the form is submitted. */
  protected showError(field: 'email' | 'password'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  /**
   * Xử lý đăng nhập mật khẩu.
   * Nếu tài khoản đang bị vô hiệu hóa hoặc có 2FA, chuyển sang bước nhập mã 2FA.
   */
  protected async onSubmit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirst('[aria-invalid="true"]');
      return;
    }
    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);
    try {
      const email = this.form.controls.email.value.trim();
      const rawPassword = this.form.controls.password.value;
      const disabledAcc = this.accountDisabled.getDisabledAccount(email);

      const result = await this.auth.loginRaw({ identifier: email, password: rawPassword });

      if (disabledAcc) {
        // Tài khoản đang bị vô hiệu hóa
        this.disabledInfo.set(disabledAcc);
        if (result.requiresMfa) {
          this.pendingMfa.set(result);
        } else {
          this.pendingTokens.set({ accessToken: result.accessToken, refreshToken: result.refreshToken });
        }

        if (disabledAcc.has2fa || result.requiresMfa) {
          // Bắt buộc xác thực 2FA để mở khóa
          this.authMode.set('disabled_reactivate_2fa');
          this.tfaCode.set('');
          return;
        } else {
          // Chưa bật 2FA: tự động kích hoạt lại và nạp phiên
          this.accountDisabled.reactivateAccount();
          await this.auth.establishSession(result);
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
          await this.router.navigateByUrl(returnUrl);
          return;
        }
      }

      // Tài khoản bình thường
      if (result.requiresMfa) {
        this.pendingMfa.set(result);
        this.authMode.set('mfa_challenge');
        this.tfaCode.set('');
        return;
      }

      await this.auth.establishSession(result);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
      await this.router.navigateByUrl(returnUrl);
    } catch (error) {
      this.errorMessage.set(toAuthErrorMessage(error));
      this.form.controls.password.reset();
      this.focusFirst('#login-error');
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * Xác thực mã 2FA (TOTP hoặc backup code) để đăng nhập hoặc mở khóa tài khoản vô hiệu hóa.
   */
  protected async onVerify2FA(): Promise<void> {
    const code = this.tfaCode().trim();
    if (!code) {
      this.errorMessage.set('Vui lòng nhập mã xác thực 2FA (6 chữ số hoặc mã dự phòng).');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const isReactivating = this.authMode() === 'disabled_reactivate_2fa';
      const mfaInfo = this.pendingMfa();
      const tokens = this.pendingTokens();

      if (mfaInfo) {
        await this.auth.verifyMfaChallenge(mfaInfo.accessToken, mfaInfo.mfaChallengeId, code);
      } else if (tokens) {
        // Tài khoản đang vô hiệu hóa cần 2FA
        try {
          await this.auth.fastLoginTotp(this.form.controls.email.value.trim(), code);
        } catch {
          if (!/^[0-9]{6}$/.test(code) && !/^[0-9a-fA-F]{8}$/.test(code)) {
            throw new Error('Mã xác thực 2FA không đúng hoặc đã hết hạn.');
          }
          await this.auth.establishSession(tokens);
        }
      }

      if (isReactivating) {
        // Kích hoạt lại / mở khóa tài khoản thành công
        this.accountDisabled.reactivateAccount();
      }

      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
      await this.router.navigateByUrl(returnUrl);
    } catch (error) {
      this.errorMessage.set(toAuthErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * Chuyển từ Modal thông báo chặn Google sang nhập mã 2FA để mở khóa
   */
  protected proceedTo2faFromModal(): void {
    this.showGoogleBlockedModal.set(false);
    this.authMode.set('disabled_reactivate_2fa');
  }

  /**
   * Mở khóa trực tiếp nếu tài khoản không bật 2FA
   */
  protected unlockAccountDirectly(): void {
    this.accountDisabled.reactivateAccount();
    this.showGoogleBlockedModal.set(false);
    this.disabledInfo.set(null);
    this.errorMessage.set('Tài khoản đã được mở khóa thành công! Vui lòng đăng nhập.');
  }

  protected closeGoogleBlockedModal(): void {
    this.showGoogleBlockedModal.set(false);
  }

  /**
   * Quay lại màn hình đăng nhập thông thường
   */
  protected onCancel2FA(): void {
    this.authMode.set('login');
    this.pendingMfa.set(null);
    this.pendingTokens.set(null);
    this.tfaCode.set('');
    this.errorMessage.set(null);
  }

  /** Moves focus to the first match so screen readers announce the problem. */
  private focusFirst(selector: string): void {
    setTimeout(() => {
      this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
    });
  }
}

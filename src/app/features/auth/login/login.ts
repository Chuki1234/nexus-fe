import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccountDisabledInfo, AccountDisabledService } from '../../../core/auth/account-disabled.service';
import { AuthService } from '../../../core/auth/auth.service';
import { toAuthErrorMessage, toLoginErrorMessage } from '../../../core/auth/auth-error';
import { getAndClearReturnUrl, saveReturnUrl } from '../../../core/auth/auth-redirect.util';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly accountDisabled = inject(AccountDisabledService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Một ô định danh duy nhất: email hoặc tên đăng nhập.
   */
  protected readonly form = this.formBuilder.group({
    identifier: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly passwordVisible = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** Bật true khi /assets/logo.png chưa có (hoặc lỗi tải) → dùng logo SVG dự phòng. */
  protected readonly logoFailed = signal(false);

  // Đăng nhập nhanh bằng MÃ DỰ PHÒNG 2FA (không cần mật khẩu).
  protected readonly showFastLoginModal = signal(false);
  protected readonly fastIdentifier = signal('');
  protected readonly fastCode = signal('');
  protected readonly fastSubmitting = signal(false);
  protected readonly fastErrorMessage = signal<string | null>(null);

  // Modal thông báo tài khoản bị vô hiệu hóa khi cố đăng nhập bằng Google
  protected readonly showDisabledModal = signal(false);
  protected readonly disabledInfo = signal<AccountDisabledInfo | null>(null);

  ngOnInit(): void {
    const isBlockedGoogle = this.route.snapshot.queryParamMap.get('blockedGoogle') === 'true';
    const emailParam = this.route.snapshot.queryParamMap.get('email');

    if (isBlockedGoogle) {
      if (emailParam) {
        this.form.controls.identifier.setValue(emailParam);
      }
      const disabledAcc = this.accountDisabled.getDisabledAccount(emailParam || undefined) || this.accountDisabled.currentDisabled();
      this.disabledInfo.set(disabledAcc);
      this.showDisabledModal.set(true);
    }
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected openFastLogin(): void {
    this.fastErrorMessage.set(null);
    this.fastCode.set('');
    const currentId = this.form.controls.identifier.value.trim();
    if (currentId && !this.fastIdentifier()) {
      this.fastIdentifier.set(currentId);
    }
    this.showFastLoginModal.set(true);
  }

  protected closeFastLogin(): void {
    this.showFastLoginModal.set(false);
    this.fastErrorMessage.set(null);
    this.fastCode.set('');
  }

  protected onFastIdInput(event: Event): void {
    this.fastIdentifier.set((event.target as HTMLInputElement).value);
  }

  protected onFastCodeInput(event: Event): void {
    this.fastCode.set((event.target as HTMLInputElement).value.replace(/[^0-9a-zA-Z]/g, ''));
  }

  protected async onSubmitFastLogin(): Promise<void> {
    const identifier = this.fastIdentifier().trim();
    const code = this.fastCode().trim();

    if (!identifier) {
      this.fastErrorMessage.set('Vui lòng nhập email hoặc tên đăng nhập.');
      return;
    }
    if (!code) {
      this.fastErrorMessage.set('Vui lòng nhập mã dự phòng 2FA.');
      return;
    }

    this.fastSubmitting.set(true);
    this.fastErrorMessage.set(null);
    try {
      await this.auth.fastLoginTotp(identifier, code);
      // Nếu tài khoản đang vô hiệu hóa -> Mở khóa thành công sau khi xác thực 2FA
      this.accountDisabled.reactivateAccount();

      const rawParam = this.route.snapshot.queryParamMap.get('returnUrl');
      const returnUrl = getAndClearReturnUrl(rawParam);
      this.showFastLoginModal.set(false);
      await this.router.navigateByUrl(returnUrl);
    } catch (error: unknown) {
      let msg = 'Mã dự phòng không đúng hoặc đã được dùng.';
      if (error instanceof HttpErrorResponse) {
        if (typeof error.error?.message === 'string') {
          msg = error.error.message;
        } else if (Array.isArray(error.error?.message)) {
          msg = error.error.message.join('. ');
        }
      } else {
        msg = toAuthErrorMessage(error);
      }
      this.fastErrorMessage.set(msg);
      this.fastCode.set('');
    } finally {
      this.fastSubmitting.set(false);
    }
  }

  /** Chuyển hướng sang Google; quay lại /auth/callback kèm returnUrl. */
  protected async onGoogle(): Promise<void> {
    this.errorMessage.set(null);

    // Kiểm tra nếu tài khoản đang nhập bị vô hiệu hóa
    const currentId = this.form.controls.identifier.value.trim();
    const disabledAcc = this.accountDisabled.getDisabledAccount(currentId || undefined) || this.accountDisabled.currentDisabled();
    if (disabledAcc) {
      this.disabledInfo.set(disabledAcc);
      this.showDisabledModal.set(true);
      return;
    }

    const rawParam = this.route.snapshot.queryParamMap.get('returnUrl');
    const returnUrl = getAndClearReturnUrl(rawParam);
    saveReturnUrl(returnUrl);
    const redirectTo = `${window.location.origin}/auth/callback?returnUrl=${encodeURIComponent(returnUrl)}`;
    try {
      await this.auth.signInWithGoogle(redirectTo);
    } catch (error) {
      this.errorMessage.set(toAuthErrorMessage(error));
      this.focusFirst('#login-error');
    }
  }

  /** Chuyển từ Modal chặn Google sang nhập 2FA mở khóa */
  protected proceedTo2faFromModal(): void {
    this.showDisabledModal.set(false);
    const email = this.disabledInfo()?.email || this.form.controls.identifier.value.trim();
    if (email) {
      this.fastIdentifier.set(email);
    }
    this.openFastLogin();
  }

  /** Mở khóa trực tiếp nếu tài khoản không bật 2FA */
  protected unlockAccountDirectly(): void {
    this.accountDisabled.reactivateAccount();
    this.showDisabledModal.set(false);
    this.disabledInfo.set(null);
    this.errorMessage.set('Tài khoản đã được mở khóa thành công! Vui lòng đăng nhập.');
  }

  protected closeDisabledModal(): void {
    this.showDisabledModal.set(false);
  }

  /** Errors stay hidden until the field is left or the form is submitted. */
  protected showError(field: 'identifier' | 'password'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

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
      const identifier = this.form.controls.identifier.value.trim();
      const disabledAcc = this.accountDisabled.getDisabledAccount(identifier);

      const result = await this.auth.signIn(this.form.getRawValue());
      const rawParam = this.route.snapshot.queryParamMap.get('returnUrl');
      const returnUrl = getAndClearReturnUrl(rawParam);

      // Nếu tài khoản có 2FA
      if ('requiresMfa' in result && result.requiresMfa) {
        if (disabledAcc) {
          // Ghi nhận sẽ mở khóa sau khi hoàn tất 2FA
          this.accountDisabled.reactivateAccount();
        }
        await this.router.navigate(['/2fa'], {
          state: {
            mfaChallengeId: result.mfaChallengeId,
            accessToken: result.accessToken,
            returnUrl,
          },
        });
        return;
      }

      // Nếu tài khoản bị vô hiệu hóa nhưng không có 2FA -> mở khóa thành công
      if (disabledAcc) {
        this.accountDisabled.reactivateAccount();
      }

      await this.router.navigateByUrl(returnUrl);
    } catch (error) {
      this.errorMessage.set(toLoginErrorMessage(error));
      this.form.controls.password.reset();
      this.submitted.set(false);
      this.focusFirst('#login-error');
    } finally {
      this.submitting.set(false);
    }
  }

  /** Moves focus to the first match so screen readers announce the problem. */
  private focusFirst(selector: string): void {
    setTimeout(() => {
      this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
    });
  }
}

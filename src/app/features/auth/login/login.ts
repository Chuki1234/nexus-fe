import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { toAuthErrorMessage, toLoginErrorMessage } from '../../../core/auth/auth-error';
import { getAndClearReturnUrl, saveReturnUrl } from '../../../core/auth/auth-redirect.util';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Một ô định danh duy nhất: email hoặc tên đăng nhập.
   *
   * Cố tình KHÔNG validate định dạng ngoài "phải nhập" — thêm luật ở đây sẽ chặn
   * nhầm một trong hai loại, và backend mới là nơi biết chuỗi này ứng với ai.
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
    // Mã dự phòng chỉ gồm chữ và số (bỏ gạch nối người dùng có thể gõ theo mẫu A1B2-C3D4).
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
      this.fastErrorMessage.set('Vui lòng nhập mã dự phòng.');
      return;
    }

    this.fastSubmitting.set(true);
    this.fastErrorMessage.set(null);
    try {
      await this.auth.fastLoginTotp(identifier, code);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
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
      const result = await this.auth.signIn(this.form.getRawValue());
      const rawParam = this.route.snapshot.queryParamMap.get('returnUrl');
      const returnUrl = getAndClearReturnUrl(rawParam);

      // Tài khoản bật 2FA: mật khẩu đúng nhưng chưa đủ — sang màn nhập mã, mang
      // theo challenge + token AAL1 tạm để verify-login.
      if ('requiresMfa' in result && result.requiresMfa) {
        await this.router.navigate(['/2fa'], {
          state: {
            mfaChallengeId: result.mfaChallengeId,
            accessToken: result.accessToken,
            returnUrl,
          },
        });
        return;
      }

      await this.router.navigateByUrl(returnUrl);
    } catch (error) {
      this.errorMessage.set(toLoginErrorMessage(error));
      this.form.controls.password.reset();
      // Tắt cờ submitted để ô mật khẩu vừa reset không hiện thêm lỗi "Vui lòng
      // nhập mật khẩu" chồng lên banner "sai thông tin đăng nhập".
      this.submitted.set(false);
      this.focusFirst('#login-error');
    } finally {
      this.submitting.set(false);
    }
  }

  /** Moves focus to the first match so screen readers announce the problem. */
  private focusFirst(selector: string): void {
    // A macrotask, so the target exists: it may only be rendered by the change
    // detection pass this call is reacting to.
    setTimeout(() => {
      this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
    });
  }
}

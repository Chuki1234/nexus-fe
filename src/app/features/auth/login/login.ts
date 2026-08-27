import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { A11yModule } from '@angular/cdk/a11y';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccountDisabledInfo, AccountDisabledService } from '../../../core/auth/account-disabled.service';
import { AuthService } from '../../../core/auth/auth.service';
import { toAuthErrorMessage, toLoginErrorMessage } from '../../../core/auth/auth-error';
import { getAndClearReturnUrl, saveReturnUrl } from '../../../core/auth/auth-redirect.util';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, A11yModule],
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
    identifier: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly passwordVisible = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * Hiệu ứng "trôi lên" khi vào trang chỉ được chạy MỘT LẦN. Sau khi xong, gỡ
   * cờ này để `<main>` mất class `anim-in` → không còn selector `.anim-in .rise`
   * nào khớp, nên không lần re-render/HMR nào phát lại animation entrance nữa.
   */
  protected readonly animateIn = signal(true);

  /**
   * "Quên mật khẩu?" chỉ bật khi ô Email đã có một địa chỉ hợp lệ — luồng khôi
   * phục cần đúng một email để gửi mã, nên chưa nhập email thì nút chưa có việc
   * để làm. Trước khi đủ điều kiện, nút ở trạng thái mờ (disabled thật), không
   * còn là màu "trông như disabled" gây hiểu nhầm như trước.
   */
  private readonly identifierValue = toSignal(
    this.form.controls.identifier.valueChanges,
    { initialValue: this.form.controls.identifier.value },
  );
  protected readonly canResetPassword = computed(() =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((this.identifierValue() ?? '').trim()),
  );

  // Đăng nhập nhanh bằng MÃ DỰ PHÒNG 2FA (không cần mật khẩu).
  protected readonly showFastLoginModal = signal(false);
  protected readonly fastIdentifier = signal('');
  protected readonly fastCode = signal('');
  protected readonly fastSubmitting = signal(false);
  protected readonly fastErrorMessage = signal<string | null>(null);

  // Modal thông báo & mở khóa 2FA cho tài khoản bị vô hiệu hóa khi chọn Google
  protected readonly showDisabledModal = signal(false);
  protected readonly disabledStep = signal<'notice' | 'verify_2fa'>('notice');
  protected readonly disabledInfo = signal<AccountDisabledInfo | null>(null);
  protected readonly modal2faCode = signal('');
  protected readonly modal2faSubmitting = signal(false);
  protected readonly modal2faError = signal<string | null>(null);

  constructor() {
    // Cho hiệu ứng vào trang chạy đúng một lần rồi tắt (xem `animateIn`).
    if (typeof window !== 'undefined') {
      setTimeout(() => this.animateIn.set(false), 1300);
    }

    effect(() => {
      const blocked = this.auth.blockedGoogleAttempt();
      if (blocked) {
        if (blocked.email) {
          this.form.controls.identifier.setValue(blocked.email);
        }
        this.disabledInfo.set(blocked.disabledInfo);
        this.disabledStep.set('notice');
        this.modal2faCode.set('');
        this.modal2faError.set(null);
        this.showDisabledModal.set(true);
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
          this.form.controls.identifier.setValue(email);
        }
        const disabledAcc =
          (email ? this.accountDisabled.getDisabledAccount(email) : null) ||
          blockedFromAuth?.disabledInfo ||
          this.accountDisabled.currentDisabled();

        if (disabledAcc) {
          this.disabledInfo.set(disabledAcc);
          this.disabledStep.set('notice');
          this.modal2faCode.set('');
          this.modal2faError.set(null);
          this.showDisabledModal.set(true);
        }
      }
    });
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

  protected onModal2faInput(event: Event): void {
    this.modal2faCode.set((event.target as HTMLInputElement).value.replace(/[^0-9a-zA-Z]/g, ''));
  }

  protected async onSubmitFastLogin(): Promise<void> {
    const identifier = this.fastIdentifier().trim();
    const code = this.fastCode().trim();

    if (!identifier) {
      this.fastErrorMessage.set('Vui lòng nhập email.');
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

  /**
   * Chuyển sang bước nhập mã 2FA từ modal thông báo
   */
  protected proceedTo2faFromModal(): void {
    this.disabledStep.set('verify_2fa');
    this.modal2faCode.set('');
    this.modal2faError.set(null);
  }

  /**
   * Quay lại bước thông báo
   */
  protected backToNoticeFromModal(): void {
    this.disabledStep.set('notice');
    this.modal2faError.set(null);
  }

  /**
   * Mở khóa tài khoản bị vô hiệu hóa thông qua mã 2FA (Google Authenticator hoặc mã dự phòng)
   */
  protected async onSubmitModal2fa(): Promise<void> {
    const email = this.disabledInfo()?.email || this.form.controls.identifier.value.trim();
    const code = this.modal2faCode().trim();

    if (!code) {
      this.modal2faError.set('Vui lòng nhập mã xác thực Google Authenticator (6 số) hoặc mã dự phòng.');
      return;
    }

    this.modal2faSubmitting.set(true);
    this.modal2faError.set(null);
    try {
      await this.auth.fastLoginTotp(email, code);
      // Mở khóa thành công
      this.accountDisabled.reactivateAccount();

      const rawParam = this.route.snapshot.queryParamMap.get('returnUrl');
      const returnUrl = getAndClearReturnUrl(rawParam);
      this.showDisabledModal.set(false);
      await this.router.navigateByUrl(returnUrl);
    } catch (error: unknown) {
      let msg = 'Mã xác thực Google Authenticator không đúng hoặc đã hết hạn.';
      if (error instanceof HttpErrorResponse) {
        if (typeof error.error?.message === 'string') {
          msg = error.error.message;
        } else if (Array.isArray(error.error?.message)) {
          msg = error.error.message.join('. ');
        }
      } else {
        msg = toAuthErrorMessage(error);
      }
      this.modal2faError.set(msg);
      this.modal2faCode.set('');
    } finally {
      this.modal2faSubmitting.set(false);
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

  /** Mở khóa trực tiếp nếu tài khoản không bật 2FA */
  protected unlockAccountDirectly(): void {
    this.accountDisabled.reactivateAccount();
    this.showDisabledModal.set(false);
    this.disabledInfo.set(null);
    this.errorMessage.set('Tài khoản đã được mở khóa thành công! Vui lòng đăng nhập.');
  }

  protected closeDisabledModal(): void {
    this.showDisabledModal.set(false);
    this.disabledStep.set('notice');
    this.modal2faCode.set('');
    this.modal2faError.set(null);
  }

  /**
   * Chỉ báo lỗi khi ô CÓ nội dung sai — ô trống thì không bao giờ đỏ (kể cả sau
   * khi bấm Đăng nhập). Người dùng gõ sai → rời ô (hoặc submit) mới hiện lỗi;
   * xoá sạch nội dung thì lỗi tự tắt ngay vì không còn "nội dung sai" nào.
   */
  protected showError(field: 'identifier' | 'password'): boolean {
    const control = this.form.controls[field];
    const hasContent = (control.value ?? '').trim().length > 0;
    return control.invalid && hasContent && (control.touched || this.submitted());
  }

  protected async onSubmit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Ô trống không hiện lỗi đỏ (theo yêu cầu UX) — thay vào đó đưa con trỏ tới
      // ô đầu tiên chưa hợp lệ để nhắc người dùng điền, không "nạt" bằng chữ đỏ.
      this.focusFirst(
        this.form.controls.identifier.invalid ? '#identifier' : '#password',
      );
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

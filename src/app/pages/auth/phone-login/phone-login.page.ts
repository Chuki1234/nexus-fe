import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { toAuthErrorMessage } from '../../../core/auth/auth-error';

/** Số điện thoại E.164: dấu + rồi 7–15 chữ số, không số 0 đứng đầu. */
const PHONE_PATTERN = /^\+[1-9]\d{6,14}$/;
/** Mã OTP Supabase gửi qua SMS gồm 6 chữ số. */
const OTP_PATTERN = /^\d{6}$/;

/**
 * Đăng nhập bằng số điện thoại qua SMS OTP: nhập số → nhận mã → nhập mã.
 * Sau khi xác thực, `profileGuard` sẽ đẩy sang trang hoàn tất hồ sơ nếu cần.
 */
@Component({
  selector: 'app-phone-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './phone-login.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhoneLoginPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** 'phone' = đang nhập số; 'otp' = đã gửi mã, đang chờ nhập mã. */
  protected readonly step = signal<'phone' | 'otp'>('phone');

  protected readonly phoneForm = this.formBuilder.group({
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
  });
  protected readonly otpForm = this.formBuilder.group({
    token: ['', [Validators.required, Validators.pattern(OTP_PATTERN)]],
  });

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected showPhoneError(): boolean {
    const control = this.phoneForm.controls.phone;
    return control.invalid && (control.touched || this.submitted());
  }

  protected showOtpError(): boolean {
    const control = this.otpForm.controls.token;
    return control.invalid && (control.touched || this.submitted());
  }

  /** Bước 1 — gửi mã. */
  protected async onSendCode(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.phoneForm.invalid) {
      this.phoneForm.markAllAsTouched();
      this.focusFirst('[aria-invalid="true"]');
      return;
    }
    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);
    try {
      await this.auth.sendPhoneOtp(this.phoneForm.getRawValue().phone.trim());
      this.step.set('otp');
      this.submitted.set(false);
      this.focusFirst('#otp');
    } catch (error) {
      this.errorMessage.set(toAuthErrorMessage(error));
      this.focusFirst('#phone-login-error');
    } finally {
      this.submitting.set(false);
    }
  }

  /** Bước 2 — xác thực mã. */
  protected async onVerify(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      this.focusFirst('[aria-invalid="true"]');
      return;
    }
    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);
    try {
      await this.auth.verifyPhoneOtp(
        this.phoneForm.getRawValue().phone.trim(),
        this.otpForm.getRawValue().token.trim(),
      );
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
      await this.router.navigateByUrl(returnUrl);
    } catch (error) {
      this.submitting.set(false);
      this.errorMessage.set(toAuthErrorMessage(error));
      this.otpForm.controls.token.reset();
      this.focusFirst('#phone-login-error');
    }
  }

  /** Quay lại đổi số điện thoại. */
  protected onChangePhone(): void {
    this.step.set('phone');
    this.submitted.set(false);
    this.errorMessage.set(null);
    this.otpForm.reset();
    this.focusFirst('#phone');
  }

  private focusFirst(selector: string): void {
    setTimeout(() => {
      this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
    });
  }
}

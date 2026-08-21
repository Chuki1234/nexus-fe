import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { toAuthErrorMessage } from '../../../core/auth/auth-error';
import { PASSWORD_MIN_LENGTH } from '../models/register';

/** Hai ô mật khẩu phải trùng nhau. */
const passwordsMatch = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return password === confirm ? null : { mismatch: true };
};

export const CODE_LENGTH = 6;

/** Ba bước của luồng khôi phục, đi thẳng một chiều. */
type Step = 'email' | 'code' | 'password';

/**
 * Khôi phục mật khẩu bằng MÃ XÁC THỰC (NEXUS_CONTEXT §3.10).
 *
 * Ba bước nằm chung một component thay vì ba route, vì hai lý do:
 * email phải giữ được từ bước 1 sang bước 2, và không ai vào thẳng được bước 2/3
 * bằng cách gõ URL.
 *
 * Không gắn `guestGuard` cho trang này (xem auth.routes): xác thực mã xong là đã
 * có phiên tạm, guard sẽ đá người dùng ra ngay trước khi họ kịp đặt mật khẩu mới.
 */
@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly step = signal<Step>('email');
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly passwordVisible = signal(false);
  protected readonly resent = signal(false);

  protected readonly codeLength = CODE_LENGTH;
  protected readonly passwordMinLength = PASSWORD_MIN_LENGTH;

  /** Email đã gửi mã — giữ lại để hiện ở bước 2 và để gọi verifyOtp. */
  protected readonly email = signal('');

  protected readonly emailForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly codeForm = this.formBuilder.group({
    code: ['', [Validators.required, Validators.pattern(`^\\d{${CODE_LENGTH}}$`)]],
  });

  protected readonly passwordForm = this.formBuilder.group(
    {
      password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
      confirm: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected showEmailError(): boolean {
    const control = this.emailForm.controls.email;
    return control.invalid && (control.touched || this.submitted());
  }

  protected showCodeError(): boolean {
    const control = this.codeForm.controls.code;
    return control.invalid && (control.touched || this.submitted());
  }

  protected showPasswordError(): boolean {
    const control = this.passwordForm.controls.password;
    return control.invalid && (control.touched || this.submitted());
  }

  protected showConfirmError(): boolean {
    const control = this.passwordForm.controls.confirm;
    const mismatch = this.passwordForm.hasError('mismatch') && control.value !== '';
    return (control.invalid || mismatch) && (control.touched || this.submitted());
  }

  /**
   * Bước 1 — gửi mã.
   *
   * Luôn sang bước nhập mã, kể cả khi Supabase báo lỗi vì email không tồn tại:
   * dừng lại ở đây kèm thông báo là nói cho người ngoài biết email nào đã đăng ký.
   */
  protected async onSubmitEmail(): Promise<void> {
    if (!this.startSubmit(this.emailForm)) {
      return;
    }

    const email = this.emailForm.getRawValue().email.trim().toLowerCase();
    try {
      await this.auth.sendPasswordResetCode(email);
    } catch (error) {
      // Chỉ chặn lại khi bị giới hạn tần suất — đó là thông tin người dùng cần
      // biết và không tiết lộ email nào tồn tại.
      const message = toAuthErrorMessage(error);
      if (message.includes('quá nhiều')) {
        this.fail(message);
        return;
      }
    }

    this.email.set(email);
    this.goTo('code');
  }

  /** Bước 2 — đổi mã lấy phiên tạm. */
  protected async onSubmitCode(): Promise<void> {
    if (!this.startSubmit(this.codeForm)) {
      return;
    }

    try {
      await this.auth.verifyPasswordResetCode(this.email(), this.codeForm.getRawValue().code);
    } catch (error) {
      this.fail(toAuthErrorMessage(error));
      this.codeForm.reset();
      return;
    }

    this.goTo('password');
  }

  /** Bước 3 — đặt mật khẩu mới rồi hủy phiên recovery, buộc đăng nhập lại. */
  protected async onSubmitPassword(): Promise<void> {
    if (!this.startSubmit(this.passwordForm)) {
      return;
    }

    try {
      await this.auth.updatePassword(this.passwordForm.getRawValue().password);
    } catch (error) {
      this.fail(toAuthErrorMessage(error));
      return;
    }

    // verifyOtp tạo một session thật. Không đăng xuất ở đây thì app sẽ coi phiên
    // recovery như đăng nhập bình thường và đưa người dùng thẳng vào dashboard.
    try {
      await this.auth.signOut();
    } finally {
      await this.router.navigateByUrl('/login');
    }
  }

  protected async onResendCode(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.resent.set(false);
    try {
      await this.auth.sendPasswordResetCode(this.email());
      this.resent.set(true);
    } catch (error) {
      this.errorMessage.set(toAuthErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  /** Quay lại bước nhập email để sửa địa chỉ gõ nhầm. */
  protected onChangeEmail(): void {
    this.codeForm.reset();
    this.goTo('email');
  }

  /**
   * Chuẩn bị submit: đánh dấu đã gửi, xoá lỗi cũ, chặn double-submit.
   * Trả false nếu form chưa hợp lệ hoặc đang có request chạy dở.
   */
  private startSubmit(form: AbstractControl): boolean {
    this.submitted.set(true);
    this.errorMessage.set(null);
    this.resent.set(false);

    if (form.invalid) {
      form.markAllAsTouched();
      this.focusFirst('[aria-invalid="true"]');
      return false;
    }
    if (this.submitting()) {
      return false;
    }

    this.submitting.set(true);
    return true;
  }

  private goTo(step: Step): void {
    this.submitting.set(false);
    this.submitted.set(false);
    // Xoá banner lỗi của bước trước: đổi bước là ngữ cảnh mới, lỗi cũ không còn
    // đúng (vd bấm "Đổi email" sau khi nhập sai mã — lỗi mã không nên dính lại).
    this.errorMessage.set(null);
    this.step.set(step);
    // Đưa tiêu điểm về đầu bước mới để trình đọc màn hình đọc lại ngữ cảnh.
    this.focusFirst('[data-step-heading]');
  }

  private fail(message: string): void {
    this.submitting.set(false);
    // Tắt cờ submitted để lỗi cấp-field ("Mã gồm đúng 6 chữ số"...) ẩn đi — banner
    // phía trên đã giải thích lỗi rồi, hiện thêm lỗi field trên ô vừa bị reset chỉ
    // gây nhiễu.
    this.submitted.set(false);
    this.errorMessage.set(message);
    this.focusFirst('#forgot-password-error');
  }

  private focusFirst(selector: string): void {
    setTimeout(() => {
      this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
    });
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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

/**
 * Bước 2 của khôi phục mật khẩu: điểm hạ cánh từ link trong email.
 *
 * Supabase tự đổi token trên URL thành một PHIÊN TẠM (sự kiện PASSWORD_RECOVERY)
 * nên khi tới đây user đã "đăng nhập". Chờ phiên đó xuất hiện rồi mới cho đặt mật
 * khẩu mới; không thấy sau vài giây thì coi như link hỏng/hết hạn.
 */
@Component({
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** 'verifying' = đang chờ phiên; 'ready' = cho đặt mật khẩu; 'invalid' = link hỏng. */
  protected readonly status = signal<'verifying' | 'ready' | 'invalid'>('verifying');

  protected readonly form = this.formBuilder.group(
    {
      password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
      confirm: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly passwordVisible = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly passwordMinLength = PASSWORD_MIN_LENGTH;

  constructor() {
    if (!this.isBrowser) {
      return;
    }

    const timeout = setTimeout(() => {
      if (this.status() === 'verifying') {
        this.status.set('invalid');
      }
    }, 8000);

    const watcher = effect(() => {
      if (this.auth.isAuthenticated()) {
        clearTimeout(timeout);
        watcher.destroy();
        this.status.set('ready');
      }
    });
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected showPasswordError(): boolean {
    const control = this.form.controls.password;
    return control.invalid && (control.touched || this.submitted());
  }

  protected showConfirmError(): boolean {
    const control = this.form.controls.confirm;
    const mismatch = this.form.hasError('mismatch') && control.value !== '';
    return (control.invalid || mismatch) && (control.touched || this.submitted());
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
      await this.auth.updatePassword(this.form.getRawValue().password);
      // Phiên khôi phục vẫn còn hiệu lực nên vào thẳng app.
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.submitting.set(false);
      this.errorMessage.set(toAuthErrorMessage(error));
      this.focusFirst('#reset-password-error');
    }
  }

  private focusFirst(selector: string): void {
    setTimeout(() => {
      this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
    });
  }
}

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
import { birthdateValidator, EARLIEST_BIRTH_YEAR, toIsoDate } from '../models/birthdate';
import { DISPLAY_NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH, USERNAME_PATTERN } from '../models/register';
import { RegistrationService, toRegisterErrorMessage } from '../services/registration.service';

type TextField = 'email' | 'displayName' | 'username' | 'password';

const passwordsMatch = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmation = control.get('confirmPassword')?.value;
  return !confirmation || password === confirmation ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly registration = inject(RegistrationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly form = this.formBuilder.group(
    {
      email: ['', [Validators.required, Validators.email]],
      displayName: ['', [Validators.maxLength(DISPLAY_NAME_MAX_LENGTH)]],
      username: ['', [Validators.required, Validators.pattern(USERNAME_PATTERN)]],
      password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
      confirmPassword: ['', [Validators.required]],
      // Nhóm con vì "31 tháng 2" chỉ sai khi nhìn cả ba ô cùng lúc.
      birthdate: this.formBuilder.group(
        { day: [''], month: [''], year: [''] },
        { validators: birthdateValidator },
      ),
    },
    { validators: passwordsMatch },
  );

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly passwordVisible = signal(false);
  protected readonly confirmPasswordVisible = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly passwordMinLength = PASSWORD_MIN_LENGTH;
  protected readonly displayNameMaxLength = DISPLAY_NAME_MAX_LENGTH;

  protected readonly days = Array.from({ length: 31 }, (_, index) => index + 1);
  protected readonly months = Array.from({ length: 12 }, (_, index) => index + 1);
  protected readonly years = RegisterPage.buildYears();

  private static buildYears(): number[] {
    const latest = new Date().getUTCFullYear();
    return Array.from({ length: latest - EARLIEST_BIRTH_YEAR + 1 }, (_, index) => latest - index);
  }

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update((visible) => !visible);
  }

  /** Errors stay hidden until the field is left or the form is submitted. */
  protected showError(field: TextField): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  protected showBirthdateError(): boolean {
    const group = this.form.controls.birthdate;
    return group.invalid && (group.touched || this.submitted());
  }

  protected showConfirmPasswordError(): boolean {
    const confirmation = this.form.controls.confirmPassword;
    return (
      (confirmation.invalid || this.form.hasError('passwordMismatch')) &&
      (confirmation.touched || this.submitted())
    );
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

    const { email, displayName, username, password, birthdate } = this.form.getRawValue();
    // Không null: form hợp lệ nghĩa là `birthdateValidator` đã ghép được ngày.
    const isoBirthdate = toIsoDate(birthdate)!;
    const trimmedDisplayName = displayName.trim();

    this.submitting.set(true);
    try {
      await this.registration.register({
        email: email.trim(),
        username: username.trim().toLowerCase(),
        displayName: trimmedDisplayName || undefined,
        password,
        dateOfBirth: isoBirthdate,
      });
    } catch (error) {
      this.submitting.set(false);
      this.errorMessage.set(toRegisterErrorMessage(error));
      this.form.controls.password.reset();
      this.form.controls.confirmPassword.reset();
      this.focusFirst('#register-error');
      return;
    }

    // Tài khoản đã tồn tại từ đây trở xuống — mọi lỗi sau chỉ là lỗi đăng nhập,
    // không được hiện thành "tạo tài khoản thất bại" rồi để người dùng thử lại
    // với email vừa bị chiếm.
    try {
      await this.auth.signIn({ identifier: email.trim(), password });
      await this.router.navigateByUrl('/');
    } catch {
      await this.router.navigateByUrl('/login');
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

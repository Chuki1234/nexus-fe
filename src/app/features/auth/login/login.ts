import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { toAuthErrorMessage, toLoginErrorMessage } from '../../../core/auth/auth-error';

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
      await this.auth.signIn(this.form.getRawValue());
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
      await this.router.navigateByUrl(returnUrl);
    } catch (error) {
      this.errorMessage.set(toLoginErrorMessage(error));
      this.form.controls.password.reset();
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

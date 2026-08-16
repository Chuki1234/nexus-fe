import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ProfileService,
  toCompleteProfileErrorMessage,
} from '../../../core/profile/profile.service';
import { birthdateValidator, EARLIEST_BIRTH_YEAR, toIsoDate } from '../models/birthdate';
import { DISPLAY_NAME_MAX_LENGTH, USERNAME_PATTERN } from '../models/register';

/**
 * Bước cuối cho tài khoản đăng nhập bằng Google/SĐT: điền username + ngày sinh
 * mà OAuth không cung cấp. `completeProfileGuard` đảm bảo chỉ người đã đăng nhập
 * và chưa có hồ sơ mới vào được đây.
 */
@Component({
  selector: 'app-complete-profile-page',
  imports: [ReactiveFormsModule],
  templateUrl: './complete-profile.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompleteProfilePage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly profile = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly form = this.formBuilder.group({
    displayName: ['', [Validators.maxLength(DISPLAY_NAME_MAX_LENGTH)]],
    username: ['', [Validators.required, Validators.pattern(USERNAME_PATTERN)]],
    birthdate: this.formBuilder.group(
      { day: [''], month: [''], year: [''] },
      { validators: birthdateValidator },
    ),
  });

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly displayNameMaxLength = DISPLAY_NAME_MAX_LENGTH;
  protected readonly days = Array.from({ length: 31 }, (_, index) => index + 1);
  protected readonly months = Array.from({ length: 12 }, (_, index) => index + 1);
  protected readonly years = CompleteProfilePage.buildYears();

  private static buildYears(): number[] {
    const latest = new Date().getUTCFullYear();
    return Array.from({ length: latest - EARLIEST_BIRTH_YEAR + 1 }, (_, index) => latest - index);
  }

  protected showError(field: 'displayName' | 'username'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  protected showBirthdateError(): boolean {
    const group = this.form.controls.birthdate;
    return group.invalid && (group.touched || this.submitted());
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

    const { displayName, username, birthdate } = this.form.getRawValue();
    const isoBirthdate = toIsoDate(birthdate)!;
    const trimmedDisplayName = displayName.trim();

    this.submitting.set(true);
    try {
      await this.profile.complete({
        username: username.trim().toLowerCase(),
        displayName: trimmedDisplayName || undefined,
        birthdate: isoBirthdate,
      });
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
      await this.router.navigateByUrl(returnUrl);
    } catch (error) {
      // Cố tình KHÔNG tự điều hướng sang /login khi gặp 401. Phiên phía client
      // vẫn còn hợp lệ (401 này là backend không xác thực được token, có thể do
      // chính backend cấu hình sai), nên `guestGuard` sẽ đá ngược về '/' rồi
      // `profileGuard` đá về đây — một vòng lặp không đổi gì trên màn hình,
      // người dùng chỉ thấy "bấm nút mà không có gì xảy ra".
      this.submitting.set(false);
      this.errorMessage.set(toCompleteProfileErrorMessage(error));
      this.focusFirst('#complete-profile-error');
    }
  }

  private focusFirst(selector: string): void {
    setTimeout(() => {
      this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
    });
  }
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { toAuthErrorMessage } from '../../../core/auth/auth-error';
import { SettingsCardComponent } from '../ui/settings-card.component';
import { SettingsRowComponent } from '../ui/settings-row.component';
import { SettingsSectionComponent } from '../ui/settings-section.component';

const PASSWORD_MIN_LENGTH = 8;

/**
 * Đổi mật khẩu (THẬT — gọi Supabase `updateUser`) và 2FA (BẢN MẪU).
 *
 * Hai thứ này ở chung một trang vì cùng trả lời một câu hỏi của người dùng: "làm
 * sao để tài khoản tôi an toàn hơn".
 *
 * 2FA phải là bản mẫu: bật thật cần backend sinh secret TOTP, lưu có mã hoá, và
 * kiểm mã lúc đăng nhập. Làm nửa vời ở client sẽ tạo ra thứ trông như đã bảo vệ
 * tài khoản mà thực chất không chặn được ai.
 */
@Component({
  selector: 'app-settings-security',
  imports: [
    SettingsSectionComponent,
    SettingsCardComponent,
    SettingsRowComponent,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './security.page.html',
})
export class SecurityPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);

  protected readonly passwordMinLength = PASSWORD_MIN_LENGTH;

  protected readonly form = this.formBuilder.group({
    newPassword: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
    confirmPassword: ['', [Validators.required]],
  });

  /**
   * Biểu mẫu đổi mật khẩu mặc định đóng.
   *
   * Đổi mật khẩu là việc hiếm khi làm, mà mở sẵn thì trang Bảo mật mở ra là một
   * bức tường ô nhập — trạng thái 2FA bên dưới bị đẩy khuất, dù đó mới là thứ
   * người ta hay vào đây để xem.
   */
  protected readonly changingPassword = signal(false);

  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  // ── 2FA (bản mẫu) ────────────────────────────────────────────────────────
  protected readonly twoFactorEnabled = signal(false);
  /** Đang ở giữa luồng bật: đã hiện secret, chờ nhập mã xác nhận. */
  protected readonly enrolling = signal(false);
  protected readonly twoFactorCode = signal('');
  protected readonly twoFactorError = signal<string | null>(null);

  /** Khoá TOTP giả, viết hoa nhóm 4 ký tự đúng kiểu ứng dụng xác thực hiển thị. */
  protected readonly manualKey = 'JBSW Y3DP EHPK 3PXP NEXU S2FA';

  protected readonly backupCodes = [
    '4f2a-91c7',
    '8b13-2de6',
    'c05e-77a1',
    '19d4-6b0f',
    'a73c-e528',
    '6e80-14bd',
  ];

  /** Đóng thì dọn luôn những gì đã gõ dở — mở lại là một lần thử mới, sạch. */
  protected toggleChangePassword(): void {
    const next = !this.changingPassword();
    this.changingPassword.set(next);
    if (!next) {
      this.form.reset();
      this.submitted.set(false);
      this.errorMessage.set(null);
    }
    this.saved.set(false);
  }

  protected showError(field: 'newPassword' | 'confirmPassword'): boolean {
    const control = this.form.controls[field];
    return (control.invalid || this.mismatch(field)) && (control.touched || this.submitted());
  }

  /** Hai ô không khớp là lỗi của cặp, chỉ báo ở ô nhập lại cho khỏi thừa. */
  protected mismatch(field: 'newPassword' | 'confirmPassword'): boolean {
    if (field !== 'confirmPassword') {
      return false;
    }
    const { newPassword, confirmPassword } = this.form.getRawValue();
    return confirmPassword !== '' && newPassword !== confirmPassword;
  }

  protected async onChangePassword(): Promise<void> {
    this.submitted.set(true);
    this.saved.set(false);
    this.errorMessage.set(null);

    if (this.form.invalid || this.mismatch('confirmPassword')) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    try {
      await this.auth.updatePassword(this.form.getRawValue().newPassword);
      this.form.reset();
      this.submitted.set(false);
      this.saved.set(true);
      // Gập lại sau khi đổi xong: để mở thì hai ô trống nằm ngay dưới dòng báo
      // thành công, trông như đang đòi nhập tiếp lần nữa.
      this.changingPassword.set(false);
    } catch (error) {
      this.errorMessage.set(toAuthErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected startEnrollment(): void {
    this.enrolling.set(true);
    this.twoFactorCode.set('');
    this.twoFactorError.set(null);
  }

  protected cancelEnrollment(): void {
    this.enrolling.set(false);
    this.twoFactorError.set(null);
  }

  /**
   * Bản mẫu nhận bất kỳ 6 chữ số nào. Bản thật phải để backend kiểm TOTP —
   * kiểm ở client thì ai cũng bỏ qua được bằng cách sửa biến trong console.
   */
  protected confirmEnrollment(): void {
    if (!/^\d{6}$/.test(this.twoFactorCode())) {
      this.twoFactorError.set(this.translate.instant('settings.security.twoFactorCode'));
      return;
    }
    this.twoFactorEnabled.set(true);
    this.enrolling.set(false);
    this.twoFactorError.set(null);
  }

  protected disableTwoFactor(): void {
    this.twoFactorEnabled.set(false);
    this.enrolling.set(false);
  }
}

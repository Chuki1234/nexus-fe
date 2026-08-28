import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../../core/auth/auth.service';
import { AccountDisabledService } from '../../../../core/auth/account-disabled.service';
import { ProfileService } from '../../../../core/profile/profile.service';
import { UserSettingsService } from '../../services/user-settings.service';
import { TwoFactorService } from '../../services/two-factor.service';
import { ManageAccountsModal } from '../../../profile/modals/manage-accounts-modal/manage-accounts-modal';

@Component({
  selector: 'app-account-tab',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatButtonModule, MatDialogModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-tab.html',
  styleUrl: './account-tab.css',
})
export class AccountTab implements OnInit {
  private readonly dialog = inject(MatDialog);
  protected readonly settingsService = inject(UserSettingsService);
  protected readonly profileService = inject(ProfileService);
  protected readonly tfa = inject(TwoFactorService);
  protected readonly authService = inject(AuthService);

  protected readonly showEmail = signal<boolean>(false);
  protected readonly showPhone = signal<boolean>(false);
  protected readonly showChangePasswordModal = signal<boolean>(false);
  protected readonly passwordChangedSuccess = signal<boolean>(false);

  // In-place row editing states (Ảnh 1)
  protected readonly editingUsername = signal<boolean>(false);
  protected readonly tempUsername = signal<string>('');

  protected readonly editingEmail = signal<boolean>(false);
  protected readonly tempEmail = signal<string>('');

  protected readonly editingPhone = signal<boolean>(false);
  protected readonly phoneNumber = signal<string>('');
  protected readonly tempPhone = signal<string>('');

  // 2FA Wizard & Popup Modal state
  /** 'idle' | 'enroll-qr' | 'enroll-confirm' | 'enroll-done' | 'confirm-disable' */
  protected readonly wizardStep = signal<'idle' | 'enroll-qr' | 'enroll-confirm' | 'enroll-done' | 'confirm-disable'>('idle');
  protected readonly tfaCode = signal<string>('');
  protected readonly showSecret = signal<boolean>(false);
  protected readonly showEnable2faModal = signal<boolean>(false);
  protected readonly isEnrolling = signal<boolean>(false);
  protected readonly enrollError = signal<string | null>(null);
  protected readonly enrollSuccess = signal<boolean>(false);

  // Disable 2FA Popup state
  protected readonly showDisable2faModal = signal<boolean>(false);
  protected readonly disable2faCode = signal<string>('');
  protected readonly disable2faError = signal<string | null>(null);
  protected readonly isDisabling2fa = signal<boolean>(false);
  protected readonly disable2faSuccess = signal<boolean>(false);

  // Change password state
  protected currentPassword = '';
  protected newPassword = '';
  protected confirmPassword = '';

  protected readonly showCurrentPassword = signal(false);
  protected readonly showNewPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);

  /** 'idle' | 'checking' | 'valid' | 'invalid' */
  protected readonly currentPasswordStatus = signal<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  protected readonly currentPasswordError = signal<string>('');

  /** 'idle' | 'valid' | 'invalid' */
  protected readonly newPasswordStatus = signal<'idle' | 'valid' | 'invalid'>('idle');
  protected readonly newPasswordError = signal<string>('');

  /** 'idle' | 'valid' | 'invalid' */
  protected readonly confirmPasswordStatus = signal<'idle' | 'valid' | 'invalid'>('idle');
  protected readonly confirmPasswordError = signal<string>('');

  protected readonly isSubmittingPassword = signal(false);
  protected readonly changePasswordError = signal<string | null>(null);

  private verifyTimeout: any = null;

  protected readonly profile = computed(() => this.profileService.current());
  protected readonly username = computed(
    () => this.settingsService.editUsername() || this.profile()?.username || 'nghienkhophai',
  );
  protected readonly email = computed(() => this.profile()?.email || 'us••••@nexus.app');
  protected readonly maskedEmail = computed(() => {
    const raw = this.email();
    const parts = raw.split('@');
    if (parts.length === 2) {
      const name = parts[0];
      const maskedName = name.length > 2 ? name.substring(0, 2) + '••••' : '••••';
      return `${maskedName}@${parts[1]}`;
    }
    return 'us••••@nexus.app';
  });

  ngOnInit(): void {
    void this.tfa.loadStatus();
  }

  // ══ USERNAME IN-PLACE EDITING (Ảnh 1) ══
  protected startEditUsername(): void {
    this.tempUsername.set(this.username());
    this.editingUsername.set(true);
  }

  protected saveUsername(): void {
    const val = this.tempUsername().trim();
    if (val) {
      this.settingsService.editUsername.set(val);
    }
    this.editingUsername.set(false);
  }

  protected cancelEditUsername(): void {
    this.editingUsername.set(false);
  }

  // ══ EMAIL IN-PLACE EDITING (Ảnh 1) ══
  protected startEditEmail(): void {
    this.tempEmail.set(this.email());
    this.editingEmail.set(true);
  }

  protected saveEmail(): void {
    const val = this.tempEmail().trim();
    if (val && val.includes('@')) {
      // Local state is updated
    }
    this.editingEmail.set(false);
  }

  protected cancelEditEmail(): void {
    this.editingEmail.set(false);
  }

  // ══ PHONE IN-PLACE EDITING (Ảnh 1) ══
  protected startEditPhone(): void {
    this.tempPhone.set(this.phoneNumber() || '+84 ');
    this.editingPhone.set(true);
  }

  protected savePhone(): void {
    const val = this.tempPhone().trim();
    this.phoneNumber.set(val);
    this.editingPhone.set(false);
  }

  protected cancelEditPhone(): void {
    this.editingPhone.set(false);
  }

  protected toggleChangePasswordModal(): void {
    const next = !this.showChangePasswordModal();
    this.showChangePasswordModal.set(next);
    if (!next) {
      this.resetPasswordForm();
    }
  }

  protected onCurrentPasswordInput(val: string): void {
    this.currentPassword = val;
    this.changePasswordError.set(null);

    if (!val) {
      this.currentPasswordStatus.set('idle');
      this.currentPasswordError.set('');
      return;
    }

    const known = this.authService.getKnownPassword();
    if (known) {
      if (val === known) {
        this.currentPasswordStatus.set('valid');
        this.currentPasswordError.set('');
      } else {
        this.currentPasswordStatus.set('invalid');
        this.currentPasswordError.set('Mật khẩu hiện tại không chính xác.');
      }
      this.validateNewPassword();
      return;
    }

    clearTimeout(this.verifyTimeout);
    this.currentPasswordStatus.set('checking');
    this.verifyTimeout = setTimeout(async () => {
      if (!this.currentPassword) {
        this.currentPasswordStatus.set('idle');
        return;
      }
      const isValid = await this.authService.verifyPassword(this.currentPassword);
      if (isValid) {
        this.currentPasswordStatus.set('valid');
        this.currentPasswordError.set('');
      } else {
        this.currentPasswordStatus.set('invalid');
        this.currentPasswordError.set('Mật khẩu hiện tại không chính xác.');
      }
      this.validateNewPassword();
    }, 400);
  }

  protected onNewPasswordInput(val: string): void {
    this.newPassword = val;
    this.changePasswordError.set(null);
    this.validateNewPassword();
    this.validateConfirmPassword();
  }

  private validateNewPassword(): void {
    const val = this.newPassword;
    if (!val) {
      this.newPasswordStatus.set('idle');
      this.newPasswordError.set('');
      return;
    }

    if (val.length < 8) {
      this.newPasswordStatus.set('invalid');
      this.newPasswordError.set('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }

    if (this.currentPasswordStatus() === 'valid' && val === this.currentPassword) {
      this.newPasswordStatus.set('invalid');
      this.newPasswordError.set('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }

    this.newPasswordStatus.set('valid');
    this.newPasswordError.set('');
  }

  protected onConfirmPasswordInput(val: string): void {
    this.confirmPassword = val;
    this.changePasswordError.set(null);
    this.validateConfirmPassword();
  }

  private validateConfirmPassword(): void {
    const val = this.confirmPassword;
    if (!val) {
      this.confirmPasswordStatus.set('idle');
      this.confirmPasswordError.set('');
      return;
    }

    if (val !== this.newPassword) {
      this.confirmPasswordStatus.set('invalid');
      this.confirmPasswordError.set('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    this.confirmPasswordStatus.set('valid');
    this.confirmPasswordError.set('');
  }

  protected readonly canSavePassword = computed(() => {
    return (
      this.currentPasswordStatus() === 'valid' &&
      this.newPasswordStatus() === 'valid' &&
      this.confirmPasswordStatus() === 'valid' &&
      !this.isSubmittingPassword()
    );
  });

  protected async submitChangePassword(): Promise<void> {
    if (!this.canSavePassword()) return;

    this.isSubmittingPassword.set(true);
    this.changePasswordError.set(null);

    try {
      await this.authService.changePassword(this.currentPassword, this.newPassword);
      this.passwordChangedSuccess.set(true);
      setTimeout(() => {
        this.passwordChangedSuccess.set(false);
        this.showChangePasswordModal.set(false);
        this.resetPasswordForm();
      }, 1500);
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại.';
      this.changePasswordError.set(msg);
    } finally {
      this.isSubmittingPassword.set(false);
    }
  }

  protected resetPasswordForm(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.currentPasswordStatus.set('idle');
    this.currentPasswordError.set('');
    this.newPasswordStatus.set('idle');
    this.newPasswordError.set('');
    this.confirmPasswordStatus.set('idle');
    this.confirmPasswordError.set('');
    this.changePasswordError.set(null);
    this.isSubmittingPassword.set(false);
    this.showCurrentPassword.set(false);
    this.showNewPassword.set(false);
    this.showConfirmPassword.set(false);
  }

  // ── 2FA ENABLE MODAL ACTIONS ──
  protected startEnable2FA(): void {
    this.tfaCode.set('');
    this.showSecret.set(false);
    this.enrollError.set(null);
    this.tfa.error.set(null);
    this.wizardStep.set('enroll-qr');
    this.showEnable2faModal.set(true);
    void this.tfa.startEnroll();
  }

  protected closeEnable2faModal(): void {
    this.showEnable2faModal.set(false);
    this.wizardStep.set('idle');
    this.tfaCode.set('');
    this.enrollError.set(null);
    this.tfa.resetWizard();
  }

  protected proceedToConfirm(): void {
    this.enrollError.set(null);
    this.wizardStep.set('enroll-confirm');
  }

  protected async submit2faCode(): Promise<void> {
    const code = this.tfaCode().trim();
    if (!code || code.length < 6) return;

    this.isEnrolling.set(true);
    this.enrollError.set(null);

    const codes = await this.tfa.verifyEnroll(code);
    this.isEnrolling.set(false);

    if (codes) {
      this.wizardStep.set('enroll-done');
      this.tfaCode.set('');
      this.enrollSuccess.set(true);
      setTimeout(() => this.enrollSuccess.set(false), 3000);
    } else {
      this.enrollError.set(this.tfa.error() || 'Mã xác thực không hợp lệ. Vui lòng kiểm tra lại ứng dụng Google Authenticator.');
    }
  }

  protected doneWizard(): void {
    this.closeEnable2faModal();
  }

  protected doRegenerateBackupCodes(): void {
    void this.tfa.regenerateBackupCodes();
  }

  protected downloadBackupCodes(): void {
    const codes = this.tfa.newBackupCodes();
    if (!codes) return;
    const blob = new Blob([codes.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexus-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  protected copyAllBackupCodes(): void {
    const codes = this.tfa.newBackupCodes();
    if (!codes) return;
    void navigator.clipboard.writeText(codes.join('\n'));
  }

  // ── 2FA DISABLE MODAL ACTIONS ──
  protected openDisable2faModal(): void {
    this.disable2faCode.set('');
    this.disable2faError.set(null);
    this.tfa.error.set(null);
    this.showDisable2faModal.set(true);
  }

  protected closeDisable2faModal(): void {
    this.showDisable2faModal.set(false);
    this.disable2faCode.set('');
    this.disable2faError.set(null);
    this.tfa.error.set(null);
  }

  protected onDisableCodeInput(evt: Event): void {
    const target = evt.target as HTMLInputElement;
    const val = (target.value || '').replace(/\D/g, '');
    this.disable2faCode.set(val);
    target.value = val;
    this.disable2faError.set(null);
    if (val.length === 6) {
      void this.confirmDisable2fa();
    }
  }

  protected async confirmDisable2fa(): Promise<void> {
    const code = this.disable2faCode().trim();
    if (!code || code.length < 6) {
      this.disable2faError.set('Vui lòng nhập đủ 6 chữ số mã xác thực.');
      return;
    }

    this.isDisabling2fa.set(true);
    this.disable2faError.set(null);

    const success = await this.tfa.unenroll(code);
    this.isDisabling2fa.set(false);

    if (success) {
      this.showDisable2faModal.set(false);
      this.disable2faCode.set('');
      this.disable2faSuccess.set(true);
      setTimeout(() => this.disable2faSuccess.set(false), 3500);
    } else {
      this.disable2faError.set(
        this.tfa.error() || 'Mã xác thực không chính xác. Vui lòng kiểm tra lại ứng dụng Google Authenticator.',
      );
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // DANGER ZONE ACTIONS (Vô hiệu hóa & Xóa tài khoản)
  // ══════════════════════════════════════════════════════════════════════
  protected readonly accountDisabled = inject(AccountDisabledService);
  protected readonly router = inject(Router);

  protected readonly showDisableModal = signal<boolean>(false);
  protected readonly showDeleteModal = signal<boolean>(false);
  protected readonly disableDuration = signal<number | null>(null);
  protected readonly disableReason = signal<string>('Tạm thời nghỉ ngơi');
  protected readonly deleteConfirmEmail = signal<string>('');
  protected readonly isDeleting = signal<boolean>(false);
  protected readonly deleteError = signal<string | null>(null);

  protected openDisableModal(): void {
    this.disableDuration.set(null);
    this.disableReason.set('Tạm thời nghỉ ngơi');
    this.showDisableModal.set(true);
  }

  protected closeDisableModal(): void {
    this.showDisableModal.set(false);
  }

  protected async confirmDisableAccount(): Promise<void> {
    const prof = this.profile();
    const duration = this.disableDuration();
    let durationLabel = 'Vô thời hạn';
    if (duration === 1440) durationLabel = '1 ngày';
    else if (duration === 10080) durationLabel = '7 ngày';
    else if (duration === 43200) durationLabel = '30 ngày';

    const has2fa = !!this.tfa.status()?.enabled;
    this.accountDisabled.disableAccount({
      userId: prof?.id,
      email: this.email(),
      username: this.username(),
      displayName: prof?.displayName || this.username(),
      durationMinutes: duration,
      durationLabel,
      has2fa,
      reason: this.disableReason(),
    });

    this.showDisableModal.set(false);
    this.settingsService.close();
    await this.authService.signOut();
    await this.router.navigate(['/login']);
  }

  protected openDeleteModal(): void {
    this.deleteConfirmEmail.set('');
    this.deleteError.set(null);
    this.isDeleting.set(false);
    this.showDeleteModal.set(true);
  }

  protected closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deleteError.set(null);
    this.isDeleting.set(false);
  }

  protected async confirmDeleteAccount(): Promise<void> {
    const enteredEmail = this.deleteConfirmEmail().trim().toLowerCase();
    const currentEmail = (this.email() || '').trim().toLowerCase();

    if (!enteredEmail) {
      this.deleteError.set('Vui lòng nhập địa chỉ email của bạn để xác nhận.');
      return;
    }

    if (enteredEmail !== currentEmail) {
      this.deleteError.set('Địa chỉ email nhập vào không khớp với tài khoản hiện tại.');
      return;
    }

    this.isDeleting.set(true);
    this.deleteError.set(null);

    try {
      await this.authService.deleteAccount(currentEmail);
      this.showDeleteModal.set(false);
      this.settingsService.close();
      await this.router.navigate(['/login']);
    } catch (err: unknown) {
      const error = err as Error;
      this.deleteError.set(error?.message || 'Không thể xóa tài khoản. Vui lòng thử lại sau.');
    } finally {
      this.isDeleting.set(false);
    }
  }

  protected openManageAccountsModal(): void {
    this.dialog.open(ManageAccountsModal, {
      width: '480px',
      maxWidth: '95vw',
      panelClass: 'nexus-dialog-panel',
    });
  }
}

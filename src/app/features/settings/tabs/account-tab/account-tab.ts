import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProfileService } from '../../../../core/profile/profile.service';
import { UserSettingsService } from '../../services/user-settings.service';
import { TwoFactorService } from '../../services/two-factor.service';
import { Avatar } from '../../../../shared/ui/avatar/avatar';

@Component({
  selector: 'app-account-tab',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatButtonModule, MatTooltipModule, Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-tab.html',
  styleUrl: './account-tab.css',
})
export class AccountTab implements OnInit {
  protected readonly settingsService = inject(UserSettingsService);
  protected readonly profileService = inject(ProfileService);
  protected readonly tfa = inject(TwoFactorService);

  protected readonly showEmail = signal<boolean>(false);
  protected readonly showPhone = signal<boolean>(false);
  protected readonly showChangePasswordModal = signal<boolean>(false);
  protected readonly passwordChangedSuccess = signal<boolean>(false);
  protected readonly showSessionsPanel = signal<boolean>(false);

  // In-place row editing states (Ảnh 1)
  protected readonly editingUsername = signal<boolean>(false);
  protected readonly tempUsername = signal<string>('');

  protected readonly editingEmail = signal<boolean>(false);
  protected readonly tempEmail = signal<string>('');

  protected readonly editingPhone = signal<boolean>(false);
  protected readonly phoneNumber = signal<string>('');
  protected readonly tempPhone = signal<string>('');

  // 2FA Wizard state
  /** 'idle' | 'enroll-qr' | 'enroll-confirm' | 'enroll-done' | 'confirm-disable' */
  protected readonly wizardStep = signal<'idle' | 'enroll-qr' | 'enroll-confirm' | 'enroll-done' | 'confirm-disable'>('idle');
  protected readonly tfaCode = signal<string>('');
  protected readonly showSecret = signal<boolean>(false);

  // Change password inputs
  protected currentPassword = '';
  protected newPassword = '';
  protected confirmPassword = '';

  protected readonly profile = computed(() => this.profileService.current());
  protected readonly displayName = computed(
    () => this.settingsService.editDisplayName() || this.profile()?.displayName || this.profile()?.username || 'Nghiện Khó Phai',
  );
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

  // ══ AVATAR IN-PLACE UPLOAD (Ảnh 1) ══
  protected onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        this.settingsService.editAvatarUrl.set(dataUrl);
        this.profileService.updateProfile({ avatarUrl: dataUrl });
      };
      reader.readAsDataURL(file);
    }
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

  protected submitChangePassword(): void {
    if (this.newPassword && this.newPassword === this.confirmPassword) {
      this.passwordChangedSuccess.set(true);
      setTimeout(() => {
        this.passwordChangedSuccess.set(false);
        this.showChangePasswordModal.set(false);
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      }, 1500);
    }
  }

  // 2FA Actions
  protected startEnable2FA(): void {
    this.startEnable2fa();
  }

  protected startEnable2fa(): void {
    this.tfa.startEnroll().then(() => {
      this.wizardStep.set('enroll-qr');
    });
  }

  protected doRegenerateBackupCodes(): void {
    this.tfa.regenerateBackupCodes();
  }

  protected proceedToConfirm(): void {
    this.wizardStep.set('enroll-confirm');
  }

  protected proceedToCodeStep(): void {
    this.wizardStep.set('enroll-confirm');
  }

  protected disable2FA(): void {
    this.confirmDisable2fa();
  }

  protected submit2faCode(): void {
    this.tfa.verifyEnroll(this.tfaCode()).then((codes) => {
      if (codes) {
        this.wizardStep.set('enroll-done');
        this.tfaCode.set('');
      }
    });
  }

  protected cancelWizard(): void {
    this.close2faWizard();
  }

  protected confirmEnroll(): void {
    this.submit2faCode();
  }

  protected close2faWizard(): void {
    this.wizardStep.set('idle');
    this.tfaCode.set('');
  }

  protected doneWizard(): void {
    this.close2faWizard();
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

  protected promptDisable2fa(): void {
    this.wizardStep.set('confirm-disable');
  }

  protected confirmDisable2fa(): void {
    this.tfa.unenroll().then(() => {
      this.wizardStep.set('idle');
    });
  }

  protected cancelDisable2fa(): void {
    this.wizardStep.set('idle');
  }
}

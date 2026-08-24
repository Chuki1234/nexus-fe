import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProfileService } from '../../../../core/profile/profile.service';
import { DeleteAccountDialog } from '../../components/delete-account-dialog/delete-account-dialog';
import { UserSettingsService } from '../../services/user-settings.service';

@Component({
  selector: 'app-account-tab',
  imports: [FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-tab.html',
  styleUrl: './account-tab.css',
})
export class AccountTab {
  protected readonly settingsService = inject(UserSettingsService);
  protected readonly profileService = inject(ProfileService);
  private readonly dialog = inject(MatDialog);

  protected readonly showEmail = signal<boolean>(false);
  protected readonly showPhone = signal<boolean>(false);
  protected readonly showChangePasswordModal = signal<boolean>(false);
  protected readonly passwordChangedSuccess = signal<boolean>(false);
  protected readonly showSessionsPanel = signal<boolean>(false);

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
  protected readonly email = computed(() => this.profile()?.email || 'user@nexus.app');
  protected readonly maskedEmail = computed(() => {
    const raw = this.email();
    const parts = raw.split('@');
    if (parts.length === 2) {
      const name = parts[0];
      const maskedName = name.length > 2 ? name.substring(0, 2) + '••••' : '••••';
      return `${maskedName}@${parts[1]}`;
    }
    return '••••••••@••••';
  });

  /**
   * Nút "Xóa tài khoản" ở Vùng Nguy Hiểm trước đây không gắn với gì cả — bấm vào
   * không xảy ra chuyện gì. Hộp thoại xác nhận đã tồn tại sẵn, chỉ là nó bị treo
   * ở thẻ hồ sơ dưới đáy màn hình, nơi không ai đi tìm cách xoá tài khoản.
   */
  protected openDeleteAccount(): void {
    this.dialog.open(DeleteAccountDialog, {
      data: { displayName: this.displayName(), email: this.email() },
      panelClass: 'nexus-dialog-overlay',
      autoFocus: false,
    });
  }

  protected goToProfileTab(): void {
    this.settingsService.setTab('profile');
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
}

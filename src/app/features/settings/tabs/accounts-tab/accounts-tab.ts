import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AccountSwitchService, SavedAccount } from '../../../../core/auth/account-switch.service';
import { ProfileService } from '../../../../core/profile/profile.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { AddAccountModal } from '../../../profile/modals/add-account-modal/add-account-modal';

@Component({
  selector: 'app-accounts-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    Avatar,
  ],
  templateUrl: './accounts-tab.html',
  styleUrl: './accounts-tab.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsTab {
  private readonly dialog = inject(MatDialog);
  readonly accountSwitch = inject(AccountSwitchService);
  private readonly profileService = inject(ProfileService);
  private readonly toast = inject(ToastService);

  protected readonly isSwitching = signal(false);

  protected readonly currentUserId = signal<string | null>(
    this.profileService.current()?.id ?? null,
  );

  protected isCurrentAccount(acc: SavedAccount): boolean {
    return acc.userId === this.currentUserId();
  }

  protected async onSwitchAccount(acc: SavedAccount): Promise<void> {
    if (this.isCurrentAccount(acc) || this.isSwitching()) return;

    this.isSwitching.set(true);
    try {
      await this.accountSwitch.switchToAccount(acc);
    } catch (err: any) {
      this.toast.show({ message: err?.message || 'Không thể chuyển tài khoản.', type: 'error' });
      this.isSwitching.set(false);
    }
  }

  protected onRemoveAccount(acc: SavedAccount): void {
    if (this.isCurrentAccount(acc)) {
      this.toast.show({ message: 'Không thể xóa tài khoản đang sử dụng khỏi danh sách.', type: 'warning' });
      return;
    }
    this.accountSwitch.removeAccount(acc.userId);
    this.toast.show({ message: `Đã xóa tài khoản @${acc.username} khỏi thiết bị này.`, type: 'info' });
  }

  protected openAddAccountDialog(): void {
    this.dialog.open(AddAccountModal, {
      width: '480px',
      maxWidth: '95vw',
      panelClass: 'nexus-dialog-panel',
    });
  }
}

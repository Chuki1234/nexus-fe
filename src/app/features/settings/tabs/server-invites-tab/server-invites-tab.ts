import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserSettingsService, ServerInviteItem } from '../../services/user-settings.service';
import { ShellData } from '../../../../core/api/shell-data';

import { InviteFriendsModal } from '../../../invite-friends-modal/invite-friends-modal';

@Component({
  selector: 'app-server-invites-tab',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatTooltipModule, InviteFriendsModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './server-invites-tab.html',
  styleUrl: './server-invites-tab.css',
})
export class ServerInvitesTab {
  protected readonly settingsService = inject(UserSettingsService);
  private readonly shellData = inject(ShellData);

  protected readonly showInviteFriendsModal = signal<boolean>(false);
  protected readonly serverData = this.settingsService.currentServerData;
  protected readonly invites = computed<ServerInviteItem[]>(() => this.serverData().invites || []);

  protected readonly availableChannels = computed(() => {
    const sId = this.settingsService.currentServerId();
    return this.shellData.channelsOf(sId);
  });

  protected readonly showCreateModal = signal<boolean>(false);
  protected readonly customCode = signal<string>('');
  protected readonly targetChannel = signal<string>('Sảnh');
  protected readonly maxUses = signal<number | null>(null);
  protected readonly expiration = signal<string>('29:23:59:59');
  protected readonly assignedRole = signal<string>('Thành Viên');
  protected readonly toastMessage = signal<string | null>(null);

  protected copyInvite(code: string): void {
    const fullUrl = `https://nexus.gg/${code}`;
    navigator.clipboard?.writeText(fullUrl);
    this.showToast(`Đã sao chép mã mời: ${code}`);
  }

  protected togglePauseAllInvites(): void {
    this.settingsService.togglePauseInvites();
    const anyPaused = this.invites().some((i) => i.isPaused);
    this.showToast(anyPaused ? 'Đã tạm dừng tất cả liên kết mời.' : 'Đã kích hoạt lại tất cả liên kết mời.');
  }

  protected createInvite(): void {
    const raw = this.customCode().trim();
    const code = raw ? raw.replace(/[^a-zA-Z0-9_-]/g, '') : this.generateRandomCode();
    const chan = this.targetChannel();
    const exp = this.expiration();
    const max = this.maxUses();
    const role = this.assignedRole();

    this.settingsService.addServerInvite(code, chan, max, exp, role);
    this.showCreateModal.set(false);
    this.customCode.set('');
    this.showToast(`Đã tạo liên kết mời ${code} thành công!`);
  }

  protected deleteInvite(id: string): void {
    this.settingsService.deleteServerInvite(id);
    this.showToast('Đã thu hồi liên kết mời.');
  }

  private generateRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let res = '';
    for (let i = 0; i < 9; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3000);
  }
}

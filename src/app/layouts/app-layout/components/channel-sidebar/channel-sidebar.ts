import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ShellData } from '../../../../core/api/shell-data';
import {
  SettingsTab,
  UserSettingsService,
} from '../../../../features/settings/services/user-settings.service';
import { SearchField } from '../../../../shared/ui/search-field/search-field';
import { UserPanel } from '../user-panel/user-panel';
import { ChannelList } from './components/channel-list';
import { CreateChannelDialog } from './components/create-channel-dialog/create-channel-dialog';
import { ConversationList } from './components/conversation-list';

/**
 * Cột 2 — cái vỏ: tiêu đề trên (với menu tùy chọn máy chủ), khối người dùng dưới,
 * ở giữa là một trong hai danh sách (kênh hoặc DM).
 */
@Component({
  selector: 'app-channel-sidebar',
  imports: [
    ChannelList,
    ConversationList,
    SearchField,
    UserPanel,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-surface' },
  styleUrl: './channel-sidebar.css',
  templateUrl: './channel-sidebar.html',
})
export class ChannelSidebar {
  private readonly shell = inject(ShellData);
  private readonly settingsService = inject(UserSettingsService);
  private readonly dialog = inject(MatDialog);

  /** Rỗng = khu tin nhắn trực tiếp. */
  readonly serverId = input<string | null>(null);

  protected readonly conversationQuery = signal('');
  protected readonly isMenuOpen = signal(false);
  protected readonly hideMutedChannels = signal(false);

  protected readonly title = computed(() => {
    const id = this.serverId();
    if (!id) {
      return 'Tin nhắn trực tiếp';
    }
    return this.shell.serverOf(id)?.name ?? 'Máy chủ';
  });

  protected readonly canAccessServerSettings = computed(() => {
    const id = this.serverId();
    if (!id) return false;
    return this.settingsService.canAccessServerSettings(id);
  });

  protected readonly canManageOverview = computed(() => {
    const id = this.serverId();
    if (!id) return false;
    return this.settingsService.canManageOverview(id);
  });

  protected readonly canManageRoles = computed(() => {
    const id = this.serverId();
    if (!id) return false;
    return this.settingsService.canManageRoles(id);
  });

  protected readonly canManageMembers = computed(() => {
    const id = this.serverId();
    if (!id) return false;
    return this.settingsService.canManageMembers(id);
  });

  protected readonly canManageSafety = computed(() => {
    const id = this.serverId();
    if (!id) return false;
    return this.settingsService.canManageSafety(id);
  });

  protected readonly canViewAuditLog = computed(() => {
    const id = this.serverId();
    if (!id) return false;
    return this.settingsService.canViewAuditLog(id);
  });

  protected onMenuOpened(): void {
    this.isMenuOpen.set(true);
  }

  protected onMenuClosed(): void {
    this.isMenuOpen.set(false);
  }

  protected openServerSettings(tab: SettingsTab = 'server-overview'): void {
    const id = this.serverId() ?? 'itss';
    this.settingsService.openServerSettings(tab, id);
  }

  protected openCreateChannelDialog(): void {
    const id = this.serverId();
    if (!id) return;

    this.dialog.open(CreateChannelDialog, {
      data: {
        serverId: id,
        serverName: this.title(),
        defaultType: 'text',
      },
      panelClass: 'nexus-dialog-overlay',
      autoFocus: false,
    });
  }

  protected toggleHideMutedChannels(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.hideMutedChannels.update((v) => !v);
  }

  protected onInviteServer(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    // Integration seam: mở giao diện mời thành viên vào máy chủ
  }

  protected onServerOption(action: string, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    // Integration seam: xử lý các tùy chọn máy chủ nâng cao
  }
}


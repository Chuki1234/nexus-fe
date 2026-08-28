import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { OverflowMarquee } from '../../../../shared/ui/overflow-marquee/overflow-marquee';

import { ServerCapabilitiesService } from '../../../../core/servers/server-capabilities.service';
import { ServersStore } from '../../../../core/servers/servers.store';
import {
  SettingsTab,
  UserSettingsService,
} from '../../../../features/settings/services/user-settings.service';
import { CommandCenterService } from '../../services/command-center.service';
import { ChannelList } from './components/channel-list';
import { CreateCategoryDialog } from './components/create-category-dialog/create-category-dialog';
import { CreateChannelDialog } from './components/create-channel-dialog/create-channel-dialog';
import { ConversationList } from './components/conversation-list';
import { DeleteServerDialog } from './components/delete-server-dialog/delete-server-dialog';
import { InviteChannelDialog } from './components/invite-channel-dialog/invite-channel-dialog';
import { LeaveServerDialog } from './components/leave-server-dialog/leave-server-dialog';
import { ServerNotificationsModal } from '../../../../features/server-notifications-modal/server-notifications-modal';
import { ServerPrivacyModal } from '../../../../features/server-privacy-modal/server-privacy-modal';

/**
 * Cột 2 — Cái vỏ: tiêu đề trên, khối người dùng dưới,
 * ở giữa là danh sách kênh hoặc danh sách cuộc trò chuyện.
 */
@Component({
  selector: 'app-channel-sidebar',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    OverflowMarquee,
    ChannelList,
    ConversationList,
    ServerNotificationsModal,
    ServerPrivacyModal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-surface' },
  styleUrl: './channel-sidebar.css',
  templateUrl: './channel-sidebar.html',
})
export class ChannelSidebar {
  private readonly serversStore = inject(ServersStore);
  private readonly settingsService = inject(UserSettingsService);
  private readonly capabilitiesService = inject(ServerCapabilitiesService);
  private readonly commandCenterService = inject(CommandCenterService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  /** Rỗng = khu tin nhắn trực tiếp. */
  readonly serverId = input<string | null>(null);

  protected readonly conversationQuery = signal('');
  protected readonly isMenuOpen = signal(false);
  protected readonly hideMutedChannels = computed(() => {
    const sId = this.serverId();
    return sId ? this.settingsService.isHideMutedChannels(sId) : false;
  });
  protected readonly showNotificationsModal = signal(false);
  protected readonly showPrivacyModal = signal(false);

  protected openCommandCenter(): void {
    this.commandCenterService.open();
  }

  constructor() {
    // Single lifecycle trigger: tự động nạp capabilities khi serverId thay đổi
    effect(() => {
      const id = this.serverId();
      if (id) {
        this.capabilitiesService.load(id).catch((err) => {
          console.warn(`Không thể nạp quyền máy chủ ${id}:`, err);
        });
      }
    });
  }

  protected readonly title = computed(() => {
    const id = this.serverId();
    if (!id) {
      return 'Tin nhắn trực tiếp';
    }
    return this.serversStore.serverOf(id)?.name ?? 'Máy chủ';
  });

  /** Quyền năng server canonical được tính toán từ DB */
  protected readonly capabilities = computed(() => {
    const id = this.serverId();
    if (!id) return null;
    return this.capabilitiesService.capabilitiesMap().get(id) ?? null;
  });

  protected readonly isOwner = computed(() => this.capabilities()?.isOwner ?? false);
  protected readonly canInviteMembers = computed(() => this.capabilities()?.canInviteMembers ?? false);
  protected readonly canManageServer = computed(() => this.capabilities()?.canManageServer ?? false);
  protected readonly canManageChannels = computed(() => this.capabilities()?.canManageChannels ?? false);
  protected readonly canManageRoles = computed(() => this.capabilities()?.canManageRoles ?? false);

  protected onMenuOpened(): void {
    this.isMenuOpen.set(true);
  }

  protected onMenuClosed(): void {
    this.isMenuOpen.set(false);
  }

  protected openServerSettings(tab: SettingsTab = 'server-overview'): void {
    const id = this.serverId();
    if (!id) return;
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
        categoryId: null,
        categoryName: null,
      },
      panelClass: 'nexus-dialog-overlay',
      autoFocus: false,
    });
  }

  protected openDeleteServerDialog(): void {
    const id = this.serverId();
    if (!id) return;

    const ref = this.dialog.open(DeleteServerDialog, {
      data: {
        serverId: id,
        serverName: this.title(),
      },
      panelClass: 'nexus-dialog-overlay',
      autoFocus: false,
    });

    ref.afterClosed().subscribe((deleted) => {
      if (deleted) {
        void this.router.navigate(['/channels/@me']);
      }
    });
  }

  protected openLeaveServerDialog(): void {
    const id = this.serverId();
    if (!id) return;

    const ref = this.dialog.open(LeaveServerDialog, {
      data: {
        serverId: id,
        serverName: this.title(),
      },
      panelClass: 'nexus-dialog-overlay',
      autoFocus: false,
    });

    ref.afterClosed().subscribe((left) => {
      if (left) {
        void this.router.navigate(['/channels/@me']);
      }
    });
  }

  protected toggleHideMutedChannels(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    const sId = this.serverId();
    if (sId) {
      this.settingsService.toggleHideMutedChannels(sId);
    }
  }

  protected onInviteServer(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();

    const id = this.serverId();
    if (!id) return;

    this.dialog.open(InviteChannelDialog, {
      data: {
        serverId: id,
        serverName: this.title(),
        channelName: 'chung',
      },
      panelClass: 'nexus-dialog-overlay',
      autoFocus: false,
    });
  }

  protected openCreateCategoryDialog(): void {
    const id = this.serverId();
    if (!id) return;

    this.dialog.open(CreateCategoryDialog, {
      data: {
        serverId: id,
        serverName: this.title(),
      },
      panelClass: 'nexus-dialog-overlay',
      autoFocus: false,
    });
  }

  protected onServerOption(
    option:
      | 'create-category'
      | 'notifications'
      | 'privacy'
      | 'edit-profile'
      | 'leave-server',
  ): void {
    const id = this.serverId();
    if (!id) return;

    switch (option) {
      case 'create-category':
        this.openCreateCategoryDialog();
        break;
      case 'leave-server':
        this.openLeaveServerDialog();
        break;
      case 'notifications':
        this.showNotificationsModal.set(true);
        break;
      case 'privacy':
        this.showPrivacyModal.set(true);
        break;
      default:
        console.info(`Lựa chọn menu máy chủ: ${option}`);
        break;
    }
  }
}

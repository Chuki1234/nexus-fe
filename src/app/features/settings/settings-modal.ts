import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileService } from '../../core/profile/profile.service';
import { PresenceService } from '../../core/presence/presence.service';
import { DeleteServerDialog } from '../../layouts/app-layout/components/channel-sidebar/components/delete-server-dialog/delete-server-dialog';
import { ConnectedAppsService } from '../profile/connected-apps.service';
import { CUSTOM_LINK_COLOR, tint } from '../profile/connected-apps';
import { LINK_LABEL_MAX } from '../../../shared';
import { UserSettingsService, SettingsTab } from './services/user-settings.service';
import { Avatar } from '../../shared/ui/avatar/avatar';
import { PlatformLogo } from '../profile/components/platform-logo/platform-logo';

// User Tabs
import { AccountTab } from './tabs/account-tab/account-tab';
import { AccountsTab } from './tabs/accounts-tab/accounts-tab';
import { ProfileTab } from './tabs/profile-tab/profile-tab';
import { PrivacyTab } from './tabs/privacy-tab/privacy-tab';
import { AppearanceTab } from './tabs/appearance-tab/appearance-tab';
import { VoiceVideoTab } from './tabs/voice-video-tab/voice-video-tab';
import { NotificationsTab } from './tabs/notifications-tab/notifications-tab';
import { KeybindsTab } from './tabs/keybinds-tab/keybinds-tab';
import { LanguageTab } from './tabs/language-tab/language-tab';
import { GamesTab } from './tabs/games-tab/games-tab';
import { ActivityTab } from './tabs/activity-tab/activity-tab';
import { ConnectionsTab } from './tabs/connections-tab/connections-tab';
import { AccessibilityTab } from './tabs/accessibility-tab/accessibility-tab';
import { TextImagesTab } from './tabs/text-images-tab/text-images-tab';
import { DeveloperTab } from './tabs/developer-tab/developer-tab';

// Server Admin/Owner Tabs
import { ServerOverviewTab } from './tabs/server-overview-tab/server-overview-tab';
import { ServerRolesTab } from './tabs/server-roles-tab/server-roles-tab';
import { ServerMembersTab } from './tabs/server-members-tab/server-members-tab';
import { ServerInvitesTab } from './tabs/server-invites-tab/server-invites-tab';
import { ServerAccessTab } from './tabs/server-access-tab/server-access-tab';
import { ServerSafetyTab } from './tabs/server-safety-tab/server-safety-tab';
import { ServerAuditLogTab } from './tabs/server-audit-log-tab/server-audit-log-tab';
import { ColorStudioModal } from './components/color-studio-modal/color-studio-modal';
import { ProfileStore } from '../profile/profile-store';
import { ManageAccountsModal } from '../profile/modals/manage-accounts-modal/manage-accounts-modal';
import { ProfileGamesService } from '../profile/profile-games.service';
import { GAME_KIND_LABELS, GAME_TAG_MAX, GAME_TITLE_MAX } from '../../../shared';

export interface NavItem {
  id: SettingsTab;
  label: string;
  icon: string;
  badge?: string;
  badgeType?: 'primary' | 'success' | 'new';
  subItems?: { label: string; actionId?: string }[];
}

export interface NavCategory {
  title?: string;
  items: NavItem[];
}

@Component({
  selector: 'app-settings-modal',
  imports: [
    FormsModule,
    MatIconModule,
    MatButtonModule,
    Avatar,
    PlatformLogo,
    AccountTab,
    AccountsTab,
    ProfileTab,
    PrivacyTab,
    AppearanceTab,
    VoiceVideoTab,
    NotificationsTab,
    KeybindsTab,
    LanguageTab,
    GamesTab,
    ActivityTab,
    ConnectionsTab,
    AccessibilityTab,
    TextImagesTab,
    DeveloperTab,
    ServerOverviewTab,
    ServerRolesTab,
    ServerMembersTab,
    ServerInvitesTab,
    ServerAccessTab,
    ServerSafetyTab,
    ServerAuditLogTab,
    ColorStudioModal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-modal.html',
  styleUrl: './settings-modal.css',
})
export class SettingsModal {
  protected readonly settingsService = inject(UserSettingsService);
  private readonly profileStore = inject(ProfileStore);
  /** Ảnh đại diện thật của chính mình — để phần xem trước khớp với mọi nơi khác. */
  protected readonly myAvatarUrl = computed(() => this.profileStore.profile()?.avatarUrl ?? null);
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly presenceService = inject(PresenceService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Thanh popup nhập tên tài khoản neo đáy khung (xem template) đọc state từ
   * đây. Đặt ở cấp modal chứ không bên trong `ConnectionsTab`: popup phải nổi
   * NGOÀI vùng cuộn riêng của từng tab, nếu không nó trôi theo danh mục nền
   * tảng và người dùng phải cuộn mới thấy ô vừa mở.
   */
  protected readonly apps = inject(ConnectedAppsService);

  /**
   * Ô nhập trò chơi cũng phải nổi ở CẤP MODAL như popup gắn nền tảng — nếu
   * render trong cột widget thì nó trôi theo vùng cuộn của tab.
   */
  protected readonly games = inject(ProfileGamesService);
  protected readonly kindLabels = GAME_KIND_LABELS;
  protected readonly gameTitleMax = GAME_TITLE_MAX;
  protected readonly gameTagMax = GAME_TAG_MAX;
  protected readonly tint = tint;
  protected readonly customLinkColor = CUSTOM_LINK_COLOR;
  protected readonly labelMax = LINK_LABEL_MAX;

  protected readonly mobileSidebarOpen = signal<boolean>(false);

  protected readonly userProfile = computed(() => this.profileService.current());
  protected readonly currentPresence = computed(() =>
    this.presenceService.resolvePresence(this.userProfile()?.id),
  );
  protected readonly displayName = computed(
    () => this.settingsService.editDisplayName() || this.userProfile()?.displayName || this.userProfile()?.username || 'Nghiện Khó Phai',
  );
  protected readonly username = computed(
    () => this.settingsService.editUsername() || this.userProfile()?.username || 'nghienkhophai',
  );

  protected readonly activeSubAction = signal<string | null>('account-info-heading');

  protected readonly userCategories: NavCategory[] = [
    {
      title: 'CÀI ĐẶT NGƯỜI DÙNG',
      items: [
        { id: 'account', label: 'Tài Khoản', icon: 'person' },
        { id: 'accounts', label: 'Chuyển Tài Khoản', icon: 'swap_horiz' },
        { id: 'profile', label: 'Hồ Sơ', icon: 'badge' },
        { id: 'connections', label: 'Ứng Dụng Đã Kết Nối', icon: 'link' },
        { id: 'notifications', label: 'Các Thông Báo', icon: 'notifications' },
      ],
    },
    {
      title: 'TRẢI NGHIỆM',
      items: [
        { id: 'voice-video', label: 'Giọng nói và Video', icon: 'mic' },
        { id: 'appearance', label: 'Hiển thị', icon: 'palette' },
        { id: 'text-images', label: 'Văn Bản & Hình Ảnh', icon: 'image' },
      ],
    },
  ];

  protected readonly serverCategories: NavCategory[] = [
    {
      title: 'MÁY CHỦ (SERVER)',
      items: [
        { id: 'server-overview', label: 'Hồ Sơ Máy Chủ', icon: 'badge' },
      ],
    },
    {
      title: 'MỌI NGƯỜI',
      items: [
        { id: 'server-members', label: 'Thành Viên', icon: 'people' },
        {
          id: 'server-roles',
          label: 'Vai Trò',
          icon: 'admin_panel_settings',
          badge: 'ADMIN',
        },
        { id: 'server-invites', label: 'Lời Mời', icon: 'link' },
        { id: 'server-access', label: 'Truy Cập', icon: 'door_sliding' },
      ],
    },
    {
      title: 'QUẢN TRỊ & BẢO MẬT',
      items: [
        { id: 'server-safety', label: 'Bảo Mật & Phê Duyệt', icon: 'gavel' },
      ],
    },
  ];

  protected readonly filteredServerCategories = computed<NavCategory[]>(() => {
    return this.serverCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => this.settingsService.hasPermissionForTab(item.id)),
      }))
      .filter((cat) => cat.items.length > 0);
  });

  protected readonly activeCategories = computed(() => {
    return this.settingsService.settingsMode() === 'server'
      ? this.filteredServerCategories()
      : this.userCategories;
  });

  protected readonly filteredCategories = computed(() => {
    const q = this.settingsService.searchQuery().trim().toLowerCase();
    const categories = this.activeCategories();
    if (!q) return categories;

    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.id.toLowerCase().includes(q) ||
            item.subItems?.some((sub) => sub.label.toLowerCase().includes(q)),
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  });

  protected readonly currentTabLabel = computed(() => {
    const tab = this.settingsService.currentTab();
    const all = [...this.userCategories, ...this.serverCategories];
    for (const cat of all) {
      const found = cat.items.find((item) => item.id === tab);
      if (found) return found.label;
    }
    return tab;
  });

  protected readonly previewRole = computed(() => {
    const pId = this.settingsService.previewRoleId();
    if (!pId) return null;
    return this.settingsService.serverRoles().find((r) => r.id === pId) || null;
  });

  protected exitPreviewRole(): void {
    this.settingsService.setPreviewRole(null);
  }

  private readonly dialog = inject(MatDialog);

  constructor() {
    if (typeof window !== 'undefined') {
      const onKeyDownCapture = (event: KeyboardEvent) => {
        if (this.settingsService.isOpen() && event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          this.close();
        }
      };
      window.addEventListener('keydown', onKeyDownCapture, { capture: true });
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('keydown', onKeyDownCapture, { capture: true });
      });
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.settingsService.isOpen()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      this.close();
    }
  }

  protected selectTab(tab: SettingsTab, actionId?: string): void {
    this.settingsService.setTab(tab);
    this.mobileSidebarOpen.set(false);

    if (actionId) {
      this.activeSubAction.set(actionId);
      setTimeout(() => {
        const el = document.getElementById(actionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    } else {
      const all = [...this.userCategories, ...this.serverCategories];
      let firstAction: string | null = null;
      for (const cat of all) {
        const found = cat.items.find((item) => item.id === tab);
        if (found) {
          if (found.subItems && found.subItems.length > 0) {
            firstAction = found.subItems[0].actionId || null;
          }
          break;
        }
      }
      this.activeSubAction.set(firstAction);
    }
  }

  protected switchMode(mode: 'user' | 'server'): void {
    if (mode === 'server') {
      if (!this.settingsService.canAccessServerSettings()) {
        return;
      }
      const available = this.filteredServerCategories();
      const firstTab = (available[0]?.items[0]?.id as SettingsTab) || 'server-overview';
      this.settingsService.openServerSettings(firstTab);
    } else {
      this.settingsService.openUserSettings('account');
    }
  }

  protected close(): void {
    this.settingsService.close();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  protected handleDeleteServer(): void {
    const sId = this.settingsService.currentServerId();
    const sData = this.settingsService.currentServerData();
    const serverName = sData.name || 'Máy chủ';

    const ref = this.dialog.open(DeleteServerDialog, {
      data: {
        serverId: sId,
        serverName: serverName,
      },
      panelClass: 'nexus-dialog-overlay',
      autoFocus: false,
    });

    ref.afterClosed().subscribe((deleted) => {
      if (deleted) {
        this.settingsService.close();
        void this.router.navigate(['/channels/@me']);
      }
    });
  }

  protected openManageAccountsModal(): void {
    this.dialog.open(ManageAccountsModal, {
      width: '480px',
      maxWidth: '95vw',
      panelClass: 'nexus-dialog-panel',
    });
  }

  protected async handleLogout(): Promise<void> {
    this.close();
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }
}

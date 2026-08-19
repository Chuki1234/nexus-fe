import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ShellData } from '../../../../core/api/shell-data';
import { SearchField } from '../../../../shared/ui/search-field/search-field';
import { UserPanel } from '../user-panel/user-panel';
import { ChannelList } from './components/channel-list';
import { ConversationList } from './components/conversation-list';
import { UserSettingsService, SettingsTab } from '../../../../features/settings/services/user-settings.service';

/**
 * Cột 2 — cái vỏ: tiêu đề trên (với nút Cài đặt máy chủ), khối người dùng dưới,
 * ở giữa là một trong hai danh sách.
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
  host: { class: 'flex h-full w-60 shrink-0 flex-col bg-surface' },
  styleUrl: './channel-sidebar.css',
  templateUrl: './channel-sidebar.html',
})
export class ChannelSidebar {
  private readonly shell = inject(ShellData);
  private readonly settingsService = inject(UserSettingsService);

  /** Rỗng = khu tin nhắn trực tiếp. */
  readonly serverId = input<string | null>(null);

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

  protected openServerSettings(tab: SettingsTab = 'server-overview'): void {
    const id = this.serverId() ?? 'itss';
    this.settingsService.openServerSettings(tab, id);
  }
}

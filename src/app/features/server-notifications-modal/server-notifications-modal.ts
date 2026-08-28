import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserSettingsService, ServerNotificationSettings, ChannelNotificationSettings } from '../settings/services/user-settings.service';
import { ServersStore } from '../../core/servers/servers.store';

@Component({
  selector: 'app-server-notifications-modal',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './server-notifications-modal.html',
  styleUrl: './server-notifications-modal.css',
})
export class ServerNotificationsModal {
  protected readonly settingsService = inject(UserSettingsService);
  protected readonly serversStore = inject(ServersStore);

  readonly serverId = input.required<string>();
  readonly close = output<void>();

  protected readonly channelSearch = signal<string>('');

  protected readonly serverData = computed(() => {
    const sId = this.serverId();
    const storeServer = this.serversStore.serverOf(sId);
    if (storeServer) {
      return {
        name: storeServer.name,
        initials: storeServer.name.slice(0, 2).toUpperCase(),
      };
    }
    return this.settingsService.serverDataMap()[sId] ?? { name: 'Máy chủ', initials: 'MC' };
  });

  protected readonly serverName = computed(() => this.serverData().name);

  protected readonly serverChannels = computed(() => {
    const sId = this.serverId();
    return this.serversStore.channelsOf(sId);
  });

  protected readonly filteredChannels = computed(() => {
    const q = this.channelSearch().trim().toLowerCase();
    const list = this.serverChannels();
    if (!q) return list;
    return list.filter((ch) => ch.name.toLowerCase().includes(q));
  });

  protected readonly currentSettings = computed<ServerNotificationSettings>(() => {
    const sId = this.serverId();
    return (
      this.settingsService.serverNotificationSettingsMap()[sId] ?? {
        isMuted: false,
        notificationLevel: 'all',
        suppressEveryoneHere: false,
        suppressRoleMentions: false,
        hideHighlights: false,
        muteNewEvents: false,
        mobilePushNotifications: true,
      }
    );
  });

  protected updateSetting<K extends keyof ServerNotificationSettings>(key: K, value: ServerNotificationSettings[K]): void {
    const sId = this.serverId();
    this.settingsService.updateServerNotificationSetting(sId, key, value);
  }

  protected toggleChannelMute(channelId: string): void {
    const isMuted = this.settingsService.isChannelMuted(channelId);
    this.settingsService.setChannelMuted(channelId, !isMuted);
  }

  protected setChannelLevel(channelId: string, level: string): void {
    const validLevel = (['default', 'all', 'mentions', 'nothing'].includes(level)
      ? level
      : 'default') as 'default' | 'all' | 'mentions' | 'nothing';
    this.settingsService.setChannelNotificationLevel(channelId, validLevel);
  }

  protected onClose(): void {
    this.close.emit();
  }
}

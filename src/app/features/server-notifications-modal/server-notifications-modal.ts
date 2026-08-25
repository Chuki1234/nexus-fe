import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserSettingsService, ServerNotificationSettings } from '../settings/services/user-settings.service';

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

  readonly serverId = input<string>('itss');
  readonly close = output<void>();

  protected readonly serverData = computed(() => {
    const sId = this.serverId();
    return this.settingsService.serverDataMap()[sId] ?? this.settingsService.serverDataMap()['itss'];
  });

  protected readonly serverName = computed(() => this.serverData().name);

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

  protected onClose(): void {
    this.close.emit();
  }
}

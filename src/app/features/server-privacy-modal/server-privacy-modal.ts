import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserSettingsService, ServerPrivacySettings } from '../settings/services/user-settings.service';
import { ServersStore } from '../../core/servers/servers.store';

@Component({
  selector: 'app-server-privacy-modal',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './server-privacy-modal.html',
  styleUrl: './server-privacy-modal.css',
})
export class ServerPrivacyModal {
  protected readonly settingsService = inject(UserSettingsService);
  protected readonly serversStore = inject(ServersStore);

  readonly serverId = input.required<string>();
  readonly close = output<void>();

  protected readonly toastMessage = signal<string | null>(null);

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

  protected readonly currentSettings = computed<ServerPrivacySettings>(() => {
    const sId = this.serverId();
    return this.settingsService.getServerPrivacySettings(sId);
  });

  protected updateSetting<K extends keyof ServerPrivacySettings>(
    key: K,
    value: ServerPrivacySettings[K],
  ): void {
    const sId = this.serverId();
    this.settingsService.updateServerPrivacySetting(sId, key, value);
  }

  protected applyToAllServers(): void {
    const sId = this.serverId();
    this.settingsService.applyPrivacyToAllServers(sId);
    this.showToast('Đã áp dụng cài đặt bảo mật này cho tất cả máy chủ hiện tại!');
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }

  protected onClose(): void {
    this.close.emit();
  }
}

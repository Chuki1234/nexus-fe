import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { UserSettingsService } from '../../services/user-settings.service';
import { ShellData } from '../../../../core/api/shell-data';

@Component({
  selector: 'app-server-overview-tab',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './server-overview-tab.html',
  styleUrl: './server-overview-tab.css',
})
export class ServerOverviewTab {
  protected readonly settingsService = inject(UserSettingsService);
  private readonly shellData = inject(ShellData);

  protected readonly serverData = this.settingsService.currentServerData;
  protected readonly serverName = computed(() => this.serverData().name);
  protected readonly serverDescription = computed(() => this.serverData().description);
  protected readonly initials = computed(() => this.serverData().initials);
  protected readonly systemChannel = computed(() => this.serverData().systemChannelId);
  protected readonly sendWelcomeMessage = computed(() => this.serverData().sendWelcomeMessage);

  protected readonly availableChannels = computed(() => {
    const sId = this.settingsService.currentServerId();
    return this.shellData.channelsOf(sId);
  });

  protected readonly savedNotice = signal<boolean>(false);

  protected updateName(name: string): void {
    this.settingsService.updateCurrentServerOverview({ name });
  }

  protected updateDescription(description: string): void {
    this.settingsService.updateCurrentServerOverview({ description });
  }

  protected updateSystemChannel(systemChannelId: string): void {
    this.settingsService.updateCurrentServerOverview({ systemChannelId });
  }

  protected toggleWelcomeMessage(): void {
    this.settingsService.updateCurrentServerOverview({
      sendWelcomeMessage: !this.serverData().sendWelcomeMessage,
    });
  }

  protected saveServerOverview(): void {
    this.savedNotice.set(true);
    setTimeout(() => this.savedNotice.set(false), 2500);
  }
}

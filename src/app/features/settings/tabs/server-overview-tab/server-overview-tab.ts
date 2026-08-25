import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserSettingsService } from '../../services/user-settings.service';
import { ShellData } from '../../../../core/api/shell-data';

@Component({
  selector: 'app-server-overview-tab',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatTooltipModule],
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
  protected readonly serverIcon = computed(() => this.serverData().iconUrl ?? null);
  protected readonly bannerColor = computed(
    () => this.serverData().bannerColor || 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
  );
  protected readonly tags = computed(
    () => this.serverData().tags || ['🎮 Gaming', '💻 Công nghệ', '🎓 Học tập', '💬 Giao lưu', '🚀 Sáng tạo'],
  );
  protected readonly systemChannel = computed(() => this.serverData().systemChannelId);
  protected readonly sendWelcomeMessage = computed(() => this.serverData().sendWelcomeMessage);

  protected readonly availableChannels = computed(() => {
    const sId = this.settingsService.currentServerId();
    return this.shellData.channelsOf(sId);
  });

  protected readonly savedNotice = signal<boolean>(false);

  protected readonly bannerPresets = [
    { label: 'Deep Slate', gradient: 'linear-gradient(135deg, #374151 0%, #111827 100%)' },
    { label: 'Hot Pink', gradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)' },
    { label: 'Crimson Flame', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
    { label: 'Amber Sunset', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' },
    { label: 'Golden Sun', gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' },
    { label: 'Royal Violet', gradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)' },
    { label: 'Sky Cyan', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' },
    { label: 'Mint Aqua', gradient: 'linear-gradient(135deg, #06b6d4 0%, #14b8a6 100%)' },
    { label: 'Forest Emerald', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
    { label: 'Obsidian Noir', gradient: 'linear-gradient(135deg, #1f2937 0%, #030712 100%)' },
  ];

  protected readonly serverIconPresets = [
    { label: 'Cyber Tech', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=ITSSLab' },
    { label: 'Code Dev', url: 'https://api.dicebear.com/7.x/identicon/svg?seed=NexusCode' },
    { label: 'Gaming Shield', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=GamingServer' },
    { label: 'Galaxy Lab', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=GalaxyLab' },
    { label: 'Anime Hub', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AnimeServer' },
  ];

  protected updateName(name: string): void {
    this.settingsService.updateCurrentServerOverview({ name });
  }

  protected updateDescription(description: string): void {
    this.settingsService.updateCurrentServerOverview({ description });
  }

  protected setBannerColor(gradient: string): void {
    this.settingsService.updateCurrentServerOverview({ bannerColor: gradient });
  }

  protected updateTag(index: number, val: string): void {
    const current = [...this.tags()];
    current[index] = val;
    this.settingsService.updateCurrentServerOverview({ tags: current });
  }

  protected updateSystemChannel(systemChannelId: string): void {
    this.settingsService.updateCurrentServerOverview({ systemChannelId });
  }

  protected toggleWelcomeMessage(): void {
    this.settingsService.updateCurrentServerOverview({
      sendWelcomeMessage: !this.serverData().sendWelcomeMessage,
    });
  }

  protected onServerIconSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.settingsService.updateCurrentServerOverview({ iconUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  }

  protected selectPresetIcon(url: string): void {
    this.settingsService.updateCurrentServerOverview({ iconUrl: url });
  }

  protected removeServerIcon(): void {
    this.settingsService.updateCurrentServerOverview({ iconUrl: null });
  }

  protected saveServerOverview(): void {
    this.savedNotice.set(true);
    setTimeout(() => this.savedNotice.set(false), 2500);
  }
}

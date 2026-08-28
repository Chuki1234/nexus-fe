import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserSettingsService } from '../../services/user-settings.service';
import { ServersStore } from '../../../../core/servers/servers.store';
import { ServersApiService } from '../../../../core/api/servers-api.service';

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
  private readonly serversStore = inject(ServersStore);
  private readonly serversApi = inject(ServersApiService);

  protected readonly serverData = this.settingsService.currentServerData;
  protected readonly serverName = computed(() => this.serverData().name);
  protected readonly serverDescription = computed(() => this.serverData().description);
  protected readonly initials = computed(() => this.serverData().initials);
  /**
   * Ảnh XEM TRƯỚC cục bộ (ObjectURL của file vừa chọn). Phải ưu tiên hơn giá trị
   * từ store: `currentServerData` luôn override `iconUrl` bằng giá trị của server
   * thật (thường là null khi chưa có icon), nên nếu chỉ đọc `serverData().iconUrl`
   * thì file mới chọn không bao giờ hiện ra ở live preview.
   */
  private readonly pendingIconPreview = signal<string | null>(null);
  protected readonly serverIcon = computed(
    () => this.pendingIconPreview() ?? this.serverData().iconUrl ?? null,
  );
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
    return this.serversStore.channelsOf(sId);
  });

  protected readonly savedNotice = signal<boolean>(false);
  protected readonly isSaving = signal<boolean>(false);
  protected readonly saveError = signal<string | null>(null);
  private pendingIconFile = signal<File | null>(null);

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

    // Lưu file gốc để upload khi save; hiện preview qua ObjectURL cục bộ.
    this.pendingIconFile.set(file);
    this.revokePendingPreview();
    this.pendingIconPreview.set(URL.createObjectURL(file));
    // Cho phép chọn lại cùng một file lần nữa (input file không tự bắn change nếu
    // value không đổi).
    input.value = '';
  }

  protected removeServerIcon(): void {
    this.pendingIconFile.set(null);
    this.revokePendingPreview();
    this.pendingIconPreview.set(null);
    this.settingsService.updateCurrentServerOverview({ iconUrl: null });
  }

  private revokePendingPreview(): void {
    const prev = this.pendingIconPreview();
    if (prev?.startsWith('blob:')) {
      URL.revokeObjectURL(prev);
    }
  }

  protected async saveServerOverview(): Promise<void> {
    const sId = this.settingsService.currentServerId();
    const data = this.serverData();
    this.isSaving.set(true);
    this.saveError.set(null);

    try {
      let finalIconUrl = data.iconUrl;

      // 1. Upload icon trước (nếu người dùng chọn file mới)
      const iconFile = this.pendingIconFile();
      if (iconFile) {
        const iconRes = await this.serversApi.uploadServerIcon(sId, iconFile);
        finalIconUrl = iconRes.iconUrl;
        this.settingsService.updateCurrentServerOverview({ iconUrl: finalIconUrl });
        this.pendingIconFile.set(null);
        this.revokePendingPreview();
        this.pendingIconPreview.set(null);
      }

      // 2. Lưu tên và iconUrl (hỗ trợ cả gỡ icon khi finalIconUrl = null)
      const res = await this.serversApi.updateServer(sId, {
        name: data.name,
        iconUrl: finalIconUrl,
      });

      this.serversStore.patchServer(sId, { name: res.name, iconUrl: res.iconUrl });

      this.savedNotice.set(true);
      setTimeout(() => this.savedNotice.set(false), 2500);
    } catch (err: any) {
      this.saveError.set(err?.error?.message || err?.message || 'Không thể lưu hồ sơ máy chủ');
    } finally {
      this.isSaving.set(false);
    }
  }
}

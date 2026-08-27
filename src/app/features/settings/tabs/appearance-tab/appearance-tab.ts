import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserSettingsService, AppPreferences } from '../../services/user-settings.service';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { ProfileStore } from '../../../profile/profile-store';

@Component({
  selector: 'app-appearance-tab',
  standalone: true,
  imports: [FormsModule, Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './appearance-tab.html',
  styleUrl: './appearance-tab.css',
})
export class AppearanceTab {
  protected readonly settingsService = inject(UserSettingsService);
  private readonly profileStore = inject(ProfileStore);
  /** Ảnh đại diện thật của chính mình — để phần xem trước khớp với mọi nơi khác. */
  protected readonly myAvatarUrl = computed(() => this.profileStore.profile()?.avatarUrl ?? null);

  // Danh sách màu cơ bản nhanh hiển thị ngoài Settings
  protected readonly quickAccents = [
    { label: 'Nexus Mint', hex: '#00ed64' },
    { label: 'Discord Blurple', hex: '#5865f2' },
    { label: 'Cyber Cyan', hex: '#06b6d4' },
    { label: 'Royal Sapphire', hex: '#2563eb' },
    { label: 'Cosmic Iris', hex: '#8b5cf6' },
    { label: 'Sakura Rose', hex: '#fb7185' },
    { label: 'Champagne Gold', hex: '#eab308' },
    { label: 'Sunset Coral', hex: '#f97316' },
  ];

  protected setTheme(theme: AppPreferences['theme']): void {
    this.settingsService.updatePreference('theme', theme);
  }

  protected setAccent(hex: string): void {
    this.settingsService.updatePreference('themeAccent', hex);
  }

  protected openStudio(): void {
    this.settingsService.openColorStudio();
  }

  protected setMessageDensity(density: AppPreferences['messageDensity']): void {
    this.settingsService.updatePreference('messageDensity', density);
  }

  protected setFontSize(size: number): void {
    this.settingsService.updatePreference('fontSize', Number(size));
  }

  protected setMessageSpacing(spacing: number): void {
    this.settingsService.updatePreference('messageSpacing', Number(spacing));
  }

  protected toggleReducedMotion(checked: boolean): void {
    this.settingsService.updatePreference('reducedMotion', checked);
  }

  protected toggleHighContrast(checked: boolean): void {
    this.settingsService.updatePreference('highContrast', checked);
  }
}

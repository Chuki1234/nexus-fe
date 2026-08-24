import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserSettingsService, AppPreferences } from '../../services/user-settings.service';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { ProfileStore } from '../../../profile/profile-store';

@Component({
  selector: 'app-appearance-tab',
  imports: [FormsModule, MatIconModule, MatSlideToggleModule, MatTooltipModule, Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './appearance-tab.html',
  styleUrl: './appearance-tab.css',
})
export class AppearanceTab {
  protected readonly settingsService = inject(UserSettingsService);
  private readonly profileStore = inject(ProfileStore);
  /** Ảnh đại diện thật của chính mình — để phần xem trước khớp với mọi nơi khác. */
  protected readonly myAvatarUrl = computed(() => this.profileStore.profile()?.avatarUrl ?? null);

  protected readonly accentPresets = [
    { label: 'Neon Mint', hex: '#00ed64' },
    { label: 'Sapphire Blue', hex: '#3d4f9f' },
    { label: 'Lavender Purple', hex: '#7b3ff2' },
    { label: 'Solar Orange', hex: '#fa6e39' },
    { label: 'Rose Pink', hex: '#f06bb8' },
  ];

  protected readonly zoomLevels = [80, 90, 100, 110, 125];

  protected setTheme(theme: AppPreferences['theme']): void {
    this.settingsService.updatePreference('theme', theme);
  }

  protected setAccent(hex: string): void {
    this.settingsService.updatePreference('themeAccent', hex);
  }

  protected setMessageDensity(density: AppPreferences['messageDensity']): void {
    this.settingsService.updatePreference('messageDensity', density);
  }

  protected setFontSize(size: number): void {
    this.settingsService.updatePreference('fontSize', size);
  }

  protected setMessageSpacing(spacing: number): void {
    this.settingsService.updatePreference('messageSpacing', spacing);
  }

  protected setZoomLevel(zoom: number): void {
    this.settingsService.updatePreference('zoomLevel', zoom);
  }

  protected toggleReducedMotion(checked: boolean): void {
    this.settingsService.updatePreference('reducedMotion', checked);
  }

  protected toggleHighContrast(checked: boolean): void {
    this.settingsService.updatePreference('highContrast', checked);
  }
}

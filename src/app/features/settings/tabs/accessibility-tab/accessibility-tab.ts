import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserSettingsService, AppPreferences } from '../../services/user-settings.service';

@Component({
  selector: 'app-accessibility-tab',
  imports: [FormsModule, MatIconModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './accessibility-tab.html',
  styleUrl: './accessibility-tab.css',
})
export class AccessibilityTab {
  protected readonly settingsService = inject(UserSettingsService);

  protected toggleHighContrast(checked: boolean): void {
    this.settingsService.updatePreference('highContrast', checked);
  }

  protected toggleReducedMotion(checked: boolean): void {
    this.settingsService.updatePreference('reducedMotion', checked);
  }

  protected toggleHoverGifs(checked: boolean): void {
    this.settingsService.updatePreference('playGifsHoverOnly', checked);
  }

  protected toggleAnimatedEmojis(checked: boolean): void {
    this.settingsService.updatePreference('autoPlayAnimatedEmojis', checked);
  }

  protected toggleReadingRuler(checked: boolean): void {
    this.settingsService.updatePreference('readingRuler', checked);
  }

  protected setRoleColorPlacement(placement: AppPreferences['roleColorPlacement']): void {
    this.settingsService.updatePreference('roleColorPlacement', placement);
  }

  protected setTtsVolume(vol: number): void {
    this.settingsService.updatePreference('ttsVolume', vol);
  }

  protected setTtsSpeed(speed: number): void {
    this.settingsService.updatePreference('ttsSpeed', speed);
  }
}

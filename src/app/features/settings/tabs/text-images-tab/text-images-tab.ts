import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserSettingsService, AppPreferences } from '../../services/user-settings.service';

@Component({
  selector: 'app-text-images-tab',
  imports: [FormsModule, MatIconModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './text-images-tab.html',
  styleUrl: './text-images-tab.css',
})
export class TextImagesTab {
  protected readonly settingsService = inject(UserSettingsService);

  protected toggleMediaInline(checked: boolean): void {
    this.settingsService.updatePreference('displayMediaInline', checked);
  }

  protected toggleSensitiveMediaBlur(checked: boolean): void {
    this.settingsService.updatePreference('blurSensitiveMedia', checked);
  }

  protected toggleLinkPreviews(checked: boolean): void {
    this.settingsService.updatePreference('displayLinkPreviews', checked);
  }

  protected toggleConvertEmoticons(checked: boolean): void {
    this.settingsService.updatePreference('convertEmoticons', checked);
  }

  protected toggleSuggestStickers(checked: boolean): void {
    this.settingsService.updatePreference('suggestStickers', checked);
  }

  protected toggleCodeHighlighting(checked: boolean): void {
    this.settingsService.updatePreference('codeHighlighting', checked);
  }

  protected setShowSpoilers(mode: AppPreferences['showSpoilers']): void {
    this.settingsService.updatePreference('showSpoilers', mode);
  }
}

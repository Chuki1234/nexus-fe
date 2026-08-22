import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserSettingsService } from '../../services/user-settings.service';

@Component({
  selector: 'app-privacy-tab',
  imports: [MatIconModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './privacy-tab.html',
  styleUrl: './privacy-tab.css',
})
export class PrivacyTab {
  protected readonly settingsService = inject(UserSettingsService);

  protected setSafeDirectMessages(mode: 'all' | 'strangers' | 'disabled'): void {
    this.settingsService.updatePreference('safeDirectMessages', mode);
  }

  protected toggleFilterSpamDMs(checked: boolean): void {
    this.settingsService.updatePreference('filterSpamDMs', checked);
  }

  protected toggleAllowServerDMs(checked: boolean): void {
    this.settingsService.updatePreference('allowDirectMessagesFromServer', checked);
  }

  protected toggleDataTelemetry(checked: boolean): void {
    this.settingsService.updatePreference('dataTelemetry', checked);
  }

  protected toggleDataPersonalization(checked: boolean): void {
    this.settingsService.updatePreference('dataPersonalization', checked);
  }

  protected toggleDataImprovement(checked: boolean): void {
    this.settingsService.updatePreference('dataImprovement', checked);
  }

  protected toggleDataActivitySponsored(checked: boolean): void {
    this.settingsService.updatePreference('dataActivitySponsored', checked);
  }

  protected toggleDataThirdPartySponsored(checked: boolean): void {
    this.settingsService.updatePreference('dataThirdPartySponsored', checked);
  }

  protected toggleVoiceClipRecording(checked: boolean): void {
    this.settingsService.updatePreference('voiceClipRecording', checked);
  }
}

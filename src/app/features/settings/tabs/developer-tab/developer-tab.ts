import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserSettingsService } from '../../services/user-settings.service';

@Component({
  selector: 'app-developer-tab',
  imports: [MatIconModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './developer-tab.html',
  styleUrl: './developer-tab.css',
})
export class DeveloperTab {
  protected readonly settingsService = inject(UserSettingsService);
  protected readonly cacheClearedNotice = signal<boolean>(false);

  protected toggleDeveloperMode(checked: boolean): void {
    this.settingsService.updatePreference('developerMode', checked);
  }

  protected toggleHardwareAcceleration(checked: boolean): void {
    this.settingsService.updatePreference('hardwareAcceleration', checked);
  }

  protected togglePerformanceOverlay(checked: boolean): void {
    this.settingsService.updatePreference('performanceOverlay', checked);
  }

  protected toggleOpenOnStartup(checked: boolean): void {
    this.settingsService.updatePreference('openOnStartup', checked);
  }

  protected toggleMinimizeToTray(checked: boolean): void {
    this.settingsService.updatePreference('minimizeToTray', checked);
  }

  protected clearCache(): void {
    this.cacheClearedNotice.set(true);
    setTimeout(() => {
      this.cacheClearedNotice.set(false);
    }, 3000);
  }
}

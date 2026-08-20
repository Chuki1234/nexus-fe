import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserSettingsService, AppPreferences } from '../../services/user-settings.service';

@Component({
  selector: 'app-activity-tab',
  imports: [FormsModule, MatIconModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-tab.html',
  styleUrl: './activity-tab.css',
})
export class ActivityTab {
  protected readonly settingsService = inject(UserSettingsService);

  protected toggleShowActivity(checked: boolean): void {
    this.settingsService.updatePreference('showActivityStatus', checked);
  }

  protected toggleAllowFriendsJoin(checked: boolean): void {
    this.settingsService.updatePreference('allowFriendsJoinGame', checked);
  }

  protected toggleGameOverlay(checked: boolean): void {
    this.settingsService.updatePreference('gameOverlay', checked);
  }

  protected setOverlayPosition(pos: AppPreferences['overlayPosition']): void {
    this.settingsService.updatePreference('overlayPosition', pos);
  }

  protected setAvatarSize(size: AppPreferences['overlayAvatarSize']): void {
    this.settingsService.updatePreference('overlayAvatarSize', size);
  }
}

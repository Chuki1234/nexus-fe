import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserSettingsService } from '../../services/user-settings.service';

@Component({
  selector: 'app-notifications-tab',
  imports: [FormsModule, MatIconModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notifications-tab.html',
  styleUrl: './notifications-tab.css',
})
export class NotificationsTab {
  protected readonly settingsService = inject(UserSettingsService);

  protected readonly afkOptions = [
    { value: 1, label: '1 phút' },
    { value: 5, label: '5 phút' },
    { value: 10, label: '10 phút (Khuyên dùng)' },
    { value: 15, label: '15 phút' },
    { value: 30, label: '30 phút' },
  ];

  protected toggleDesktop(checked: boolean): void {
    this.settingsService.updatePreference('desktopNotifications', checked);
    if (checked && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }

  protected toggleUnreadBadge(checked: boolean): void {
    this.settingsService.updatePreference('unreadBadge', checked);
  }

  protected setAfkTimeout(minutes: number): void {
    this.settingsService.updatePreference('afkTimeout', Number(minutes));
  }

  protected toggleSound(key: 'soundMessage' | 'soundMention' | 'soundJoin' | 'soundLeave' | 'soundMute' | 'soundDeafen' | 'soundRing' | 'soundPtt', checked: boolean): void {
    this.settingsService.updatePreference(key, checked);
  }

  protected toggleEmailDigest(checked: boolean): void {
    this.settingsService.updatePreference('emailDigest', checked);
  }

  protected toggleEmailNews(checked: boolean): void {
    this.settingsService.updatePreference('emailNews', checked);
  }
}

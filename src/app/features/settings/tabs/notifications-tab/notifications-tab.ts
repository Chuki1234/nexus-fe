import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserSettingsService } from '../../services/user-settings.service';
import { NotificationService } from '../../../../core/notification/notification.service';

@Component({
  selector: 'app-notifications-tab',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notifications-tab.html',
  styleUrl: './notifications-tab.css',
})
export class NotificationsTab {
  protected readonly settingsService = inject(UserSettingsService);
  protected readonly notificationService = inject(NotificationService);

  protected readonly toastMessage = signal<string | null>(null);

  protected readonly afkOptions = [
    { value: 1, label: '1 phút' },
    { value: 5, label: '5 phút' },
    { value: 10, label: '10 phút (Khuyên dùng)' },
    { value: 15, label: '15 phút' },
    { value: 30, label: '30 phút' },
  ];

  protected toggleDesktop(checked: boolean): void {
    this.settingsService.updatePreference('desktopNotifications', checked);
    if (checked && typeof Notification !== 'undefined') {
      if (Notification.permission !== 'granted') {
        Notification.requestPermission();
      }
      this.showToast('Đã bật thông báo trên màn hình Desktop.');
    } else {
      this.showToast('Đã tắt thông báo Desktop.');
    }
  }

  protected toggleUnreadBadge(checked: boolean): void {
    this.settingsService.updatePreference('unreadBadge', checked);
    this.showToast(checked ? 'Đã bật huy hiệu tin nhắn trên Taskbar.' : 'Đã tắt huy hiệu tin nhắn.');
  }

  protected setAfkTimeout(minutes: number): void {
    this.settingsService.updatePreference('afkTimeout', Number(minutes));
    this.showToast(`Đã thiết lập thời gian chờ AFK: ${minutes} phút.`);
  }

  protected toggleSound(key: 'soundMessage' | 'soundMention' | 'soundJoin' | 'soundLeave' | 'soundMute' | 'soundDeafen' | 'soundRing' | 'soundPtt', checked: boolean): void {
    this.settingsService.updatePreference(key, checked);
    if (checked) {
      this.playSoundPreview(key);
    }
  }

  protected playSoundPreview(key: 'soundMessage' | 'soundMention' | 'soundJoin' | 'soundLeave' | 'soundMute' | 'soundDeafen' | 'soundRing' | 'soundPtt'): void {
    switch (key) {
      case 'soundMessage':
        this.notificationService.playMessageSound();
        break;
      case 'soundMention':
        this.notificationService.playMentionSound();
        break;
      case 'soundJoin':
        this.notificationService.playJoinSound();
        break;
      case 'soundLeave':
        this.notificationService.playLeaveSound();
        break;
      case 'soundMute':
        this.notificationService.playMuteSound(true);
        break;
      case 'soundDeafen':
        this.notificationService.playDeafenSound(true);
        break;
      case 'soundRing':
        this.notificationService.playRingSound();
        break;
    }
  }

  protected toggleEmailDigest(checked: boolean): void {
    this.settingsService.updatePreference('emailDigest', checked);
    this.showToast(checked ? 'Đã bật email tổng hợp tin nhắn nhỡ.' : 'Đã tắt email tổng hợp tin nhắn nhỡ.');
  }

  protected toggleEmailNews(checked: boolean): void {
    this.settingsService.updatePreference('emailNews', checked);
    this.showToast(checked ? 'Đã bật email tin tức & cập nhật tính năng.' : 'Đã tắt email tin tức.');
  }

  // ══ THỬ NGHIỆM THÔNG BÁO POPUP (Ảnh 1 & 2) ══
  protected sendTestMessageNotification(): void {
    this.notificationService.show({
      senderName: 'Phan Thế Mon',
      contextTag: 'ITSS Lab # đồ-án',
      content: 'Hôm nay nhóm mình họp lúc mấy giờ nhỉ mọi người ơi?',
      senderAvatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=mon',
      routeUrl: ['/channels', 'itss', 'do-an'],
      type: 'message',
    });
    this.showToast('Đã gửi thông báo popup thử nghiệm ở góc dưới màn hình!');
  }

  protected sendTestMentionNotification(): void {
    this.notificationService.show({
      senderName: 'Chon Lu',
      contextTag: 'Tin nhắn trực tiếp',
      content: '@Nghiện Khó Phai Ơi check đồ án tốt nghiệp Nexus trên Figma nhé!',
      senderAvatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=chon',
      routeUrl: ['/channels/@me', 'c2'],
      type: 'mention',
    });
    this.showToast('Đã gửi thông báo @mention thử nghiệm!');
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3000);
  }
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserSettingsService } from '../../services/user-settings.service';

@Component({
  selector: 'app-privacy-tab',
  standalone: true,
  imports: [MatIconModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './privacy-tab.html',
  styleUrl: './privacy-tab.css',
})
export class PrivacyTab {
  protected readonly settingsService = inject(UserSettingsService);

  protected readonly toastMessage = signal<string | null>(null);
  protected readonly infoModal = signal<{ title: string; content: string } | null>(null);
  protected readonly isRequestingData = signal<boolean>(false);
  protected readonly dataRequested = signal<boolean>(false);

  protected setSafeDirectMessages(mode: 'all' | 'strangers' | 'disabled'): void {
    this.settingsService.updatePreference('safeDirectMessages', mode);
    this.showToast('Đã cập nhật chế độ quét tin nhắn trực tiếp an toàn.');
  }

  protected toggleFilterSpamDMs(checked: boolean): void {
    this.settingsService.updatePreference('filterSpamDMs', checked);
    this.showToast(checked ? 'Đã bật lọc tin nhắn rác tự động.' : 'Đã tắt lọc tin nhắn rác.');
  }

  protected toggleAllowServerDMs(checked: boolean): void {
    this.settingsService.updatePreference('allowDirectMessagesFromServer', checked);
    this.showToast(checked ? 'Đã cho phép nhận tin nhắn từ thành viên cùng máy chủ.' : 'Đã chặn tin nhắn từ thành viên cùng máy chủ.');
  }

  protected toggleDataTelemetry(checked: boolean): void {
    this.settingsService.updatePreference('dataTelemetry', checked);
    this.showToast(checked ? 'Đã bật thu thập dữ liệu đo lường.' : 'Đã tắt thu thập dữ liệu đo lường.');
  }

  protected toggleDataPersonalization(checked: boolean): void {
    this.settingsService.updatePreference('dataPersonalization', checked);
    this.showToast(checked ? 'Đã bật cá nhân hóa trải nghiệm Nexus.' : 'Đã tắt cá nhân hóa trải nghiệm Nexus.');
  }

  protected toggleDataImprovement(checked: boolean): void {
    this.settingsService.updatePreference('dataImprovement', checked);
    this.showToast(checked ? 'Đã bật chia sẻ dữ liệu để cải thiện Nexus.' : 'Đã tắt chia sẻ dữ liệu cải thiện Nexus.');
  }

  protected toggleDataActivitySponsored(checked: boolean): void {
    this.settingsService.updatePreference('dataActivitySponsored', checked);
    this.showToast(checked ? 'Đã bật cá nhân hóa nội dung tài trợ từ hoạt động.' : 'Đã tắt cá nhân hóa nội dung tài trợ từ hoạt động.');
  }

  protected toggleDataThirdPartySponsored(checked: boolean): void {
    this.settingsService.updatePreference('dataThirdPartySponsored', checked);
    this.showToast(checked ? 'Đã bật cá nhân hóa nội dung từ dữ liệu bên thứ ba.' : 'Đã tắt cá nhân hóa nội dung từ bên thứ ba.');
  }

  protected toggleVoiceClipRecording(checked: boolean): void {
    this.settingsService.updatePreference('voiceClipRecording', checked);
    this.showToast(checked ? 'Đã cho phép ghi âm giọng nói trong Clip.' : 'Đã tắt ghi âm giọng nói trong Clip.');
  }

  protected openInfo(type: 'improvement' | 'personalization' | 'thirdparty' | 'clips'): void {
    switch (type) {
      case 'improvement':
        this.infoModal.set({
          title: 'Sử dụng dữ liệu để cải thiện Nexus',
          content: 'Chúng tôi sử dụng dữ liệu hiệu năng ứng dụng, báo cáo sự cố và tương tác tính năng để sửa lỗi, tối ưu tốc độ truyền tải âm thanh/video và nâng cao chất lượng cuộc gọi thời gian thực.',
        });
        break;
      case 'personalization':
        this.infoModal.set({
          title: 'Cá nhân hóa trải nghiệm Nexus',
          content: 'Dựa trên máy chủ bạn tham gia và bạn bè bạn thường xuyên tương tác, Nexus sẽ gợi ý các kênh thịnh hành, biểu tượng cảm xúc và hoạt động chơi game phù hợp nhất với sở thích của bạn.',
        });
        break;
      case 'thirdparty':
        this.infoModal.set({
          title: 'Dữ liệu bên thứ ba & Nội dung tài trợ',
          content: 'Nexus hợp tác với các nhà phát triển game và đối tác giải trí để mang lại các sự kiện có phần thưởng (Quests). Thông tin của bạn được ẩn danh hoàn toàn và không bao giờ được bán cho bên thứ ba.',
        });
        break;
      case 'clips':
        this.infoModal.set({
          title: 'Ghi âm Clip giọng nói trong kênh thoại',
          content: 'Khi tính năng Clip được bật, bạn bè trong phòng thoại có thể lưu lại 30 giây khoảnh khắc chơi game đáng nhớ nhất. Nếu bạn tắt cài đặt này, giọng nói của bạn sẽ tự động được tắt tiếng trong tất cả các Clip được ghi lại.',
        });
        break;
    }
  }

  protected closeInfo(): void {
    this.infoModal.set(null);
  }

  protected requestDataPackage(): void {
    this.isRequestingData.set(true);
    setTimeout(() => {
      this.isRequestingData.set(false);
      this.dataRequested.set(true);
      this.showToast('Yêu cầu gói dữ liệu thành công! Bản sao lưu sẽ được gửi về email của bạn trong vòng 24h.');
    }, 1500);
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3000);
  }
}

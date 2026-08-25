import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserSettingsService, ServerAccessSettings } from '../../services/user-settings.service';

@Component({
  selector: 'app-server-access-tab',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatSlideToggleModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './server-access-tab.html',
  styleUrl: './server-access-tab.css',
})
export class ServerAccessTab {
  protected readonly settingsService = inject(UserSettingsService);

  protected readonly serverData = this.settingsService.currentServerData;
  protected readonly accessSettings = computed<ServerAccessSettings>(() => {
    return (
      this.serverData().accessSettings || {
        joinMode: 'invite-only',
        ageRestricted: false,
        rulesAgreement: true,
        rulesList: [
          '1. Hãy tôn trọng các thành viên khác và luôn giữ thái độ hòa nhã, lịch sự.',
          '2. Không gửi tin nhắn rác, spam, hoặc phát tán liên kết độc hại, quảng cáo trái phép.',
          '3. Giữ thảo luận đúng chủ đề của từng kênh và tuân thủ nguyên tắc cộng đồng.',
        ],
      }
    );
  });

  protected readonly newRuleText = signal<string>('');
  protected readonly isAddingRule = signal<boolean>(false);
  protected readonly toastMessage = signal<string | null>(null);

  protected setJoinMode(mode: 'invite-only' | 'apply' | 'discoverable'): void {
    this.settingsService.updateServerAccessSettings({ joinMode: mode });
    this.showToast('Đã cập nhật phương thức tham gia máy chủ.');
  }

  protected toggleAgeRestriction(): void {
    const current = this.accessSettings().ageRestricted;
    this.settingsService.updateServerAccessSettings({ ageRestricted: !current });
    this.showToast(!current ? 'Đã bật giới hạn độ tuổi máy chủ' : 'Đã tắt giới hạn độ tuổi máy chủ');
  }

  protected toggleRulesAgreement(): void {
    const current = this.accessSettings().rulesAgreement;
    this.settingsService.updateServerAccessSettings({ rulesAgreement: !current });
    this.showToast(!current ? 'Đã bật yêu cầu đồng ý quy định máy chủ' : 'Đã tắt quy định máy chủ');
  }

  protected addRule(): void {
    const text = this.newRuleText().trim();
    if (text) {
      this.settingsService.addServerRule(text);
      this.newRuleText.set('');
      this.isAddingRule.set(false);
      this.showToast('Đã thêm quy định mới.');
    }
  }

  protected deleteRule(index: number): void {
    this.settingsService.deleteServerRule(index);
    this.showToast('Đã xóa quy định.');
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 2500);
  }
}

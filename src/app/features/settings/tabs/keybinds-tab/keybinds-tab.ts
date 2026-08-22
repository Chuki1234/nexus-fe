import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserSettingsService } from '../../services/user-settings.service';

interface KeybindItem {
  action: string;
  keys: string[];
  description: string;
  category: 'Điều hướng' | 'Đàm thoại' | 'Trò chuyện' | 'Hệ thống';
}

@Component({
  selector: 'app-keybinds-tab',
  imports: [MatIconModule, MatButtonModule, MatSlideToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './keybinds-tab.html',
  styleUrl: './keybinds-tab.css',
})
export class KeybindsTab {
  protected readonly settingsService = inject(UserSettingsService);
  protected readonly isAddingCustom = signal<boolean>(false);

  protected readonly defaultKeybinds: KeybindItem[] = [
    {
      action: 'Tìm kiếm nhanh (Quick Switcher)',
      keys: ['Ctrl', 'K'],
      description: 'Mở bảng tìm kiếm kênh, máy chủ và bạn bè nhanh chóng',
      category: 'Điều hướng',
    },
    {
      action: 'Bật / Tắt micrô (Toggle Mute)',
      keys: ['Ctrl', 'Shift', 'M'],
      description: 'Bật hoặc tắt microphone từ bất kỳ đâu trong ứng dụng',
      category: 'Đàm thoại',
    },
    {
      action: 'Tắt tiếng tai nghe (Toggle Deafen)',
      keys: ['Ctrl', 'Shift', 'D'],
      description: 'Tắt toàn bộ âm thanh đầu ra và micrô cùng lúc',
      category: 'Đàm thoại',
    },
    {
      action: 'Mở Cài đặt người dùng',
      keys: ['Ctrl', ','],
      description: 'Mở nhanh bảng điều khiển Cài đặt tài khoản và ứng dụng',
      category: 'Điều hướng',
    },
    {
      action: 'Đóng modal / Quay lại',
      keys: ['Esc'],
      description: 'Đóng hộp thoại hiện tại hoặc thoát chế độ xem Cài đặt',
      category: 'Điều hướng',
    },
    {
      action: 'Chuyển kênh trước / sau',
      keys: ['Alt', '↑ / ↓'],
      description: 'Điều hướng nhanh qua danh sách các kênh trong server',
      category: 'Điều hướng',
    },
    {
      action: 'Chuyển máy chủ trước / sau',
      keys: ['Ctrl', 'Alt', '↑ / ↓'],
      description: 'Chuyển đổi qua lại giữa các server trên thanh bên trái',
      category: 'Điều hướng',
    },
    {
      action: 'Mở Game Overlay trong trận',
      keys: ['Shift', '~'],
      description: 'Mở giao diện chat và danh sách voice khi đang chơi game',
      category: 'Hệ thống',
    },
    {
      action: 'Đánh dấu server đã đọc',
      keys: ['Shift', 'Esc'],
      description: 'Xóa toàn bộ biểu tượng tin nhắn chưa đọc trong máy chủ',
      category: 'Trò chuyện',
    },
    {
      action: 'Sửa tin nhắn vừa gửi',
      keys: ['↑'],
      description: 'Nhấn mũi tên lên trong ô soạn thảo để sửa tin nhắn gần nhất',
      category: 'Trò chuyện',
    },
    {
      action: 'Thêm tệp đính kèm / Ảnh',
      keys: ['Ctrl', 'Shift', 'U'],
      description: 'Mở nhanh hộp thoại chọn tệp tải lên khung chat',
      category: 'Trò chuyện',
    },
  ];

  protected toggleOpenOnStartup(checked: boolean): void {
    this.settingsService.updatePreference('openOnStartup', checked);
  }

  protected toggleMinimizeToTray(checked: boolean): void {
    this.settingsService.updatePreference('minimizeToTray', checked);
  }
}

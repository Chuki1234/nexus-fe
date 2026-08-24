import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserSettingsService } from '../../services/user-settings.service';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { linkIconFor } from '../../../profile/components/link-icon';
import { ProfileImages } from '../../../profile/components/profile-images/profile-images';
import { ProfilePendingImages } from '../../../profile/pending-images';
import { ProfileStore } from '../../../profile/profile-store';

@Component({
  selector: 'app-profile-tab',
  imports: [
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    Avatar,
    ProfileImages,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-tab.html',
  styleUrl: './profile-tab.css',
})
export class ProfileTab {
  protected readonly settingsService = inject(UserSettingsService);
  /** Hồ sơ THẬT từ API — phần xem trước lấy ảnh từ đây thay vì để trống. */
  protected readonly store = inject(ProfileStore);
  /**
   * Ảnh cho thẻ xem trước. Phải qua đây chứ không đọc thẳng `store`: thẻ tự gắn
   * nhãn "Thời gian thực" nên phải hiện cả ảnh còn đang chờ lưu.
   */
  protected readonly staged = inject(ProfilePendingImages);

  protected readonly activeProfileSection = signal<'main' | 'server'>('main');

  constructor() {
    void this.store.ensureLoaded();
  }

  protected readonly colorPresets = [
    { label: 'Deep Teal', hex: '#003d4f' },
    { label: 'House Green', hex: '#1e3932' },
    { label: 'Sapphire Blue', hex: '#3d4f9f' },
    { label: 'Amethyst Purple', hex: '#7b3ff2' },
    { label: 'Solar Orange', hex: '#fa6e39' },
    { label: 'Gold Vintage', hex: '#cba258' },
    { label: 'Abyss Navy', hex: '#001e2b' },
    { label: 'Crimson Rose', hex: '#8a4139' },
  ];

  protected readonly serverList = [
    { id: 's1', name: 'Nexus Developers Hub' },
    { id: 's2', name: 'Gaming Lounge VN' },
    { id: 's3', name: 'Anime & Manga Cafe' },
  ];

  protected readonly selectedServerId = signal<string>('s1');

  protected readonly selectedServerName = computed(
    () =>
      this.serverList.find((s) => s.id === this.selectedServerId())?.name ?? 'máy chủ này',
  );

  /** Icon theo tên miền — cùng hàm mà thẻ hồ sơ thật dùng, để hai bên khớp nhau. */
  protected iconFor(url: string): string {
    return linkIconFor(url);
  }

  protected selectBannerColor(color: string): void {
    this.settingsService.editBannerColor.set(color);
  }
}

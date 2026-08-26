import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserSettingsService } from '../../services/user-settings.service';
import { validateImageFile } from '../../../../core/api/profiles-api.service';
import { ACCENT_COLORS } from '../../../../../shared';
import { EARLIEST_BIRTH_YEAR, MIN_AGE_YEARS } from '../../../auth/models/birthdate';
import { ProfileStore } from '../../../profile/profile-store';
import { linkIconFor } from '../../../profile/components/link-icon';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { ProfileWidgetsEditor } from '../../../profile/components/profile-widgets-editor/profile-widgets-editor';

/** Tên gọi cho từng màu trong `ACCENT_COLORS`, cùng thứ tự. */
const ACCENT_COLOR_LABELS = [
  'Xanh Chàm',
  'Xanh Ngọc',
  'Tím Thạch Anh',
  'Đỏ Gạch',
  'Vàng Hổ Phách',
  'Xanh Thép',
  'Hồng Mận',
  'Xanh Rêu',
] as const;

@Component({
  selector: 'app-profile-tab',
  standalone: true,
  imports: [
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    Avatar,
    ProfileWidgetsEditor,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-tab.html',
  styleUrl: './profile-tab.css',
})
export class ProfileTab {
  protected readonly settingsService = inject(UserSettingsService);
  /** Hồ sơ THẬT từ API — nguồn cho liên kết, ngày tham gia, ảnh xem trước. */
  private readonly store = inject(ProfileStore);

  /** Liên kết thật đã gắn ở tab "Ứng dụng đã kết nối". */
  protected readonly links = computed(() => this.store.profile()?.links ?? []);

  /** Icon đoán theo tên miền, dùng chung với tab Ứng dụng đã kết nối. */
  protected iconFor(url: string): string {
    return linkIconFor(url);
  }

  /**
   * Ngày tham gia THẬT.
   *
   * Trước đây thẻ xem trước ghi cứng "Tháng 8, 2026" cho mọi người — ai mở cũng
   * thấy đúng dòng đó dù đăng ký lúc nào.
   */
  protected readonly memberSince = computed(() => {
    const createdAt = this.store.profile()?.createdAt;
    if (!createdAt) return '—';
    const d = new Date(createdAt);
    return `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
  });

  /**
   * Giới hạn cho `<input type="date">`: không cho chọn ngày khiến người dùng
   * chưa đủ `MIN_AGE_YEARS` tuổi, cũng không cho chọn năm sinh phi lý.
   *
   * `new Date()` không dùng thẳng trong template được (quy tắc dự án), nên
   * tính một lần ở đây rồi expose ra hai chuỗi ISO cho template bind vào.
   */
  private readonly today = new Date();
  protected readonly birthdateMax = `${this.today.getFullYear() - MIN_AGE_YEARS}-${String(this.today.getMonth() + 1).padStart(2, '0')}-${String(this.today.getDate()).padStart(2, '0')}`;
  protected readonly birthdateMin = `${EARLIEST_BIRTH_YEAR}-01-01`;

  /** "3 Tháng 11, 2001" — cùng định dạng với thẻ hồ sơ thật (`profile-card.ts`). */
  protected readonly birthdateFormatted = computed(() => {
    const raw = this.settingsService.editBirthdate();
    const parts = raw.split('-');
    if (parts.length !== 3) return null;
    const [year, month, day] = parts;
    return `${Number(day)} Tháng ${Number(month)}, ${year}`;
  });

  protected readonly activeProfileSection = signal<'main' | 'server'>('main');

  constructor() {
    // Thiếu dòng này thì mở thẳng vào tab Hồ sơ (hoặc F5 trên URL đó) sẽ thấy
    // liên kết và ngày tham gia trống dù hồ sơ có dữ liệu.
    void this.store.ensureLoaded();
  }

  /**
   * Bảng màu PHẢI lấy từ `ACCENT_COLORS` của shared.
   *
   * Trước đây đây là tám mã màu tự chọn (#003d4f, #7b3ff2…) không trùng một mã
   * nào trong bảng hợp lệ, mà backend chặn bằng `@IsIn([...ACCENT_COLORS])` và
   * database còn có ràng buộc `profiles_accent_color_valid`. Hệ quả: bấm màu
   * nào rồi Lưu cũng nhận "Màu không hợp lệ." — kể cả không đụng vào màu, vì
   * giá trị mặc định cũng nằm ngoài bảng.
   */
  protected readonly colorPresets = ACCENT_COLORS.map((hex, index) => ({
    hex,
    label: ACCENT_COLOR_LABELS[index],
  }));

  protected readonly avatarPresets = [
    { label: 'Cyber Bot', url: 'https://api.dicebear.com/7.x/bottts/png?seed=Nexus1' },
    { label: 'Pixel Cat', url: 'https://api.dicebear.com/7.x/bottts/png?seed=CatGamer' },
    { label: 'Anime Hero', url: 'https://api.dicebear.com/7.x/adventurer/png?seed=Alex' },
    { label: 'Cosmic Star', url: 'https://api.dicebear.com/7.x/adventurer/png?seed=CosmicNexus' },
    { label: 'Neon Coder', url: 'https://api.dicebear.com/7.x/bottts/png?seed=CoderX' },
    { label: 'Cyber Spirit', url: 'https://api.dicebear.com/7.x/identicon/png?seed=NexusPrime' },
  ];

  protected readonly serverList = [
    { id: 's1', name: 'Nexus Developers Hub' },
    { id: 's2', name: 'Gaming Lounge VN' },
    { id: 's3', name: 'Anime & Manga Cafe' },
  ];

  protected readonly selectedServerId = signal<string>('s1');

  protected selectBannerColor(color: string): void {
    this.settingsService.editBannerColor.set(color);
  }

  /** Lỗi khi chọn ảnh (sai định dạng, quá nặng, tải preset hỏng). */
  protected readonly avatarError = signal<string | null>(null);

  /** URL của các ảnh mẫu tải hỏng — để vẽ icon thay cho vòng tròn rỗng. */
  protected readonly brokenPresets = signal<ReadonlySet<string>>(new Set());

  protected markPresetBroken(url: string): void {
    this.brokenPresets.update((set) => new Set(set).add(url));
  }

  /**
   * Giữ chính `File` chứ không đọc thành data URL.
   *
   * `POST /profiles/me/avatar` nhận multipart; nhồi base64 vào thân JSON vừa
   * không có route nào nhận, vừa làm request vượt giới hạn body 100KB của
   * backend ngay khi ảnh quá ~75KB.
   */
  protected onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const problem = validateImageFile(file);
    if (problem) {
      this.avatarError.set(problem);
      input.value = '';
      return;
    }

    this.avatarError.set(null);
    this.stage(file);
    // Xoá giá trị input để chọn LẠI đúng file vừa gỡ vẫn kích hoạt `change`.
    input.value = '';
  }

  /**
   * Ảnh mẫu vẫn phải đi qua đường tải lên như ảnh tự chọn.
   *
   * Trước đây chỉ gán thẳng URL dicebear vào hồ sơ — backend không có trường
   * nhận avatar dạng URL nên chọn xong bấm Lưu là mất. Tải về thành `File` rồi
   * đẩy lên thì ảnh nằm trong storage của Nexus, không phụ thuộc dicebear còn
   * sống hay không.
   */
  protected async selectAvatarPreset(url: string): Promise<void> {
    this.avatarError.set(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      const file = new File([blob], 'avatar.png', { type: blob.type || 'image/png' });

      const problem = validateImageFile(file);
      if (problem) {
        this.avatarError.set(problem);
        return;
      }
      this.stage(file);
    } catch {
      this.avatarError.set('Không tải được ảnh mẫu. Kiểm tra mạng rồi thử lại.');
    }
  }

  private stage(file: File): void {
    const previous = this.previewUrl;
    this.previewUrl = URL.createObjectURL(file);
    this.settingsService.stageAvatarFile(file, this.previewUrl);
    // Thu hồi SAU khi đã gán cái mới, không thì ảnh chớp trắng một nhịp.
    if (previous) URL.revokeObjectURL(previous);
  }

  /** `blob:` URL của ảnh xem trước hiện tại, để thu hồi khi thay cái khác. */
  private previewUrl: string | null = null;

  protected removeAvatar(): void {
    this.avatarError.set(null);
    this.settingsService.stageAvatarRemoval();
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
  }

  // ══ ẢNH BÌA ══
  /** Lỗi khi chọn ảnh bìa (sai định dạng hoặc quá nặng). */
  protected readonly bannerError = signal<string | null>(null);
  /** `blob:` URL xem trước của ảnh bìa, giữ để thu hồi khi thay cái khác. */
  private bannerPreviewUrl: string | null = null;

  /**
   * Ảnh bìa đi cùng đường với avatar: giữ `File`, xem trước bằng `blob:`, tải
   * lên multipart qua `POST /profiles/me/banner` khi bấm Lưu.
   *
   * Backend tự cắt về 1500×500 và nén sang webp, nên ảnh nào cũng nhận được —
   * không cần người dùng tự cắt đúng tỉ lệ 3:1.
   */
  protected onBannerFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const problem = validateImageFile(file);
    if (problem) {
      this.bannerError.set(problem);
      input.value = '';
      return;
    }

    this.bannerError.set(null);
    const previous = this.bannerPreviewUrl;
    this.bannerPreviewUrl = URL.createObjectURL(file);
    this.settingsService.stageBannerFile(file, this.bannerPreviewUrl);
    if (previous) URL.revokeObjectURL(previous);
    input.value = '';
  }

  /** Gỡ ảnh bìa — quay về dùng màu chủ đạo. */
  protected removeBanner(): void {
    this.bannerError.set(null);
    this.settingsService.stageBannerRemoval();
    if (this.bannerPreviewUrl) {
      URL.revokeObjectURL(this.bannerPreviewUrl);
      this.bannerPreviewUrl = null;
    }
  }

  protected onImageError(event: Event, fallbackText: string): void {
    const img = event.target as HTMLImageElement;
    img.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(fallbackText)}`;
  }
}

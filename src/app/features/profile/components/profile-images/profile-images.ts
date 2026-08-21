import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  IMAGE_ACCEPT_ATTRIBUTE,
  ProfilesApiService,
  validateImageFile,
  type ProfileImageKind,
} from '../../../../core/api/profiles-api.service';
import { formatApiError } from '../../../../core/api/servers-api.service';
import { bannerColorFor, profileDisplayName, type OwnProfile } from '../../../../../shared';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { ProfileStore } from '../../profile-store';

/**
 * Đổi ảnh đại diện và ảnh bìa.
 *
 * Ảnh đi đường riêng, KHÔNG chờ nút Lưu chung của biểu mẫu: gộp chung thì mỗi
 * lần sửa một ô chữ lại phải tải lại cả tấm ảnh. Đổi xong là thấy ngay, đúng
 * kiểu người dùng mong đợi ở một thứ trực quan như ảnh.
 *
 * Đọc/ghi qua `ProfileStore` để mọi nơi khác đang hiện avatar (thanh dưới đáy,
 * thẻ hồ sơ) cùng cập nhật theo, thay vì mỗi chỗ giữ một bản riêng.
 */
@Component({
  selector: 'app-profile-images',
  imports: [Avatar, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-images.html',
  styleUrl: './profile-images.css',
})
export class ProfileImages {
  private readonly api = inject(ProfilesApiService);
  protected readonly store = inject(ProfileStore);

  protected readonly accept = IMAGE_ACCEPT_ATTRIBUTE;
  /** Loại ảnh đang có request chạy dở, để khoá đúng khối đó chứ không khoá cả hai. */
  protected readonly busy = signal<ProfileImageKind | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly name = computed(() => {
    const profile = this.store.profile();
    return profile ? profileDisplayName(profile) : 'Bạn';
  });

  /** Màu nền khi chưa có ảnh bìa — cùng màu mà hồ sơ dùng ở mọi nơi khác. */
  protected readonly bannerColor = computed(() => {
    const profile = this.store.profile();
    return profile ? bannerColorFor(profile.username, profile.accentColor) : '#001e2b';
  });

  /**
   * Xoá `input.value` sau khi đọc file: không xoá thì chọn LẠI đúng file vừa
   * lỗi sẽ không bắn `change`, và người dùng bấm mãi mà tưởng ứng dụng treo.
   */
  protected async onPick(kind: ProfileImageKind, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file || this.busy()) {
      return;
    }

    const invalid = validateImageFile(file);
    if (invalid) {
      this.errorMessage.set(invalid);
      return;
    }

    await this.run(kind, () => this.api.uploadImage(kind, file));
  }

  protected async onRemove(kind: ProfileImageKind): Promise<void> {
    await this.run(kind, () => this.api.removeImage(kind));
  }

  private async run(
    kind: ProfileImageKind,
    action: () => Promise<OwnProfile>,
  ): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.errorMessage.set(null);
    this.busy.set(kind);
    try {
      this.store.set(await action());
    } catch (error) {
      this.errorMessage.set(formatApiError(error));
    } finally {
      this.busy.set(null);
    }
  }
}

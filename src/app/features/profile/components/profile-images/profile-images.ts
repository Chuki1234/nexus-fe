import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  IMAGE_ACCEPT_ATTRIBUTE,
  validateImageFile,
  type ProfileImageKind,
} from '../../../../core/api/profiles-api.service';
import { bannerColorFor, profileDisplayName } from '../../../../../shared';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { ProfilePendingImages } from '../../pending-images';
import { ProfileStore } from '../../profile-store';

/**
 * Đổi ảnh đại diện và ảnh bìa.
 *
 * Ảnh chọn xong KHÔNG tải lên ngay mà xếp vào `ProfilePendingImages`, giống hệt
 * ô chữ và màu bìa: thanh "bạn có thay đổi chưa được lưu" hiện lên, bấm Lưu mới
 * gửi đi, bấm Đặt lại là bỏ. Tải lên ngay như trước khiến trong cùng một màn
 * hình có hai luật khác nhau và người dùng không biết mình đã lưu hay chưa.
 *
 * Đọc/ghi qua `ProfileStore` để mọi nơi khác đang hiện avatar (thanh dưới đáy,
 * thẻ hồ sơ) cùng cập nhật theo sau khi lưu, thay vì mỗi chỗ giữ một bản riêng.
 */
@Component({
  selector: 'app-profile-images',
  imports: [Avatar, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-images.html',
  styleUrl: './profile-images.css',
})
export class ProfileImages {
  protected readonly store = inject(ProfileStore);
  protected readonly staged = inject(ProfilePendingImages);

  protected readonly accept = IMAGE_ACCEPT_ATTRIBUTE;
  /** Lỗi tại chỗ (file sai định dạng/quá nặng) — lỗi khi lưu nằm ở `staged`. */
  protected readonly pickError = signal<string | null>(null);

  protected readonly errorMessage = computed(
    () => this.pickError() ?? this.staged.errorMessage(),
  );

  /** Ảnh sẽ hiện: ưu tiên ảnh đang chờ, chưa chọn gì thì lấy ảnh đã lưu. */
  protected readonly avatarPreview = this.staged.effectiveAvatarUrl;
  protected readonly bannerPreview = this.staged.effectiveBannerUrl;

  protected readonly avatarChanged = computed(
    () => this.staged.previewFor('avatar') !== undefined,
  );
  protected readonly bannerChanged = computed(
    () => this.staged.previewFor('banner') !== undefined,
  );

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
  protected onPick(kind: ProfileImageKind, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file || this.staged.saving()) {
      return;
    }

    const invalid = validateImageFile(file);
    if (invalid) {
      this.pickError.set(invalid);
      return;
    }

    this.pickError.set(null);
    this.staged.stage(kind, file);
  }

  protected onRemove(kind: ProfileImageKind): void {
    this.pickError.set(null);
    this.staged.stageRemoval(kind);
  }
}

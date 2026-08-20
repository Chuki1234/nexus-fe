import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ProfilesApiService } from '../../../../core/api/profiles-api.service';
import { formatApiError } from '../../../../core/api/servers-api.service';
import type { PublicProfile } from '../../../../../shared';
import { ProfileCard } from '../profile-card/profile-card';

export interface ProfileModalData {
  username: string;
  /** Truyền vào khi nơi gọi đã có sẵn hồ sơ, để khỏi gọi API lần hai. */
  profile?: PublicProfile;
}

/**
 * Hồ sơ mở ở giữa màn hình, có lớp phủ chặn phía sau.
 *
 * Mở bằng `MatDialog` chứ không tự dựng: Material CDK đã lo bẫy Tab, đóng bằng
 * Esc, `aria-modal` và trả tiêu điểm về đúng nút đã mở — bốn thứ dễ làm sai khi
 * viết tay, mà làm sai thì người dùng bàn phím lạc ra sau lớp phủ không quay
 * lại được.
 *
 * Giữ được nền phía sau (khung chat, danh sách thành viên) nên hồ sơ trông như
 * đang nổi lên trên cuộc trò chuyện, khác hẳn việc điều hướng sang trang riêng.
 */
@Component({
  selector: 'app-profile-modal',
  imports: [MatIconModule, ProfileCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-modal.html',
  styleUrl: './profile-modal.css',
})
export class ProfileModal {
  private readonly api = inject(ProfilesApiService);
  private readonly dialogRef = inject(MatDialogRef<ProfileModal>);
  private readonly data = inject<ProfileModalData>(MAT_DIALOG_DATA);

  protected readonly profile = signal<PublicProfile | null>(this.data.profile ?? null);
  protected readonly loading = signal(!this.data.profile);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    if (!this.data.profile) {
      void this.load();
    }
  }

  protected close(): void {
    this.dialogRef.close();
  }

  private async load(): Promise<void> {
    try {
      this.profile.set(await this.api.getByUsername(this.data.username));
    } catch (error) {
      this.errorMessage.set(formatApiError(error));
    } finally {
      this.loading.set(false);
    }
  }
}

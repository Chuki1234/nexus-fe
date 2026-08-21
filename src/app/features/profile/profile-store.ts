import { inject, Injectable, signal } from '@angular/core';
import { ProfilesApiService } from '../../core/api/profiles-api.service';
import type { OwnProfile } from '../../../shared';

/**
 * Hồ sơ đầy đủ của chính người đang đăng nhập.
 *
 * Khác `core/profile/ProfileService` (chỉ trả lời "đã hoàn tất đăng ký chưa"
 * cho guard, và chỉ giữ vài trường tối thiểu từ `/auth/me`): ở đây là hồ sơ đủ
 * cả ảnh, giới thiệu, liên kết — thứ mà màn cài đặt và thẻ hồ sơ cần.
 *
 * Giữ một bản duy nhất vì hồ sơ hiện ở nhiều nơi cùng lúc (thanh dưới đáy, tab
 * cài đặt, thẻ hồ sơ). Mỗi chỗ tự gọi API và tự nhớ thì đổi avatar xong sẽ có
 * chỗ đổi chỗ không, người dùng tưởng lưu hụt.
 */
@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly api = inject(ProfilesApiService);

  private readonly state = signal<OwnProfile | null>(null);
  readonly profile = this.state.asReadonly();

  private readonly loadingState = signal(false);
  readonly loading = this.loadingState.asReadonly();

  /** Chặn nhiều nơi cùng gọi `ensureLoaded()` lúc khởi động thành nhiều request. */
  private inFlight: Promise<void> | null = null;

  /** Tải một lần rồi dùng lại. Gọi bao nhiêu lần cũng được. */
  async ensureLoaded(): Promise<void> {
    if (this.state() || this.inFlight) {
      return this.inFlight ?? Promise.resolve();
    }
    this.inFlight = this.refresh();
    try {
      await this.inFlight;
    } finally {
      this.inFlight = null;
    }
  }

  async refresh(): Promise<void> {
    this.loadingState.set(true);
    try {
      this.state.set(await this.api.getOwn());
    } catch {
      // Nuốt lỗi ở đây: nơi gọi (tab cài đặt, thẻ hồ sơ) tự quyết định hiện gì
      // khi chưa có hồ sơ. Ném ra sẽ làm vỡ cả màn hình chỉ vì một khối phụ.
      this.state.set(null);
    } finally {
      this.loadingState.set(false);
    }
  }

  /** Ghi đè sau khi một lời gọi API đã trả về hồ sơ mới (lưu, đổi ảnh…). */
  set(profile: OwnProfile): void {
    this.state.set(profile);
  }

  /** Quên hồ sơ đã nhớ. Gọi khi đăng xuất — người tiếp theo là người khác. */
  reset(): void {
    this.state.set(null);
  }
}

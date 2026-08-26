import { inject, Injectable, signal } from '@angular/core';
import { ProfilesApiService } from '../../core/api/profiles-api.service';
import { formatApiError } from '../../core/api/servers-api.service';

/**
 * Ghi chú riêng của người xem về chủ hồ sơ đang mở trên `ProfileCard`.
 *
 * KHÔNG `providedIn: 'root'` — như `OpenDm`, phải là một bản riêng cho mỗi
 * `ProfileCard`. Là singleton toàn app thì mở thẻ nổi của B trong lúc trang
 * `/u/:a` đang hiện thì ghi chú của B sẽ đè lên chỗ đang hiển thị cho A.
 */
@Injectable()
export class ProfileNote {
  private readonly api = inject(ProfilesApiService);

  readonly text = signal('');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  async load(username: string): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      this.text.set((await this.api.getNote(username)).text);
    } catch (error) {
      this.errorMessage.set(formatApiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async save(username: string, text: string): Promise<void> {
    // Không đổi gì thì đừng gọi API — bấm ra ngoài ô nhập (blur) mà chưa gõ
    // gì cũng kích hoạt sự kiện này, gọi API mỗi lần vô ích.
    if (text === this.text()) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    try {
      this.text.set((await this.api.setNote(username, text)).text);
    } catch (error) {
      this.errorMessage.set(formatApiError(error));
    } finally {
      this.saving.set(false);
    }
  }
}

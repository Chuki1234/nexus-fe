import { computed, inject, Injectable, signal, type Signal } from '@angular/core';
import { ProfilesApiService } from '../../core/api/profiles-api.service';
import type { PublicProfile } from '../../../shared';

/**
 * Tra hồ sơ người khác theo username, có nhớ kết quả.
 *
 * Cùng một người xuất hiện ở rất nhiều chỗ cùng lúc — danh sách tin nhắn, từng
 * dòng chat, danh sách thành viên, cột hồ sơ bên phải. Mỗi chỗ tự gọi API thì
 * một màn hình chat mở ra là hàng chục request cho cùng vài người, và tệ hơn:
 * chỗ nào tải xong trước hiện ảnh trước, avatar nhấp nháy lệch nhau.
 *
 * Nhớ cả kết quả RỖNG (người không có hồ sơ): không nhớ thì mỗi lần Angular
 * dựng lại một dòng chat là lại hỏi API cho một username chắc chắn không tồn tại.
 */
/**
 * `loading` khác `missing` ở chỗ nào cũng cần: chỗ nào chờ được thì hiện khung
 * xám, chỗ nào không thì vẽ luôn bằng dữ liệu sẵn có. Gộp cả hai vào `null` như
 * trước khiến cột hồ sơ kẹt ở khung xám vĩnh viễn với người không có hồ sơ.
 */
export type LookupStatus = 'loading' | 'found' | 'missing';

interface LookupEntry {
  status: LookupStatus;
  profile: PublicProfile | null;
}

@Injectable({ providedIn: 'root' })
export class ProfileLookup {
  private readonly api = inject(ProfilesApiService);

  private readonly cache = new Map<string, ReturnType<typeof signal<LookupEntry>>>();
  private readonly pending = new Set<string>();

  /**
   * Hồ sơ của `username`, `null` khi chưa tải xong hoặc người này không có hồ sơ.
   *
   * Trả về signal nên nơi gọi cứ đọc trong template — tải xong là giao diện tự
   * cập nhật, không cần tự đăng ký lắng nghe.
   */
  profileFor(username: string): Signal<PublicProfile | null> {
    const entry = this.entryFor(username);
    return computed(() => entry().profile);
  }

  /** Trạng thái tra cứu — dùng khi cần phân biệt đang tải với không có hồ sơ. */
  statusFor(username: string): Signal<LookupStatus> {
    const entry = this.entryFor(username);
    return computed(() => entry().status);
  }

  private entryFor(username: string): Signal<LookupEntry> {
    const key = username.trim().toLowerCase();
    let entry = this.cache.get(key);

    if (!entry) {
      // Username rỗng thì không có gì để hỏi — chốt `missing` ngay thay vì để
      // nơi gọi chờ một request không bao giờ được gửi.
      entry = signal<LookupEntry>({ status: key ? 'loading' : 'missing', profile: null });
      this.cache.set(key, entry);
    }

    if (key && !this.pending.has(key)) {
      this.pending.add(key);
      void this.load(key);
    }

    return entry.asReadonly();
  }

  /** Đường dẫn ảnh đại diện, `null` khi chưa có hoặc người này chưa tải ảnh. */
  avatarFor(username: string): Signal<string | null> {
    const profile = this.profileFor(username);
    return computed(() => profile()?.avatarUrl ?? null);
  }

  /** Ghi sẵn hồ sơ đã có, để nơi vừa gọi API không phải hỏi lại lần nữa. */
  prime(profile: PublicProfile): void {
    const key = profile.username.trim().toLowerCase();
    const next: LookupEntry = { status: 'found', profile };
    const entry = this.cache.get(key);
    if (entry) {
      entry.set(next);
    } else {
      this.cache.set(key, signal<LookupEntry>(next));
    }
    this.pending.add(key);
  }

  /**
   * Quên hết. Gọi khi đăng xuất — `isSelf` trong hồ sơ đã nhớ là tính theo
   * NGƯỜI ĐANG XEM, nên giữ lại thì người đăng nhập kế tiếp trên cùng máy sẽ
   * thấy nút "Chỉnh sửa hồ sơ" trên hồ sơ của người khác.
   */
  reset(): void {
    this.cache.clear();
    this.pending.clear();
  }

  private async load(username: string): Promise<void> {
    try {
      const found = await this.api.getByUsername(username);
      this.cache
        .get(username)
        ?.set(found ? { status: 'found', profile: found } : { status: 'missing', profile: null });
    } catch {
      // Mạng lỗi hay không có hồ sơ đều xử như nhau: chốt `missing` để nơi gọi
      // thôi chờ và vẽ bằng dữ liệu sẵn có, thay vì treo ở khung xám.
      this.cache.get(username)?.set({ status: 'missing', profile: null });
    }
  }
}

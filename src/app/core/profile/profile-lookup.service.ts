import { inject, Injectable } from '@angular/core';
import { ProfileApiService } from './profile-api.service';
import { Profile } from './profile.models';

/**
 * Tra hồ sơ theo username, có nhớ kết quả.
 *
 * Thẻ hồ sơ và bảng bên cạnh khung chat cùng hỏi một người, và người dùng mở đi
 * mở lại thẻ của cùng một người liên tục — không nhớ thì mỗi lần bấm là một
 * request.
 *
 * Nhớ cả trường hợp KHÔNG tìm thấy (`null`): thành viên giả như `thao.nguyen`
 * không có hồ sơ thật, bỏ qua thì mỗi lần mở thẻ lại bắn thêm một 404.
 */
@Injectable({ providedIn: 'root' })
export class ProfileLookupService {
  private readonly api = inject(ProfileApiService);

  /** username → hồ sơ, hoặc `null` khi tra rồi mà không có. */
  private readonly cache = new Map<string, Promise<Profile | null>>();

  lookup(username: string): Promise<Profile | null> {
    const key = username.toLowerCase();
    let pending = this.cache.get(key);

    if (!pending) {
      pending = this.api.getByUsername(key).catch(() => null);
      this.cache.set(key, pending);
    }
    return pending;
  }

  /**
   * Nạp sẵn một hồ sơ đã có trong tay.
   *
   * Thanh người dùng dưới đáy đã gọi `GET /me` để vẽ tên và avatar; không nạp
   * sẵn thì lúc bấm mở thẻ hồ sơ của chính mình lại bắn thêm một request nữa cho
   * đúng con người đó, và thẻ chớp một nhịp khung xám trước khi có nội dung.
   */
  prime(profile: Profile): void {
    this.cache.set(profile.username.toLowerCase(), Promise.resolve(profile));
  }

  /** Quên hết (gọi khi đăng xuất, vì hồ sơ chỉ đọc được khi đã đăng nhập). */
  reset(): void {
    this.cache.clear();
  }
}

import { effect, inject, Signal, signal } from '@angular/core';
import { ProfileLookupService } from '../../../core/profile/profile-lookup.service';
import { Profile } from '../../../core/profile/profile.models';
import type { MockMember } from '../../../pages/channels/mock/chat-mock';

export interface MemberProfileState {
  /** `null` khi đang tải, hoặc khi người này không có hồ sơ Nexus thật. */
  profile: Signal<Profile | null>;
  loading: Signal<boolean>;
}

/**
 * Tra hồ sơ THẬT của một thành viên và theo dõi luôn khi thành viên đó đổi.
 *
 * Ba chỗ cùng cần đúng việc này — thẻ nổi, bảng cạnh khung chat, và cửa sổ hồ sơ
 * giữa màn hình — mà mỗi chỗ lại có bố cục riêng nên không gộp thành một
 * component được. Gộp phần lấy dữ liệu vào đây để cả ba không trôi khỏi nhau.
 *
 * Phải gọi trong ngữ cảnh tiêm (trường của component hoặc constructor).
 */
export function injectMemberProfile(member: Signal<MockMember>): MemberProfileState {
  const lookup = inject(ProfileLookupService);

  const profile = signal<Profile | null>(null);
  const loading = signal(true);

  // effect chứ không phải gọi một lần: bảng cạnh khung chat dùng lại đúng một
  // component khi người dùng chuyển sang cuộc trò chuyện khác, lúc đó `member`
  // đổi mà component thì không được dựng lại.
  effect(() => {
    const username = member().username;
    profile.set(null);

    // Cửa sổ hồ sơ lúc đóng không có ai để xem và đưa vào đây một member rỗng.
    // Không chặn thì mỗi lần đóng lại bắn một request tới /api/profiles/ .
    if (!username) {
      loading.set(false);
      return;
    }

    loading.set(true);

    void lookup.lookup(username).then((found) => {
      // Người dùng có thể đã đổi sang người khác trong lúc chờ.
      if (member().username === username) {
        profile.set(found);
        loading.set(false);
      }
    });
  });

  return { profile: profile.asReadonly(), loading: loading.asReadonly() };
}

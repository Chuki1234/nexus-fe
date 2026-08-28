import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProfileLookupService } from '../../../../../core/profile/profile-lookup.service';
import { Profile } from '../../../../../core/profile/profile.models';
import { ProfilePreviewCardComponent } from '../../../../../shared/ui/profile-card/profile-preview-card.component';
import { resolveInternalLink } from '../../utils/internal-link';

/**
 * Card embed cho link NỘI BỘ Nexus dán trong khung chat.
 *
 * Phase 3 mới xử lý một loại: link hồ sơ `origin/u/:username` → vẽ lại đúng tấm
 * thẻ `app-profile-preview-card` dùng ở trang Setting, dữ liệu LIVE tra qua
 * `ProfileLookupService` (đã cache/dedupe nên nhiều tin cùng link 1 người chỉ 1
 * request). Link server (invite/introduction) để Phase 4.
 *
 * Nơi gọi chỉ được truyền vào URL đã là link nội bộ; kind không phải profile,
 * hoặc hồ sơ không tồn tại / không có quyền xem (`lookup` trả `null`) → component
 * không vẽ gì, link inline trong tin nhắn vẫn còn nguyên.
 */
@Component({
  selector: 'app-chat-link-embed',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    ProfilePreviewCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-link-embed.html',
  styleUrl: './chat-link-embed.css',
})
export class ChatLinkEmbed {
  private readonly lookup = inject(ProfileLookupService);

  /** URL nội bộ (đã xác thực là link) của tin nhắn — nguồn duy nhất của embed. */
  readonly url = input.required<string>();

  /** Chỉ nhánh 'profile' được xử lý ở Phase 3; kind khác → null (chưa embed). */
  protected readonly profileUsername = computed(() => {
    const target = resolveInternalLink(this.url());
    return target?.kind === 'profile' ? target.username : null;
  });

  protected readonly profile = signal<Profile | null>(null);
  protected readonly loading = signal(false);

  constructor() {
    // effect chứ không gọi một lần: cùng một component có thể được tái dùng cho
    // tin nhắn khác khi danh sách cuộn/đổi — mirror `injectMemberProfile()`.
    effect(() => {
      const username = this.profileUsername();
      this.profile.set(null);

      if (!username) {
        this.loading.set(false);
        return;
      }

      this.loading.set(true);
      void this.lookup.lookup(username).then((found) => {
        // Có thể đã bị tái dùng cho URL khác trong lúc chờ request.
        if (this.profileUsername() === username) {
          this.profile.set(found);
          this.loading.set(false);
        }
      });
    });
  }
}

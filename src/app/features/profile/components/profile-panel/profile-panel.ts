import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { bannerColorFor, profileDisplayName } from '../../../../../shared';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { ProfileLookup } from '../../profile-lookup';
import { linkIconFor } from '../link-icon';

/**
 * Hồ sơ hiển thị cố định ở cột phải khi đang nhắn tin với ai đó.
 *
 * Khác `ProfilePopover` (nổi đè lên, mở ra rồi đóng) ở chỗ nó ở LẠI trong suốt
 * cuộc trò chuyện — nên bố cục xếp dọc trong cột hẹp thay vì thẻ vuông, và
 * không có nút hành động chiếm chỗ.
 *
 * Lấy hồ sơ qua `ProfileLookup` (có nhớ) chứ không tự gọi API: avatar trong
 * khung chat cũng tra đúng người này, dùng chung một bản để hai chỗ không lệch
 * nhau và không gọi mạng hai lần.
 */
@Component({
  selector: 'app-profile-panel',
  imports: [Avatar, MatIconModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './profile-panel.html',
  styleUrl: './profile-panel.css',
})
export class ProfilePanel {
  readonly username = input.required<string>();

  private readonly lookup = inject(ProfileLookup);

  protected readonly profile = computed(() => this.lookup.profileFor(this.username())());

  protected readonly name = computed(() => {
    const person = this.profile();
    return person ? profileDisplayName(person) : '';
  });

  protected readonly bannerColor = computed(() => {
    const person = this.profile();
    return person ? bannerColorFor(person.username, person.accentColor) : '#001e2b';
  });

  protected readonly joined = computed(() => {
    const createdAt = this.profile()?.createdAt;
    if (!createdAt) {
      return '—';
    }
    const date = new Date(createdAt);
    return Number.isNaN(date.getTime())
      ? '—'
      : `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
  });

  protected iconFor(url: string): string {
    return linkIconFor(url);
  }
}

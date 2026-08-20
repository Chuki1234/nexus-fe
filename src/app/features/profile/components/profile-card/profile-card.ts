import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { bannerColorFor, profileDisplayName, type PublicProfile } from '../../../../../shared';
import { linkIconFor, prettyUrl } from '../link-icon';

/**
 * Ruột của hồ sơ: ảnh bìa, avatar, tên, dòng trạng thái, giới thiệu, liên kết.
 *
 * Dùng chung cho trang `/u/:username` và cửa sổ hồ sơ nổi giữa màn hình. Hai
 * chỗ đó chỉ khác khung ngoài (trang có thanh điều hướng, cửa sổ có lớp phủ và
 * nút đóng) còn nội dung phải giống hệt — tách ra để sửa một lần là cả hai đổi
 * theo, thay vì hai bản chép tay tự trôi khỏi nhau.
 *
 * Không tự gọi API: nhận hồ sơ qua input để nơi nào đã có sẵn dữ liệu thì
 * không phải hỏi lại lần nữa.
 */
@Component({
  selector: 'app-profile-card',
  imports: [Avatar, MatIconModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-card.html',
  styleUrl: './profile-card.css',
})
export class ProfileCard {
  readonly profile = input.required<PublicProfile>();
  /** Nền phía sau thẻ — quyết định màu viền avatar và ảnh bìa. */
  readonly surface = input<'canvas' | 'surface'>('surface');
  /** Cao hơn ở cửa sổ giữa màn hình, thấp hơn ở thẻ nổi cạnh chat. */
  readonly bannerHeight = input<'sm' | 'lg'>('lg');

  protected readonly name = computed(() => profileDisplayName(this.profile()));

  protected readonly bannerColor = computed(() => {
    const person = this.profile();
    return bannerColorFor(person.username, person.accentColor);
  });

  /** "Tháng 8, 2026" — tự dựng vì ứng dụng chưa nạp locale tiếng Việt. */
  protected readonly joined = computed(() => {
    const date = new Date(this.profile().createdAt);
    return Number.isNaN(date.getTime())
      ? '—'
      : `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
  });

  protected iconFor(url: string): string {
    return linkIconFor(url);
  }

  protected shortUrl(url: string): string {
    return prettyUrl(url);
  }
}

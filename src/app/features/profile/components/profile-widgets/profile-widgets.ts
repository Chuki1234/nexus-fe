import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GAME_KIND_LABELS, type ProfileGame } from '../../../../../shared';
import { coverFallbackFor } from '../../game-catalog';

type WidgetTab = 'board' | 'activity' | 'wishlist';

/**
 * Cột widget của hồ sơ: bảng trò chơi đang chơi và trò chơi yêu thích.
 *
 * Bản CHỈ ĐỌC, tách riêng khỏi khối cùng tên trong tab Cài đặt → Hồ sơ. Hai chỗ
 * trông giống nhau nhưng trả lời hai câu khác nhau: trong Cài đặt là "tôi đang
 * sửa hồ sơ của mình" nên có nút thêm/xoá trên từng thẻ và từng nhãn; ở trang
 * `/u/:username` là "tôi đang xem hồ sơ người ta" — bày nút xoá ở đó thì hoặc
 * vô nghĩa, hoặc nguy hiểm.
 *
 * Dữ liệu vào qua input và mặc định RỖNG — component không tự gọi API, để nơi
 * nào đã có sẵn hồ sơ thì không phải hỏi lại lần nữa.
 */
@Component({
  selector: 'app-profile-widgets',
  imports: [MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-widgets.html',
  styleUrl: './profile-widgets.css',
})
export class ProfileWidgets {
  readonly rotatingGames = input<readonly ProfileGame[]>([]);
  readonly favoriteGame = input<ProfileGame | null>(null);
  readonly likedGames = input<readonly ProfileGame[]>([]);
  readonly wishlistGames = input<readonly ProfileGame[]>([]);
  /** Tên người đang xem, dùng cho câu trạng thái rỗng. */
  readonly ownerName = input<string>('Người này');

  protected readonly activeTab = signal<WidgetTab>('board');

  protected readonly tabs: ReadonlyArray<{ id: WidgetTab; label: string }> = [
    { id: 'board', label: 'Bảng' },
    { id: 'activity', label: 'Hoạt động' },
    { id: 'wishlist', label: 'Danh Sách' },
  ];

  protected readonly kindLabels = GAME_KIND_LABELS;

  /** Ảnh bìa là link ngoài; chưa đặt hoặc hỏng thì thay bằng ảnh sinh theo tên. */

  protected coverOf(game: ProfileGame): string {
    return game.cover ?? coverFallbackFor(game.title);
  }

  protected onImageError(event: Event, title: string): void {
    const img = event.target as HTMLImageElement;
    const fallback = coverFallbackFor(title);
    if (img.src !== fallback) {
      img.src = fallback;
    }
  }
}

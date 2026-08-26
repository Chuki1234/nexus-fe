import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  GAME_KIND_LABELS,
  gameLimitFor,
  type ProfileGame,
  type ProfileGameKind,
} from '../../../../../shared';
import { coverFallbackFor } from '../../game-catalog';
import { ProfileGamesService } from '../../profile-games.service';
import { ProfileStore } from '../../profile-store';
import { AddWidgetDialog } from '../add-widget-dialog/add-widget-dialog';

/**
 * Cột widget trò chơi — BẢN SỬA, dùng trong Cài đặt → Hồ sơ.
 *
 * Tách hẳn khỏi `ProfileWidgets` (bản chỉ đọc ở `/u/:username`) thay vì thêm
 * một input `editable`: hai bản trả lời hai câu khác nhau, và bản chỉ đọc có
 * test khoá cứng "không được có nút xoá". Nhét cả hai vào một component thì cái
 * test đó chặn luôn phần sửa.
 *
 * Gần như không giữ state riêng — mọi thứ nằm ở `ProfileGamesService`, vì ô
 * nhập tên trò chơi render ở CẤP `SettingsModal` (neo đáy khung) chứ không nằm
 * trong component này.
 */
@Component({
  selector: 'app-profile-widgets-editor',
  imports: [MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-widgets-editor.html',
  styleUrl: './profile-widgets-editor.css',
})
export class ProfileWidgetsEditor {
  protected readonly games = inject(ProfileGamesService);
  private readonly store = inject(ProfileStore);
  private readonly dialog = inject(MatDialog);

  protected readonly activeTab = signal<'board' | 'activity' | 'wishlist'>('board');
  protected readonly kindLabels = GAME_KIND_LABELS;
  protected readonly limitFor = gameLimitFor;

  constructor() {
    // Thiếu dòng này thì mở thẳng vào tab Hồ sơ (hoặc F5 trên URL đó) sẽ thấy
    // danh sách rỗng dù hồ sơ có dữ liệu — ProfileStore không tự nạp.
    void this.store.ensureLoaded();
  }

  protected openWidgetPicker(): void {
    this.dialog
      .open(AddWidgetDialog, {
        panelClass: 'nexus-dialog-panel',
        ariaLabel: 'Thêm widget hồ sơ',
        autoFocus: 'dialog',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((kind?: ProfileGameKind) => {
        // Đóng bằng nút X hoặc Escape thì `kind` là undefined — đừng mở ô nhập.
        if (kind) {
          this.games.startAdd(kind);
        }
      });
  }

  protected coverOf(game: ProfileGame): string {
    return game.cover ?? coverFallbackFor(game.title);
  }

  /** Ảnh bìa là link ngoài, chắc chắn có ngày chết — rơi về ảnh sinh theo tên. */
  protected onImageError(event: Event, title: string): void {
    const img = event.target as HTMLImageElement;
    const fallback = coverFallbackFor(title);
    if (img.src !== fallback) {
      img.src = fallback;
    }
  }
}

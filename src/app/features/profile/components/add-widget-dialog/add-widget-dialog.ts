import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { GAME_KIND_LABELS, type ProfileGameKind } from '../../../../../shared';
import { WIDGET_GROUPS, WIDGET_TYPES, type WidgetGroupId } from '../../game-catalog';
import { ProfileGamesService } from '../../profile-games.service';

/**
 * Hộp thoại "Thêm Widget Hồ Sơ" — bản Nexus của "Add Profile Widget" bên Discord.
 *
 * Hai cột: trái là nhóm (Sở thích / Thống kê trò chơi), phải là các loại widget
 * thuộc nhóm đang chọn. Bấm một loại thì đóng hộp thoại và trả `kind` về cho
 * nơi gọi, nơi đó tự mở ô nhập tên trò chơi.
 *
 * Không tự thêm trò chơi ở đây: hộp thoại chỉ trả lời "thêm vào widget nào",
 * còn "thêm game gì" là một bước riêng — gộp cả hai vào một hộp thoại thì phải
 * nhồi thêm ô nhập vào đúng chỗ đang bày danh mục.
 */
@Component({
  selector: 'app-add-widget-dialog',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-widget-dialog.html',
  styleUrl: './add-widget-dialog.css',
})
export class AddWidgetDialog {
  private readonly dialogRef = inject(MatDialogRef<AddWidgetDialog, ProfileGameKind>);
  private readonly games = inject(ProfileGamesService);

  protected readonly groups = WIDGET_GROUPS;
  protected readonly activeGroup = signal<WidgetGroupId>('interests');
  protected readonly kindLabels = GAME_KIND_LABELS;

  /** Các loại widget của nhóm đang chọn, kèm số chỗ còn trống. */
  protected readonly types = computed(() => {
    const group = this.activeGroup();
    const slots = this.games.slotsLeft();
    return WIDGET_TYPES.filter((type) => type.group === group).map((type) => ({
      ...type,
      slotsLeft: slots[type.kind],
      full: slots[type.kind] <= 0,
    }));
  });

  protected pick(kind: ProfileGameKind): void {
    this.dialogRef.close(kind);
  }

  protected close(): void {
    this.dialogRef.close();
  }
}

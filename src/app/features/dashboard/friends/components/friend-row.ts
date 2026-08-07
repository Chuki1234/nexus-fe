import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { PRESENCE_LABEL } from '../../../../../shared/dto/common';
import type { ConversationSummary } from '../../../../core/api/shell-data';
import { Avatar } from '../../../../shared/ui/avatar/avatar';

/**
 * Một hàng trong danh sách bạn bè.
 *
 * Cả hàng là một link tới cuộc trò chuyện — vùng bấm lớn hơn nhiều so với chỉ
 * đặt link ở tên, và không cần thêm nút riêng để mở chat.
 */
@Component({
  selector: 'app-friend-row',
  imports: [Avatar, MatIconModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './friend-row.html',
  styleUrl: './friend-row.css',
})
export class FriendRow {
  readonly person = input.required<ConversationSummary>();

  /** Ưu tiên câu trạng thái người dùng tự đặt; không có thì hiện trạng thái hệ thống. */
  protected readonly subtitle = computed(() => {
    const person = this.person();
    return person.statusMessage ?? PRESENCE_LABEL[person.presence];
  });
}

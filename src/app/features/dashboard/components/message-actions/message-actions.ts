import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { MessageComposerContext } from '../message-composer/message-composer';

const QUICK_REACTIONS = [
  { emoji: '👍', label: 'Thích' },
  { emoji: '❤️', label: 'Yêu thích' },
  { emoji: '😂', label: 'Buồn cười' },
  { emoji: '😮', label: 'Bất ngờ' },
  { emoji: '🌿', label: 'Nexus' },
] as const;

@Component({
  selector: 'app-message-actions',
  imports: [MatButtonModule, MatDividerModule, MatIconModule, MatMenuModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  templateUrl: './message-actions.html',
  styleUrl: './message-actions.css',
})
export class MessageActions {
  readonly messageId = input.required<string>();
  readonly author = input.required<string>();
  readonly excerpt = input.required<string>();
  readonly ownMessage = input<boolean>(false);
  readonly canEdit = input<boolean>(false);
  /** Tin đang được ghim hay chưa (quyết định nhãn Ghim / Bỏ ghim). */
  readonly pinned = input<boolean>(false);
  readonly action = output<MessageComposerContext>();
  readonly reaction = output<string>();

  protected readonly reactions = QUICK_REACTIONS;

  protected toggleReaction(emoji: string): void {
    this.reaction.emit(emoji);
  }

  protected requestReply(): void {
    this.action.emit({
      kind: 'reply',
      icon: 'reply',
      label: `Trả lời ${this.author()}`,
      description: this.excerpt(),
      replyToId: this.messageId(),
    });
  }

  protected requestEdit(): void {
    if (!this.ownMessage() || !this.canEdit()) {
      return;
    }
    this.action.emit({
      kind: 'edit',
      icon: 'edit_note',
      label: 'Chỉnh sửa tin nhắn',
      description: this.excerpt(),
      messageId: this.messageId(),
    });
  }

  protected requestForward(): void {
    this.action.emit({
      kind: 'forward',
      icon: 'forward_to_inbox',
      label: 'Chuyển tiếp tin nhắn',
      description: 'Danh sách nơi nhận sẽ xuất hiện sau khi dữ liệu hội thoại được kết nối.',
      messageId: this.messageId(),
    });
  }

  protected requestDelete(): void {
    const isOwn = this.ownMessage();
    this.action.emit({
      kind: 'delete',
      icon: isOwn ? 'delete_forever' : 'delete_outline',
      label: isOwn ? 'Thu hồi tin nhắn' : 'Xóa khỏi phía bạn',
      description: isOwn
        ? 'Cần backend xác nhận quyền và đồng bộ thao tác thu hồi tới mọi người.'
        : 'Cần backend lưu trạng thái ẩn riêng cho tài khoản của bạn.',
      messageId: this.messageId(),
    });
  }

  protected requestTogglePin(): void {
    const isPinned = this.pinned();
    this.action.emit({
      kind: isPinned ? 'unpin' : 'pin',
      icon: 'push_pin',
      label: isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn',
      description: isPinned
        ? 'Gỡ tin khỏi danh sách ghim của cuộc trò chuyện.'
        : 'Ghim tin để những người trong cuộc trò chuyện xem nhanh.',
      messageId: this.messageId(),
    });
  }

  protected requestCopy(): void {
    this.action.emit({
      kind: 'copy',
      icon: 'content_copy',
      label: 'Sao chép nội dung',
      description: 'Sao chép nội dung tin nhắn vào bộ nhớ tạm.',
      messageId: this.messageId(),
    });
  }
}

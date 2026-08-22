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
  readonly editable = input(false);
  readonly action = output<MessageComposerContext>();

  protected readonly reactions = QUICK_REACTIONS;
  protected readonly selectedReaction = signal<string | null>(null);

  protected toggleReaction(emoji: string): void {
    this.selectedReaction.update((current) => (current === emoji ? null : emoji));
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
    if (!this.editable()) {
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
    const ownMessage = this.editable();
    this.action.emit({
      kind: 'delete',
      icon: ownMessage ? 'delete_forever' : 'delete_outline',
      label: ownMessage ? 'Thu hồi tin nhắn' : 'Xóa khỏi phía bạn',
      description: ownMessage
        ? 'Cần backend xác nhận quyền và đồng bộ thao tác thu hồi tới mọi người.'
        : 'Cần backend lưu trạng thái ẩn riêng cho tài khoản của bạn.',
      messageId: this.messageId(),
    });
  }
}

import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import type { PresenceStatus } from '../../../../../shared/dto/common';

/**
 * Thanh trên cùng của khu nội dung.
 *
 * Nút gọi thoại / gọi video chỉ hiện trong tin nhắn riêng. Ô tìm kiếm và nút
 * ghim chỉ hiện ở kênh máy chủ (bật qua `showSearch` / `showPins`).
 */
@Component({
  selector: 'app-chat-toolbar',
  imports: [Avatar, MatButtonModule, MatIconModule, MatToolbarModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './chat-toolbar.css',
  templateUrl: './chat-toolbar.html',
})
export class ChatToolbar {
  readonly title = input.required<string>();
  /** Cho phép bấm vào tiêu đề (tên người) để mở hồ sơ — chỉ bật ở DM. */
  readonly titleClickable = input<boolean>(false);
  readonly subtitle = input<string | null>(null);
  readonly leadingIcon = input<string>('tag');
  readonly showAvatar = input<boolean>(false);
  readonly avatarSrc = input<string | null>(null);
  readonly avatarUserId = input<string | null>(null);
  readonly avatarPresence = input<PresenceStatus | null>(null);
  readonly showCallActions = input<boolean>(false);
  readonly showDetailsAction = input<boolean>(true);
  readonly detailsOpen = input<boolean>(false);
  readonly detailsLabel = input<string>('hồ sơ');
  readonly showSearch = input<boolean>(false);
  readonly showPins = input<boolean>(false);
  readonly pinsOpen = input<boolean>(false);

  readonly titleClick = output<void>();
  readonly toggleDetails = output<void>();
  readonly startAudioCall = output<void>();
  readonly startVideoCall = output<void>();
  /** Phát chuỗi tìm kiếm khi nhấn Enter (rỗng = đóng kết quả). */
  readonly search = output<string>();
  readonly openPins = output<void>();

  protected readonly searchTerm = signal('');

  protected submitSearch(): void {
    this.search.emit(this.searchTerm().trim());
  }

  protected clearSearch(): void {
    this.searchTerm.set('');
    this.search.emit('');
  }
}

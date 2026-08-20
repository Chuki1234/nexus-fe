import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Thanh trên cùng của khu nội dung.
 *
 * Nút gọi thoại / gọi video chỉ hiện trong tin nhắn riêng. Chúng đang bị vô hiệu
 * hoá — phần gọi thật thuộc phase C4 (xem DASHBOARD_PLAN.md).
 */
@Component({
  selector: 'app-chat-toolbar',
  imports: [MatButtonModule, MatIconModule, MatToolbarModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './chat-toolbar.css',
  templateUrl: './chat-toolbar.html',
})
export class ChatToolbar {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly leadingIcon = input<string>('tag');
  readonly showCallActions = input<boolean>(false);
  readonly showDetailsAction = input<boolean>(true);
  readonly detailsOpen = input<boolean>(false);
  readonly detailsLabel = input<string>('hồ sơ');

  readonly toggleDetails = output<void>();
}

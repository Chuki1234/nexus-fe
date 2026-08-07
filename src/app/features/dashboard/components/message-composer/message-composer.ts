import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Ô soạn tin ở đáy khu nội dung.
 *
 * P1 chỉ dựng hình: ô nhập bị vô hiệu hoá và chưa gắn form. Việc gửi thật (kèm
 * `client_nonce` và optimistic UI) thuộc phase P4.
 */
@Component({
  selector: 'app-message-composer',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block shrink-0 px-4 pb-6' },
  templateUrl: './message-composer.html',
  styleUrl: './message-composer.css',
})
export class MessageComposer {
  /** Tên kênh hoặc người nhận, hiện trong placeholder. */
  readonly target = input.required<string>();
}

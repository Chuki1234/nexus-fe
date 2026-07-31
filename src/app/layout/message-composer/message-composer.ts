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
  template: `
    <div
      class="flex items-center gap-2 rounded-md border border-hairline-strong bg-canvas-soft px-3 py-1"
    >
      <button mat-icon-button type="button" disabled matTooltip="Đính kèm (chưa làm)">
        <mat-icon>add_circle</mat-icon>
        <span class="sr-only">Đính kèm tệp</span>
      </button>

      <input
        type="text"
        disabled
        [attr.aria-label]="'Nhắn ' + target()"
        [placeholder]="'Nhắn ' + target()"
        class="min-w-0 flex-1 bg-transparent py-2 text-body-sm text-ink placeholder:text-mute focus:outline-none disabled:cursor-not-allowed"
      />

      <button mat-icon-button type="button" disabled matTooltip="Sticker (chưa làm)">
        <mat-icon>emoji_emotions</mat-icon>
        <span class="sr-only">Chọn sticker</span>
      </button>
    </div>
  `,
})
export class MessageComposer {
  /** Tên kênh hoặc người nhận, hiện trong placeholder. */
  readonly target = input.required<string>();
}

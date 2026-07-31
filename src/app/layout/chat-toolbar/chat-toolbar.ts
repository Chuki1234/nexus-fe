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
  styles: `
    :host {
      --mat-toolbar-container-background-color: var(--color-canvas);
      --mat-toolbar-container-text-color: var(--color-ink);
      --mat-toolbar-standard-height: 48px;
    }
  `,
  template: `
    <mat-toolbar class="!border-b !border-hairline !px-4">
      <mat-icon aria-hidden="true" class="!mr-2 text-mute">{{ leadingIcon() }}</mat-icon>

      <h1 class="truncate text-body-md-strong text-ink-strong">{{ title() }}</h1>

      @if (subtitle(); as text) {
        <span aria-hidden="true" class="mx-3 h-5 w-px shrink-0 bg-hairline"></span>
        <p class="truncate text-body-sm text-mute">{{ text }}</p>
      }

      <span class="flex-1"></span>

      @if (showCallActions()) {
        <button mat-icon-button type="button" disabled matTooltip="Gọi thoại (chưa làm)">
          <mat-icon>call</mat-icon>
          <span class="sr-only">Bắt đầu cuộc gọi thoại</span>
        </button>
        <button mat-icon-button type="button" disabled matTooltip="Gọi video (chưa làm)">
          <mat-icon>videocam</mat-icon>
          <span class="sr-only">Bắt đầu cuộc gọi video</span>
        </button>
      }

      <button
        mat-icon-button
        type="button"
        [attr.aria-pressed]="detailsOpen()"
        [matTooltip]="detailsOpen() ? 'Ẩn hồ sơ' : 'Hiện hồ sơ'"
        (click)="toggleDetails.emit()"
      >
        <mat-icon>{{ detailsOpen() ? 'right_panel_close' : 'right_panel_open' }}</mat-icon>
        <span class="sr-only">{{ detailsOpen() ? 'Ẩn hồ sơ' : 'Hiện hồ sơ' }}</span>
      </button>
    </mat-toolbar>
  `,
})
export class ChatToolbar {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly leadingIcon = input<string>('tag');
  readonly showCallActions = input<boolean>(false);
  readonly detailsOpen = input<boolean>(true);

  readonly toggleDetails = output<void>();
}

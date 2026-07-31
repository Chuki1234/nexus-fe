import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UnreadBadge } from '../../ui/unread-badge/unread-badge';
import { ShellData } from '../shell-data';

/**
 * Cột 1 — dải icon server dọc mép trái.
 *
 * Chỉ báo "đang mở" là thanh xanh dán vào mép trái, đúng `ex-app-shell-row` trong
 * design system (`activeIndicator: {colors.primary}`). Cùng với chấm presence,
 * đây là chỗ duy nhất ngoài CTA được dùng màu xanh — chỉ báo trạng thái.
 *
 * Trạng thái active đọc từ `routerLinkActive` chứ không tự tách URL: rail nằm
 * ngoài router-outlet nên không có route params, mà tự parse chuỗi thì sẽ lệch
 * ngay khi cấu trúc route đổi.
 */
@Component({
  selector: 'app-server-rail',
  imports: [MatIconModule, MatTooltipModule, RouterLink, RouterLinkActive, UnreadBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full w-18 shrink-0 flex-col items-center gap-2 bg-canvas py-3' },
  template: `
    <!-- Tin nhắn trực tiếp: luôn trên cùng, tách khỏi danh sách server -->
    <a
      routerLink="/channels/@me"
      routerLinkActive
      #dmLink="routerLinkActive"
      matTooltip="Tin nhắn trực tiếp"
      matTooltipPosition="right"
      [attr.aria-current]="dmLink.isActive ? 'page' : null"
      class="relative flex size-12 items-center justify-center rounded-md transition-colors"
      [class.bg-primary]="dmLink.isActive"
      [class.text-on-primary]="dmLink.isActive"
      [class.bg-canvas-soft]="!dmLink.isActive"
      [class.text-ink]="!dmLink.isActive"
    >
      <mat-icon aria-hidden="true">forum</mat-icon>
      <span class="sr-only">Tin nhắn trực tiếp</span>
      @if (dmLink.isActive) {
        <span aria-hidden="true" class="absolute -left-3 h-10 w-1 rounded-pill bg-primary"></span>
      }
    </a>

    <hr class="my-1 w-8 border-t border-hairline" aria-hidden="true" />

    <ul class="flex flex-col items-center gap-2" aria-label="Máy chủ của bạn">
      @for (server of servers(); track server.id) {
        <li class="relative">
          <a
            [routerLink]="linkFor(server.id)"
            routerLinkActive
            #serverLink="routerLinkActive"
            [matTooltip]="server.name"
            matTooltipPosition="right"
            [attr.aria-current]="serverLink.isActive ? 'page' : null"
            class="flex size-12 items-center justify-center rounded-md bg-canvas-soft text-body-md-strong text-ink transition-colors hover:bg-primary hover:text-on-primary"
            [class.ring-2]="serverLink.isActive"
            [class.ring-primary]="serverLink.isActive"
          >
            {{ initialsOf(server.name) }}
          </a>

          @if (serverLink.isActive) {
            <span
              aria-hidden="true"
              class="absolute top-1 -left-3 h-10 w-1 rounded-pill bg-primary"
            ></span>
          } @else if (server.unread) {
            <span
              aria-hidden="true"
              class="absolute top-5 -left-3 size-2 rounded-full bg-ink"
            ></span>
          }

          <app-unread-badge
            class="absolute -right-1 -bottom-1"
            [count]="server.mentionCount"
            label="lượt nhắc tên chưa đọc"
          />
        </li>
      }
    </ul>

    <!-- P2 sẽ mở hộp thoại tạo/tham gia server; hiện chỉ là chỗ giữ vị trí. -->
    <button
      type="button"
      disabled
      matTooltip="Thêm máy chủ (chưa làm)"
      matTooltipPosition="right"
      class="flex size-12 items-center justify-center rounded-md bg-canvas-soft text-primary transition-colors disabled:cursor-not-allowed disabled:text-mute"
    >
      <mat-icon aria-hidden="true">add</mat-icon>
      <span class="sr-only">Thêm máy chủ</span>
    </button>
  `,
})
export class ServerRail {
  private readonly shell = inject(ShellData);

  protected readonly servers = this.shell.servers;

  /** Chữ cái đầu làm icon server khi chưa có ảnh. */
  protected initialsOf(name: string): string {
    const trimmed = name.trim();
    return trimmed ? trimmed[0].toUpperCase() : '?';
  }

  /**
   * Mở thẳng kênh đầu tiên thay vì dừng ở trang server rỗng — bấm vào server mà
   * phải bấm thêm một lần nữa mới đọc được gì là thừa một bước.
   */
  protected linkFor(serverId: string): unknown[] {
    const first = this.shell.channelsOf(serverId)[0];
    return first ? ['/channels', serverId, first.id] : ['/channels', serverId];
  }
}
